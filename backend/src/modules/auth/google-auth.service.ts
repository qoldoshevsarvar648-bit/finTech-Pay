import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { DataSource } from 'typeorm';

export interface GoogleAuthPayload {
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly oauthClient: OAuth2Client;

  constructor(private readonly dataSource: DataSource) {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || '707890857969-jta34ed104lbhc7110a6q3gc2u60jdg1.apps.googleusercontent.com'
    );
  }

  /**
   * Google tomonidan berilgan JWT ID Tokenni Google serverlarida kriptografik tekshirish
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleAuthPayload> {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID || '707890857969-jta34ed104lbhc7110a6q3gc2u60jdg1.apps.googleusercontent.com',
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException("Google token yaroqsiz.");
      }

      if (!payload.email_verified) {
        throw new UnauthorizedException("Google hisobidagi email tasdiqlanmagan!");
      }

      return {
        email: payload.email.toLowerCase(),
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'Google',
        lastName: payload.family_name || payload.name?.split(' ')[1] || 'User',
        picture: payload.picture,
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      this.logger.error(`Google token tasdiqlashda xato: ${error.message}`);
      throw new UnauthorizedException("Google tokenini tekshirib bo'lmadi.");
    }
  }

  /**
   * Google hisobi orqali tizimga kirish yoki avtomatik yangi hamyon bilan ro'yxatdan o'tkazish
   */
  async authenticateGoogleUser(idToken: string) {
    const googleData = await this.verifyGoogleToken(idToken);

    // Foydalanuvchini bazadan qidirish
    const existingUsers = await this.dataSource.query(
      `SELECT u.*, w.id as wallet_id, w.wallet_number, w.balance, w.currency
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.email = $1`,
      [googleData.email]
    );

    if (existingUsers && existingUsers.length > 0) {
      const user = existingUsers[0];
      return {
        isNewUser: false,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          walletNumber: user.wallet_number,
          balance: user.balance,
        }
      };
    }

    // Agar yangi foydalanuvchi bo'lsa: Atomik tarzda User + Wallet yaratish
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Yangi User yozuvi
      const insertUser = await queryRunner.query(
        `INSERT INTO users (email, phone_number, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, 'GOOGLE_OAUTH_VERIFIED', $3, $4, true)
         RETURNING id, email, first_name, last_name`,
        [
          googleData.email,
          '+99890' + Math.floor(1000000 + Math.random() * 9000000),
          googleData.firstName,
          googleData.lastName
        ]
      );
      const userId = insertUser[0].id;

      // 2. Yangi Virtual Hamyon (Bonus: $1000)
      const walletNumber = `WAL-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-USD`;
      const insertWallet = await queryRunner.query(
        `INSERT INTO wallets (user_id, wallet_number, currency, balance, status)
         VALUES ($1, $2, 'USD', 1000.0000, 'ACTIVE')
         RETURNING id, wallet_number, balance`,
        [userId, walletNumber]
      );

      await queryRunner.commitTransaction();

      return {
        isNewUser: true,
        user: {
          id: userId,
          email: googleData.email,
          firstName: googleData.firstName,
          lastName: googleData.lastName,
          walletNumber: insertWallet[0].wallet_number,
          balance: insertWallet[0].balance,
        }
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
