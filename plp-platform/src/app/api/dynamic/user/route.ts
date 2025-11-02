/**
 * Dynamic Labs API Proxy - User Data
 * Server-side API route to fetch user data from Dynamic Labs
 */

import { NextRequest, NextResponse } from 'next/server';
import { dynamicAPI } from '@/lib/dynamic-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'profile';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let data;

    switch (type) {
      case 'profile':
        data = await dynamicAPI.getUser(userId);
        break;
      case 'wallets':
        data = await dynamicAPI.getUserWallets(userId);
        break;
      case 'balances':
        data = await dynamicAPI.getUserBalances(userId);
        break;
      case 'analytics':
        data = await dynamicAPI.getAnalytics();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Dynamic API Error:', error);
    
    // Handle rate limiting gracefully
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limited - please try again later',
          rateLimited: true
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
