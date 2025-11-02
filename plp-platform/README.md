# PLP - Project Launch Platform

Community-driven token launch platform powered by prediction markets on Solana.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory with the following variables:

```env
# Environment Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# For production, use:
# NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plp-platform?retryWrites=true&w=majority

# Dynamic Wallet Configuration
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=08c4eb87-d159-4fed-82cd-e20233f87984

# Actions Protocol Configuration
NEXT_PUBLIC_ACTIONS_PLATFORM_ID=your_platform_id

# Slerf Tools API (when available)
SLERF_TOOLS_API_KEY=your_slerf_api_key

# Platform Configuration
NEXT_PUBLIC_PLATFORM_FEE=500000000
NEXT_PUBLIC_TARGET_POOL=5000000000
NEXT_PUBLIC_YES_VOTE_COST=50000000
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📱 Features

- **Mobile-First Design**: Optimized for mobile devices with responsive design
- **Dark Theme**: Modern, professional appearance
- **Dynamic Wallet Integration**: Easy wallet connection with multiple Solana wallets
- **Project Creation**: Comprehensive form for project submission
- **Prediction Markets**: Community validation through prediction markets
- **Automated Token Launch**: Integration with pump.fun for token creation

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Blockchain**: Solana, Actions Protocol, Dynamic Labs
- **Database**: MongoDB Cloud
- **Wallet**: Dynamic Labs wallet connection

## 📋 Development Rules

- **Mobile-First**: Always design for mobile, then enhance for desktop
- **Dark Theme**: Use dark theme by default
- **Logging**: Use Winston logger, never console.log in production
- **Environment**: Support both Mainnet and Devnet with environment switching
- **Validation**: Client and server-side validation required
- **Security**: Never give SOL directly to founders, use secure escrow

## 🎯 Economic Model

- **Total Pool**: 5 SOL per prediction market
- **YES Vote Cost**: 0.05 SOL per vote
- **NO Vote Cost**: Dynamic pricing based on remaining pool
- **Platform Fee**: 0.50 SOL per market (10% of total pool)
- **Rewards**: Token airdrops for YES voters, SOL rewards for NO voters

## 📁 Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # Reusable UI components
├── lib/                # Utility functions and configs
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## 🔧 Configuration

The platform supports both development and production environments:

- **Development**: Uses Solana devnet for testing
- **Production**: Uses Solana mainnet for live trading
- **Network Switching**: Automatic based on NODE_ENV

## 📱 Mobile Optimization

- Touch-friendly buttons (44px minimum)
- Responsive breakpoints (sm, md, lg, xl)
- Proper viewport configuration
- Mobile-first CSS approach

## 🚀 Deployment

1. Set up MongoDB Cloud database
2. Configure environment variables for production
3. Deploy to Vercel, Netlify, or your preferred platform
4. Update Dynamic environment ID for production

## 📄 License

MIT License - see LICENSE file for details.