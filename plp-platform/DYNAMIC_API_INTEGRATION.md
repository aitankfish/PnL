# Dynamic Labs API Integration

This document explains how to set up and use the Dynamic Labs API integration in the PLP platform.

## 📋 Overview

The PLP platform now integrates with [Dynamic Labs API](https://www.dynamic.xyz/docs/developer-dashboard/api-token-permissions) to fetch user information, wallet data, and balances directly in our layout. This provides real-time user data without relying solely on client-side wallet connections.

## 🔧 Setup Instructions

### 1. Get Dynamic API Token

1. Go to [Dynamic Labs Developer Dashboard](https://app.dynamic.xyz/developers/api-tokens)
2. Create a new API token with the following permissions:
   - `environment.users.read` - Read user data and wallets
   - `environment.balances.read` - Read balance information  
   - `environment.analytics.read` - Read analytics data
   - `environment.events.read` - Read user activity events
   - `environment.webhooks.read` - Read webhook configurations
   - `environment.settings.read` - Read environment settings

### 2. Configure Environment Variables

Add this to your `.env.local` file:

```bash
# Dynamic Labs API Token (server-side only)
DYNAMIC_API_TOKEN=your_actual_api_token_here
```

**Important**: Replace `your_actual_api_token_here` with your real API token from Dynamic Labs.

### 3. Server-Side API Integration

The integration uses Next.js API routes (`/api/dynamic/user`) to safely make server-side calls to Dynamic Labs API. This ensures:
- ✅ API tokens are never exposed to the client
- ✅ Proper error handling and validation
- ✅ Secure server-side data fetching

### 3. Run Setup Script

```bash
cd plp-platform
./setup-env.sh
```

## 🚀 Features Implemented

### 1. Dynamic API Client (`src/lib/dynamic-api.ts`)

- **User Information**: Fetch user profiles, email, names, creation dates
- **Wallet Data**: Get connected wallets and their details
- **Balance Information**: Fetch multi-chain balances with USD values
- **Analytics**: Platform-wide user and transaction statistics

### 2. React Hooks (`src/hooks/useDynamicUser.ts`)

- `useDynamicUser()` - Complete user data (profile, wallets, balances, analytics)
- `useDynamicUserProfile()` - Lightweight user profile only
- `useDynamicUserWallets()` - User wallets only
- `useDynamicUserBalances()` - User balances only

### 3. UserInfo Component (`src/components/UserInfo.tsx`)

- **Compact Mode**: Shows user avatar, name, and balance in navigation
- **Full Mode**: Complete user profile with wallets and balances
- **Loading States**: Spinner and error handling
- **Responsive Design**: Adapts to different screen sizes

### 4. Navigation Integration (`src/components/Sidebar.tsx`)

- User info displayed in top navigation bar
- Compact user profile with avatar and balance
- Seamless integration with existing wallet button

## 📊 API Endpoints Used

Based on the [Dynamic Labs API documentation](https://www.dynamic.xyz/docs/developer-dashboard/api-token-permissions):

| Endpoint | Permission | Purpose |
|----------|------------|---------|
| `GET /environments/:envId/users/:userId` | `environment.users.read` | User profile data |
| `GET /environments/:envId/users/:userId/wallets` | `environment.users.read` | User's connected wallets |
| `POST /environments/:envId/users/:userId/balances` | `environment.balances.read` | Multi-chain balances |
| `GET /environments/:envId/analytics/overview` | `environment.analytics.read` | Platform analytics |
| `GET /environments/:envId/wallets/:walletId` | `environment.users.read` | Individual wallet details |

## 🎯 Usage Examples

### Basic User Info in Component

```tsx
import { useDynamicUserProfile } from '@/hooks/useDynamicUser';

function MyComponent() {
  const { user, loading, error } = useDynamicUserProfile();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user data</div>;
  
  return (
    <div>
      <h2>{user.firstName} {user.lastName}</h2>
      <p>{user.email}</p>
      <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

### Complete User Data

```tsx
import { useDynamicUser } from '@/hooks/useDynamicUser';

function UserDashboard() {
  const { user, wallets, balances, analytics, loading } = useDynamicUser();
  
  return (
    <div>
      <UserInfo showBalances={true} showWallets={true} />
      {/* Your dashboard content */}
    </div>
  );
}
```

### Compact Navigation Display

```tsx
import UserInfo from '@/components/UserInfo';

function Navigation() {
  return (
    <nav>
      <UserInfo compact={true} className="hidden md:flex" />
      {/* Other navigation items */}
    </nav>
  );
}
```

## 🔒 Security Considerations

1. **API Token**: Store server-side only, never expose to client
2. **Rate Limiting**: Dynamic Labs has rate limits (check their docs)
3. **Error Handling**: Graceful fallbacks when API is unavailable
4. **Caching**: Consider implementing caching for frequently accessed data

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch user data"**
   - Check if `DYNAMIC_API_TOKEN` is set correctly
   - Verify API token has required permissions
   - Ensure environment ID is correct

2. **"No user data"**
   - User might not be connected via Dynamic
   - Check if user ID is available in Dynamic context

3. **Rate Limit Errors**
   - Implement caching to reduce API calls
   - Consider using webhooks for real-time updates

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will log API requests and responses to the console.

## 🔮 Future Enhancements

1. **Real-time Updates**: Use Dynamic webhooks for live data
2. **Caching Layer**: Implement Redis or in-memory caching
3. **Analytics Dashboard**: Use analytics data for admin panels
4. **User Management**: Create admin interfaces for user management
5. **Activity Tracking**: Implement user activity logging

## 📚 Resources

- [Dynamic Labs API Documentation](https://www.dynamic.xyz/docs/developer-dashboard/api-token-permissions)
- [Dynamic Labs Developer Dashboard](https://app.dynamic.xyz/developers)
- [Dynamic Labs Webhooks](https://www.dynamic.xyz/docs/developer-dashboard/webhooks)
- [Dynamic Labs Analytics](https://www.dynamic.xyz/docs/developer-dashboard/analytics)

## ✅ Implementation Checklist

- [x] Dynamic API client implementation
- [x] React hooks for data fetching
- [x] UserInfo component with compact and full modes
- [x] Navigation integration
- [x] Environment configuration
- [x] Error handling and loading states
- [x] TypeScript types and interfaces
- [ ] API token setup and testing
- [ ] Production deployment configuration
- [ ] Performance optimization and caching
