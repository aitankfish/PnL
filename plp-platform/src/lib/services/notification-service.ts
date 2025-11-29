/**
 * Notification Service
 * Handles creating notifications for various platform events
 */

import { connectToDatabase, Notification, PredictionMarket, TradeHistory } from '@/lib/mongodb';
import logger from '@/lib/logger';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  marketId?: string;
  projectId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await connectToDatabase();

    const notification = await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority || 'medium',
      marketId: params.marketId,
      projectId: params.projectId,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
    });

    logger.info('Notification created', {
      userId: params.userId,
      type: params.type,
      notificationId: notification._id?.toString(),
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Send notifications when a market is resolved
 */
export async function notifyMarketResolution(marketId: string, resolution: string) {
  try {
    await connectToDatabase();

    // Get market and project details
    const market = await PredictionMarket.findById(marketId).populate('projectId');
    if (!market) {
      logger.error('Market not found for notification', { marketId });
      return;
    }

    const project = market.projectId as any;
    const projectName = project?.name || 'Unknown Project';
    const tokenSymbol = project?.tokenSymbol || 'TKN';

    // Get all users who participated in this market
    const trades = await TradeHistory.find({ marketId }).distinct('userWallet');

    // Determine notification based on resolution
    let title = '';
    let message = '';
    let type = 'market_resolved';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    if (resolution === 'YesWins') {
      title = `${projectName} Token Launched! 🚀`;
      message = `Great news! ${projectName} (${tokenSymbol}) has successfully launched. The market has been resolved in favor of YES voters.`;
      type = 'token_launched';
      priority = 'high';
    } else if (resolution === 'NoWins') {
      title = `${projectName} - Market Resolved`;
      message = `The prediction market for ${projectName} (${tokenSymbol}) has been resolved. The project did not meet launch criteria.`;
      priority = 'medium';
    } else if (resolution === 'Refund') {
      title = `${projectName} - Refund Available`;
      message = `The market for ${projectName} has been canceled. You can claim your refund now.`;
      priority = 'high';
    }

    // Send notifications to all participants
    const notificationPromises = trades.map(async (userWallet) => {
      // Check if user has claimable rewards
      const userTrades = await TradeHistory.find({
        marketId,
        userWallet,
      });

      const hasClaimableRewards = userTrades.some(trade => !trade.claimed);

      // Customize message based on whether user has claimable rewards
      let userMessage = message;
      let userType = type;
      let userPriority = priority;
      let action = 'view_market';

      if (hasClaimableRewards) {
        userType = 'claim_ready';
        userPriority = 'high';
        action = 'claim_rewards';

        if (resolution === 'YesWins') {
          userMessage = `${projectName} (${tokenSymbol}) has successfully launched! Claim your rewards now.`;
        } else if (resolution === 'NoWins') {
          userMessage = `The market for ${projectName} has been resolved. Your prediction was correct! Claim your SOL rewards now.`;
        } else if (resolution === 'Refund') {
          userMessage = `The market for ${projectName} has been canceled. Claim your refund now.`;
        }
      }

      // Create single notification per user
      await createNotification({
        userId: userWallet,
        type: userType,
        title,
        message: userMessage,
        priority: userPriority,
        marketId: marketId,
        projectId: project?._id?.toString(),
        actionUrl: `/market/${marketId}`,
        metadata: {
          resolution,
          hasClaimableRewards,
          action,
        },
      });
    });

    await Promise.all(notificationPromises);

    logger.info('Market resolution notifications sent', {
      marketId,
      resolution,
      participantCount: trades.length,
    } as any);
  } catch (error) {
    logger.error('Failed to send market resolution notifications:', error);
  }
}
