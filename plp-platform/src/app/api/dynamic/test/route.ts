/**
 * Dynamic Labs API Test Endpoint
 * Simple endpoint to test if the API token is working
 */

import { NextRequest, NextResponse } from 'next/server';
import { dynamicAPI } from '@/lib/dynamic-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testUserId = searchParams.get('userId');
    
    // Show configuration first
    if (!testUserId) {
      return NextResponse.json({
        success: true,
        message: 'Dynamic API Configuration Test',
        configuration: {
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'Not set',
          sandboxId: process.env.NEXT_PUBLIC_DYNAMIC_SANDBOX_ID || 'Not set',
          hasToken: !!process.env.DYNAMIC_API_TOKEN,
          tokenLength: process.env.DYNAMIC_API_TOKEN?.length || 0,
          hasSandboxToken: !!process.env.DYNAMIC_SANDBOX_API_TOKEN,
          sandboxTokenLength: process.env.DYNAMIC_SANDBOX_API_TOKEN?.length || 0,
          hasLiveToken: !!process.env.DYNAMIC_LIVE_API_TOKEN,
          liveTokenLength: process.env.DYNAMIC_LIVE_API_TOKEN?.length || 0,
          currentEnvironment: process.env.NODE_ENV,
          willUseSandbox: process.env.NODE_ENV === 'development'
        },
        usage: 'Add ?userId=your_user_id to test user endpoints'
      });
    }

    // Test a direct API call to check if the base URL is correct
    const baseURL = 'https://app.dynamic.xyz/api';
    const environmentId = process.env.NODE_ENV === 'development' 
      ? (process.env.NEXT_PUBLIC_DYNAMIC_SANDBOX_ID || '08c4eb87-d159-4fed-82cd-e20233f87984')
      : (process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'eb8aea8b-5ab9-402f-95b1-efff16f611b5');
    
    const apiToken = process.env.NODE_ENV === 'development'
      ? (process.env.DYNAMIC_SANDBOX_API_TOKEN || process.env.DYNAMIC_API_TOKEN)
      : (process.env.DYNAMIC_LIVE_API_TOKEN || process.env.DYNAMIC_API_TOKEN);

    const testUrl = `${baseURL}/environments/${environmentId}/users/${testUserId}`;
    
    console.log('Testing Dynamic API:', {
      baseURL,
      environmentId,
      testUrl,
      hasToken: !!apiToken,
      tokenLength: apiToken?.length || 0
    });

    // Make a direct test request
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      message: 'Dynamic API Test',
      status: response.status,
      statusText: response.statusText,
      url: testUrl,
      response: response.ok ? JSON.parse(responseText) : responseText.substring(0, 500),
      environmentId
    });
  } catch (error) {
    console.error('Dynamic API Test Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test Dynamic API',
        details: process.env.NODE_ENV === 'development' ? {
          error: error,
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
          sandboxId: process.env.NEXT_PUBLIC_DYNAMIC_SANDBOX_ID,
          hasToken: !!process.env.DYNAMIC_API_TOKEN,
          tokenLength: process.env.DYNAMIC_API_TOKEN?.length || 0
        } : undefined
      },
      { status: 500 }
    );
  }
}
