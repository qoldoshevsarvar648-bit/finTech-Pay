import { 
  Injectable, 
  BadRequestException, 
  ConflictException, 
  NotFoundException, 
  InternalServerErrorException, 
  Logger 
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import BigNumber from 'bignumber.js';

export interface CreateP2PTransferDto {
  senderUserId: string;
  recipientIdentifier: string; // Email, phone number or wallet_number
  amount: string; // BigNumber string, e.g. "150.50"
  currency: string;
  description?: string;
  twoFactorToken?: string;
  idempotencyKey: string;
  ipAddress: string;
  userAgent: string;
}

export interface TransferResult {
  transactionId: string;
  referenceNumber: string;
  amount: string;
  fee: string;
  senderWalletBalance: string;
  recipientName: string;
  timestamp: Date;
}

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);
  private readonly SYSTEM_FEE_RATE = 0.005; // 0.5% komissiya stavkasi

  constructor(
    private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * P2P Pul O'tkazmasi - ACID Kafolati, Pessimistik Blokirovka (SELECT FOR UPDATE)
   * va Deadlock prevention (Tartiblangan ID blokirovkalash)
   */
  async executeP2PTransfer(dto: CreateP2PTransferDto): Promise<TransferResult> {
    const transferAmount = new BigNumber(dto.amount);
    if (transferAmount.isNaN() || transferAmount.isLessThanOrEqualTo(0)) {
      throw new BadRequestException("O'tkazma summasi 0 dan katta bo'lishi shart.");
    }

    // 1. IDEMPOTENCY KEY VALIDATION (Redis yordamida takroriy so'rovlarni to'sish)
    const idempotencyRedisKey = `idempotency:transfer:${dto.idempotencyKey}`;
    const acquired = await this.redis.set(
      idempotencyRedisKey, 
      'PROCESSING', 
      'EX', 
      120, 
      'NX'
    );
    if (!acquired) {
      throw new ConflictException("Ushbu operatsiya allaqachon qayta ishlanmoqda yoki yuborilgan (Duplicate request).");
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // Eng yuqori ACID izolyatsiya darajasi
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // 2. YUBORUVCHI HAMYONINI VA FOYDALANUVCHINI ANIQLASH
      const senderWallet = await queryRunner.query(
        `SELECT w.*, u.is_active as user_active, u.first_name, u.last_name 
         FROM wallets w 
         INNER JOIN users u ON u.id = w.user_id 
         WHERE w.user_id = $1 AND w.currency = $2`,
        [dto.senderUserId, dto.currency]
      );

      if (!senderWallet || senderWallet.length === 0) {
        throw new NotFoundException("Yuboruvchi hamyoni topilmadi.");
      }
      const sWallet = senderWallet[0];

      if (!sWallet.user_active || sWallet.status !== 'ACTIVE') {
        throw new BadRequestException("Yuboruvchi hisobi faol emas yoki muzlatilgan.");
      }

      // 3. QABUL QILUVCHI HAMYONINI ANIQLASH (Email, Telefon yoki Hamyon raqami bo'yicha)
      const recipientResult = await queryRunner.query(
        `SELECT w.*, u.id as recipient_user_id, u.first_name, u.last_name, u.is_active as user_active
         FROM wallets w
         INNER JOIN users u ON u.id = w.user_id
         WHERE (u.email = $1 OR u.phone_number = $1 OR w.wallet_number = $1)
           AND w.currency = $2`,
        [dto.recipientIdentifier, dto.currency]
      );

      if (!recipientResult || recipientResult.length === 0) {
        throw new NotFoundException("Qabul qiluvchi foydalanuvchi yoki hamyon topilmadi.");
      }
      const rWallet = recipientResult[0];

      if (sWallet.id === rWallet.id) {
        throw new BadRequestException("O'z hamyoningizga P2P o'tkazma qila olmaysiz.");
      }

      if (!rWallet.user_active || rWallet.status !== 'ACTIVE') {
        throw new BadRequestException("Qabul qiluvchi hisobi nofaol holatda.");
      }

      // 4. DEADLOCK OLDINI OLISH UCHUN HAMYONLARNI TARTIB BILAN BLOKIROVKA QILISH (Deterministic Order Locking)
      // Agar A -> B ga, bir vaqtda B -> A ga pul o'tkazsa, o'zaro bloklanish (Deadlock) yuzaga keladi.
      // Buning yagona to'g'ri yechimi: UUID bo'yicha kichigini birinchi, kattasini keyin qulflash.
      const firstLockId = sWallet.id < rWallet.id ? sWallet.id : rWallet.id;
      const secondLockId = sWallet.id < rWallet.id ? rWallet.id : sWallet.id;

      // PESSIMISTIC LOCK: "FOR UPDATE"
      await queryRunner.query(
        `SELECT id, balance FROM wallets WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
        [firstLockId, secondLockId]
      );

      // Eng so'nggi bloklangan holatdagi balanslarni olish
      const freshSenderWallet = (await queryRunner.query(
        `SELECT id, balance, status FROM wallets WHERE id = $1`, [sWallet.id]
      ))[0];

      const freshReceiverWallet = (await queryRunner.query(
        `SELECT id, balance, status FROM wallets WHERE id = $1`, [rWallet.id]
      ))[0];

      // 5. KOMISSIYA VA BALANS TEKSHIRUVI
      const fee = transferAmount.multipliedBy(this.SYSTEM_FEE_RATE).decimalPlaces(4);
      const totalDeduction = transferAmount.plus(fee);
      const currentSenderBalance = new BigNumber(freshSenderWallet.balance);

      if (currentSenderBalance.isLessThan(totalDeduction)) {
        throw new BadRequestException("Hamyonda yetarli mablag' mavjud emas.");
      }

      const newSenderBalance = currentSenderBalance.minus(totalDeduction).toFixed(4);
      const newReceiverBalance = new BigNumber(freshReceiverWallet.balance)
        .plus(transferAmount)
        .toFixed(4);

      // 6. BALANSLARNI YANGILASH (ATOMIC UPDATE)
      await queryRunner.query(
        `UPDATE wallets SET balance = $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
        [newSenderBalance, sWallet.id]
      );

      await queryRunner.query(
        `UPDATE wallets SET balance = $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
        [newReceiverBalance, rWallet.id]
      );

      // 7. TRANZAKSIYA YOZUVINI YARATISH (Transactions Table)
      const referenceNumber = `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const insertTxResult = await queryRunner.query(
        `INSERT INTO transactions (
          reference_number, idempotency_key, sender_wallet_id, receiver_wallet_id, 
          amount, fee, currency, type, status, description, metadata, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'P2P_TRANSFER', 'SUCCESS', $8, $9, NOW())
        RETURNING id, created_at`,
        [
          referenceNumber,
          dto.idempotencyKey,
          sWallet.id,
          rWallet.id,
          transferAmount.toFixed(4),
          fee.toFixed(4),
          dto.currency,
          dto.description || 'P2P Transfer',
          JSON.stringify({
            senderName: `${sWallet.first_name} ${sWallet.last_name}`,
            recipientName: `${rWallet.first_name} ${rWallet.last_name}`,
            recipientIdentifier: dto.recipientIdentifier,
            ipAddress: dto.ipAddress
          })
        ]
      );
      const transactionId = insertTxResult[0].id;

      // 8. DOUBLE-ENTRY LEDGER ENTRIES (Ikki tomonlama hisob yozuvi)
      // Yuboruvchi: DEBIT
      await queryRunner.query(
        `INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount, balance_after)
         VALUES ($1, $2, 'DEBIT', $3, $4)`,
        [transactionId, sWallet.id, totalDeduction.toFixed(4), newSenderBalance]
      );

      // Qabul qiluvchi: CREDIT
      await queryRunner.query(
        `INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount, balance_after)
         VALUES ($1, $2, 'CREDIT', $3, $4)`,
        [transactionId, rWallet.id, transferAmount.toFixed(4), newReceiverBalance]
      );

      // 9. AUDIT LOG (Kiberxavfsizlik va Compliance)
      await queryRunner.query(
        `INSERT INTO security_audit_logs (user_id, action, ip_address, user_agent, payload)
         VALUES ($1, 'P2P_TRANSFER_SUCCESS', $2, $3, $4)`,
        [
          dto.senderUserId,
          dto.ipAddress,
          dto.userAgent,
          JSON.stringify({ transactionId, referenceNumber, amount: dto.amount, fee: fee.toString() })
        ]
      );

      // 10. TRANZAKSIYANI MUVAFFAQIYATLI YAKUNLASH (COMMIT)
      await queryRunner.commitTransaction();

      // Redis keshidagi holatni 24 soatga saqlash
      await this.redis.set(idempotencyRedisKey, 'COMPLETED', 'EX', 86400);

      this.logger.log(`Transfer ${referenceNumber} muvaffaqiyatli amalga oshirildi.`);

      return {
        transactionId,
        referenceNumber,
        amount: transferAmount.toFixed(4),
        fee: fee.toFixed(4),
        senderWalletBalance: newSenderBalance,
        recipientName: `${rWallet.first_name} ${rWallet.last_name}`,
        timestamp: insertTxResult[0].created_at
      };

    } catch (error) {
      // Har qanday xatolikda tranzaksiyani bekor qilish (ROLLBACK)
      await queryRunner.rollbackTransaction();
      await this.redis.del(idempotencyRedisKey); // Qayta urinish imkoniyatini ochish
      this.logger.error(`Transfer xatosi: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException("Tranzaksiyani qayta ishlashda tizim xatoligi yuz berdi.");
    } finally {
      // Ulanishni havzaga (connection pool) qaytarish
      await queryRunner.release();
    }
  }
}
