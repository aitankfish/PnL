/**
 * API endpoint for fetching user's active positions
 *
 * Returns all markets where the user has an active position
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabase } from '@/lib/database/index';
import { COLLECTIONS, TradeHistory, PredictionMarket } from '@/lib/database/models';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

interface UserPosition {
  marketId: string;
  marketName: string;
  marketAddress: string;
  voteType: 'yes' | 'no';
  totalAmount: number; // Total SOL staked
  totalShares: number; // Total shares held
  tradeCount: number; // Number of trades
  averagePrice: number; // Average price paid
  currentYesPrice: number;
  currentNoPrice: number;
  marketState: number;
  winningOption?: boolean;
  canClaim: boolean;
  expiryTime: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    logger.info('Fetching user positions', { wallet });

    // Connect to database
    await connectToDatabase();
    const db = await getDatabase();

    // Fetch all trades for this wallet
    const trades = await db
      .collection<TradeHistory>(COLLECTIONS.TRADE_HISTORY)
      .find({ traderWallet: wallet })
      .toArray();

    // Group trades by market and vote type
    const positionMap = new Map<
      string,
      {
        marketId: string;
        voteType: 'yes' | 'no';
        amount: number;
        shares: number;
        count: number;
      }
    >();

    trades.forEach((trade) => {
      const key = `${trade.marketId.toString()}-${trade.voteType}`;
      const existing = positionMap.get(key) || {
        marketId: trade.marketId.toString(),
        voteType: trade.voteType,
        amount: 0,
        shares: 0,
        count: 0,
      };

      positionMap.set(key, {
        ...existing,
        amount: existing.amount + trade.amount,
        shares: existing.shares + trade.shares,
        count: existing.count + 1,
      });
    });

    // Fetch market details for all positions
    const marketIds = [...new Set(Array.from(positionMap.values()).map((p) => p.marketId))];
    const markets = await db
      .collection<PredictionMarket>(COLLECTIONS.PREDICTION_MARKETS)
      .find({
        _id: { $in: marketIds.map((id) => new (require('mongodb').ObjectId)(id)) },
      })
      .toArray();

    // Create market map for quick lookup
    const marketMap = new Map(markets.map((m) => [m._id!.toString(), m]));

    // Build position list with market details
    const positions: UserPosition[] = Array.from(positionMap.values())
      .map((position) => {
        const market = marketMap.get(position.marketId);
        if (!market) return null;

        // Calculate current probability
        const totalYes = market.totalYesStake / 1_000_000_000;
        const totalNo = market.totalNoStake / 1_000_000_000;
        const total = totalYes + totalNo;
        const yesPrice = total > 0 ? (totalYes / total) * 100 : 50;
        const noPrice = 100 - yesPrice;

        // Check if position can be claimed
        const canClaim =
          market.marketState === 1 && // Market is resolved
          market.winningOption !== undefined &&
          ((market.winningOption && position.voteType === 'yes') ||
            (!market.winningOption && position.voteType === 'no'));

        return {
          marketId: position.marketId,
          marketName: market.marketName,
          marketAddress: market.marketAddress,
          voteType: position.voteType,
          totalAmount: position.amount / 1_000_000_000, // Convert to SOL
          totalShares: position.shares,
          tradeCount: position.count,
          averagePrice:
            position.voteType === 'yes'
              ? (position.amount / position.shares / 1_000_000_000) * 100
              : (position.amount / position.shares / 1_000_000_000) * 100,
          currentYesPrice: yesPrice,
          currentNoPrice: noPrice,
          marketState: market.marketState,
          winningOption: market.winningOption,
          canClaim,
          expiryTime: market.expiryTime,
        };
      })
      .filter((p): p is UserPosition => p !== null);

    // Separate active and resolved positions
    const activePositions = positions.filter((p) => p.marketState === 0);
    const resolvedPositions = positions.filter((p) => p.marketState === 1);
    const claimablePositions = positions.filter((p) => p.canClaim);

    logger.info('User positions fetched', {
      wallet,
      totalPositions: positions.length,
      activePositions: activePositions.length,
      resolvedPositions: resolvedPositions.length,
      claimablePositions: claimablePositions.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        all: positions,
        active: activePositions,
        resolved: resolvedPositions,
        claimable: claimablePositions,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch user positions:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user positions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
