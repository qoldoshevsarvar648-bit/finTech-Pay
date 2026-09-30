'use client';

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Lock
} from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderCurrency: string;
  senderBalance: number;
  onSuccess: (receipt: any) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  senderCurrency,
  senderBalance,
  onSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const systemFee = numAmount * 0.005; // 0.5%
  const totalDeduction = numAmount + systemFee;
  const hasSufficientFunds = senderBalance >= totalDeduction;

  const generateIdempotencyKey = () => {
    return 'idemp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage("Iltimos, to'g'ri o'tkazma summasini kiriting.");
      return;
    }

    if (!hasSufficientFunds) {
      setErrorMessage("Hisobingizda yetarli mablag' mavjud emas.");
      return;
    }

    // Katta summalar uchun 2FA talab qilish
    if (numAmount > 50 && !requires2FA) {
      setRequires2FA(true);
      return;
    }

    if (requires2FA && twoFactorCode.length !== 6) {
      setErrorMessage("6 xonali 2FA kodini to'liq kiriting.");
      return;
    }

    setLoading(true);

    try {
      // Backend API ga yuborish
      const response = await fetch('/api/v1/transfers/p2p', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': generateIdempotencyKey(),
        },
        body: JSON.stringify({
          recipientIdentifier: recipient.trim(),
          amount: numAmount.toFixed(4),
          currency: senderCurrency,
          description: description.trim(),
          twoFactorToken: requires2FA ? twoFactorCode : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "O'tkazma amalga oshmadi.");
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Kutilmagan xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold">P2P Pul O'tkazmasi</h3>
            <p className="text-xs text-slate-400">Tezkor va xavfsiz ichki transfer</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Qabul qiluvchi (Email, Telefon yoki Hamyon raqami)
            </label>
            <input
              type="text"
              required
              disabled={loading || requires2FA}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="user@example.com yoki +998901234567"
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Summa ({senderCurrency})
              </label>
              <span className="text-xs text-slate-400">
                Mavjud: {senderCurrency} {senderBalance.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={loading || requires2FA}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setAmount((senderBalance * 0.995).toFixed(2))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg"
              >
                Maksimum
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Izoh (Ixtiyoriy)
            </label>
            <input
              type="text"
              disabled={loading || requires2FA}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masalan: Tushlik xarajatlari uchun"
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Dynamic Fee & Total Calculation */}
          {numAmount > 0 && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Xizmat haqi (0.5%):</span>
                <span>{senderCurrency} {systemFee.toFixed(4)}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-slate-700/50 pt-1.5">
                <span>Jami yechiladi:</span>
                <span className={hasSufficientFunds ? 'text-white' : 'text-rose-400'}>
                  {senderCurrency} {totalDeduction.toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* 2FA Verification Step if needed */}
          {requires2FA && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold">
                <Lock className="w-4 h-4" />
                <span>2FA Tasdiqlash Kodingizni Kiriting (Google Authenticator)</span>
              </div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-2 bg-slate-900 border border-indigo-500/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !hasSufficientFunds || numAmount <= 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Xavfsiz Tranzaksiya Bajarilmoqda...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{requires2FA ? "Tasdiqlash va Yuborish" : "O'tkazish"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
