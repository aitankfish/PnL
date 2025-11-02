# Environment Configuration Usage Guide

This guide shows how to use the new centralized environment configuration system in PLP.

## Overview

The new `environment.ts` file provides a centralized way to manage environment-specific configuration, automatically switching between development and production settings.

## Key Features

- **Automatic Environment Detection**: Automatically switches between devnet/mainnet based on `NODE_ENV`
- **Centralized Configuration**: All environment variables in one place
- **Type Safety**: Full TypeScript support with interfaces
- **Validation**: Built-in configuration validation
- **Feature Flags**: Environment-specific feature toggles

## Basic Usage

### Import the Environment

```typescript
import { 
  environment, 
  getNetworkConfig, 
  getDynamicConfig, 
  getActionsConfig,
  isDevnet,
  isMainnet,
  getNetworkName
} from '@/lib/environment';
```

### Get Configuration

```typescript
// Get full configuration
const config = environment.getConfig();

// Get specific configuration sections
const networkConfig = getNetworkConfig();
const dynamicConfig = getDynamicConfig();
const actionsConfig = getActionsConfig();
```

### Check Environment

```typescript
// Check current network
if (isDevnet()) {
  console.log('Running on devnet');
} else if (isMainnet()) {
  console.log('Running on mainnet');
}

// Get network name for display
const networkName = getNetworkName(); // "Devnet" or "Mainnet"
```

## Configuration Sections

### Network Configuration

```typescript
const networkConfig = getNetworkConfig();
// Returns:
// {
//   network: 'devnet' | 'mainnet-beta',
//   rpcUrl: string,
//   wsUrl?: string
// }
```

### Dynamic Labs Configuration

```typescript
const dynamicConfig = getDynamicConfig();
// Returns:
// {
//   environmentId: string,
//   apiToken: string,
//   isSandbox: boolean
// }
```

### Actions Protocol Configuration

```typescript
const actionsConfig = getActionsConfig();
// Returns:
// {
//   platformId: string,
//   platformAuthorityPrivateKey: string,
//   platformTreasury: string,
//   programId: string
// }
```

### Feature Flags

```typescript
// Check if features are enabled
if (environment.isFeatureEnabled('enableDevnetFaucet')) {
  // Show faucet button
}

if (environment.isFeatureEnabled('enableMockMode')) {
  // Use mock data
}
```

## Validation

```typescript
// Validate configuration
const validation = environment.validateConfig();

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Migration from Old Config

### Before (using config.ts)

```typescript
import { config } from '@/lib/config';

// Old way
const rpcUrl = config.isDevelopment ? config.solana.devnetRpc : config.solana.mainnetRpc;
const dynamicEnv = config.isDevelopment ? config.dynamic.sandboxId : config.dynamic.environmentId;
```

### After (using environment.ts)

```typescript
import { getNetworkConfig, getDynamicConfig } from '@/lib/environment';

// New way
const networkConfig = getNetworkConfig();
const rpcUrl = networkConfig.rpcUrl;

const dynamicConfig = getDynamicConfig();
const environmentId = dynamicConfig.environmentId;
```

## Component Usage

### Network Status Component

```typescript
import NetworkStatus from '@/components/NetworkStatus';

// Simple network indicator
<NetworkStatus compact />

// Full network details (development only)
<NetworkStatus showDetails />
```

### Programmatic Access

```typescript
import { useNetworkStatus } from '@/components/NetworkStatus';

function MyComponent() {
  const { networkName, isDevnet, isConfigValid } = useNetworkStatus();
  
  return (
    <div>
      <p>Network: {networkName}</p>
      {!isConfigValid && <p>Configuration issues detected</p>}
    </div>
  );
}
```

## Environment Variables

The system automatically reads these environment variables:

### Required

```bash
# Dynamic Labs
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=eb8aea8b-5ab9-402f-95b1-efff16f611b5
NEXT_PUBLIC_DYNAMIC_SANDBOX_ID=08c4eb87-d159-4fed-82cd-e20233f87984
DYNAMIC_API_TOKEN=your_api_token_here
DYNAMIC_SANDBOX_API_TOKEN=your_sandbox_token_here
DYNAMIC_LIVE_API_TOKEN=your_live_token_here

# Actions Protocol
NEXT_PUBLIC_ACTIONS_PLATFORM_ID=your_platform_id_here
ACTIONS_PLATFORM_AUTHORITY_PRIVATE_KEY=[1,2,3,...]
NEXT_PUBLIC_ACTIONS_PLATFORM_TREASURY=your_treasury_address_here

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
PINATA_GATEWAY_URL=https://gateway.pinata.cloud
```

### Optional

```bash
# Solana RPC (uses defaults if not set)
NEXT_PUBLIC_HELIUS_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=your_key
NEXT_PUBLIC_HELIUS_DEVNET_RPC=https://devnet.helius-rpc.com/?api-key=your_key
```

## Best Practices

1. **Always use the environment functions** instead of directly accessing environment variables
2. **Check feature flags** before enabling development-only features
3. **Validate configuration** on startup in production
4. **Use the NetworkStatus component** for debugging in development
5. **Import specific functions** instead of the entire environment object for better tree-shaking

## Debugging

In development mode, you can use:

```typescript
// Get configuration summary for debugging
const summary = environment.getConfigSummary();
console.log('Environment summary:', summary);

// Check validation status
const validation = environment.validateConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Example: Creating a New Service

```typescript
import { getNetworkConfig, isDevnet } from '@/lib/environment';

class MyService {
  private connection: Connection;

  constructor() {
    const networkConfig = getNetworkConfig();
    this.connection = new Connection(networkConfig.rpcUrl, 'confirmed');
    
    if (isDevnet()) {
      console.log('Running in development mode');
    }
  }
}
```

This centralized approach makes it much easier to manage environment-specific configuration and ensures consistency across the entire application.
