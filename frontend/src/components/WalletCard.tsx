'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  CreditCard, 
  ShieldCheck, 
  Copy, 
  CheckCheck 
} from 'lucide-react';

interface WalletCardProps {
  walletNumber: string;
  currency: string;
  balance: number;
  lockedBalance: number;
  userName: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'NOT_SUBMITTED' | 'REJECTED';
  onTransferClick: () => void;
  onDepositClick: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  walletNumber,
  currency,
  balance,
  lockedBalance,
  userName,
  kycStatus,
  onTransferClick,
  onDepositClick,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-slate-800/80 relative overflow-hidden">
      {/* Dynamic Background Glow Effect */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Asosiy Hamyon</p>
            <div className="flex items-center space-x-1.5 cursor-pointer group" onClick={copyToClipboard}>
              <span className="text-sm font-mono text-slate-200 group-hover:text-white transition-colors">
                {walletNumber}
              </span>
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              )}
            </div>
          </div>
        </div>

        {/* KYC Badge */}
        <div>
          {kycStatus === 'VERIFIED' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Tasdiqlangan
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              KYC Kutilmoqda
            </span>
          )}
        </div>
      </div>

      {/* Balance Section */}
      <div className="my-8 relative z-10">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 tracking-wide font-medium">MAVJUD BALANS</span>
          <button 
            type="button"
            onClick={() => setShowBalance(!showBalance)} 
            className="text-slate-400 hover:text-white transition"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-1 flex items-baseline space-x-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {showBalance ? (
              <>
                <span className="text-slate-400 text-2xl sm:text-3xl mr-1">{currency}</span>
                {formatMoney(balance)}
              </>
            ) : (
              '••••••••••'
            )}
          </h2>
        </div>

        {lockedBalance > 0 && (
          <p className="text-xs text-amber-400/80 mt-1">
            Bloklangan mablag': {currency} {formatMoney(lockedBalance)}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2 font-medium">Egasining ismi: {userName}</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <button
          onClick={onTransferClick}
          className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Pul O'tkazish</span>
        </button>

        <button
          onClick={onDepositClick}
          className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 font-semibold text-sm transition-all duration-200 border border-slate-700 text-slate-200 active:scale-[0.98]"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Hisobni To'ldirish</span>
        </button>
      </div>
    </div>
  );
};
