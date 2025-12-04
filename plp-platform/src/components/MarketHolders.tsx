'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionHolder {
  wallet: string;
  totalAmount: number;
  tradeCount: number;
  percentage: number;
}

interface MarketHoldersProps {
  yesHolders: PositionHolder[];
  noHolders: PositionHolder[];
  totalYesStake: number;
  totalNoStake: number;
  uniqueHolders: number;
  yesPercentage?: number; // Pre-calculated from backend
  noPercentage?: number; // Pre-calculated from backend
  currentUserWallet?: string;
  className?: string;
}

export default function MarketHolders({
  yesHolders,
  noHolders,
  totalYesStake,
  totalNoStake,
  uniqueHolders,
  yesPercentage,
  noPercentage,
  currentUserWallet,
  className,
}: MarketHoldersProps) {
  // Truncate wallet address
  const truncateWallet = (wallet: string) => {
    if (wallet.length < 12) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  // Check if wallet is current user
  const isCurrentUser = (wallet: string) => {
    return currentUserWallet && wallet === currentUserWallet;
  };

  // Use backend-calculated percentages if available, otherwise calculate
  const totalStake = totalYesStake + totalNoStake;
  const yesPoolPercentage = yesPercentage !== undefined
    ? yesPercentage
    : (totalStake > 0 ? (totalYesStake / totalStake) * 100 : 50);
  const noPoolPercentage = noPercentage !== undefined
    ? noPercentage
    : (100 - yesPoolPercentage);

  return (
    <Card className={`bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border-gray-700/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Market Holders
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              {uniqueHolders} unique {uniqueHolders === 1 ? 'holder' : 'holders'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Total Staked</div>
            <div className="text-lg font-bold text-white">
              {totalStake.toFixed(2)} SOL
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* YES Holders Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-green-400">
                YES HOLDERS ({yesPoolPercentage.toFixed(0)}%)
              </h3>
            </div>
            <div className="text-xs text-gray-400">
              {totalYesStake.toFixed(2)} SOL
            </div>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
            {yesHolders.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No YES positions yet
              </div>
            ) : (
              yesHolders.map((holder, index) => (
                <Link
                  key={holder.wallet}
                  href={`/profile/${holder.wallet}`}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer no-underline outline-none focus:outline-none ${
                    isCurrentUser(holder.wallet)
                      ? 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/30'
                      : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-xs font-mono text-gray-400 w-6">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white hover:text-green-400 transition-colors">
                          {truncateWallet(holder.wallet)}
                        </span>
                        {isCurrentUser(holder.wallet) && (
                          <span className="text-xs bg-green-500/30 text-green-400 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {holder.tradeCount} {holder.tradeCount === 1 ? 'trade' : 'trades'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">
                      {holder.totalAmount.toFixed(3)} SOL
                    </div>
                    <div className="text-xs text-gray-400">
                      {holder.percentage.toFixed(1)}% of YES
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* NO Holders Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">
                NO HOLDERS ({noPoolPercentage.toFixed(0)}%)
              </h3>
            </div>
            <div className="text-xs text-gray-400">
              {totalNoStake.toFixed(2)} SOL
            </div>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
            {noHolders.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No NO positions yet
              </div>
            ) : (
              noHolders.map((holder, index) => (
                <Link
                  key={holder.wallet}
                  href={`/profile/${holder.wallet}`}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer no-underline outline-none focus:outline-none ${
                    isCurrentUser(holder.wallet)
                      ? 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30'
                      : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-xs font-mono text-gray-400 w-6">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white hover:text-red-400 transition-colors">
                          {truncateWallet(holder.wallet)}
                        </span>
                        {isCurrentUser(holder.wallet) && (
                          <span className="text-xs bg-red-500/30 text-red-400 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {holder.tradeCount} {holder.tradeCount === 1 ? 'trade' : 'trades'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">
                      {holder.totalAmount.toFixed(3)} SOL
                    </div>
                    <div className="text-xs text-gray-400">
                      {holder.percentage.toFixed(1)}% of NO
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
