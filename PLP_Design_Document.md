# PLP (Project Launch Platform) - Design Document

## 1. Project Overview

### Vision
A decentralized token launch platform that combines prediction markets with automated token deployment, enabling community-driven validation of startup projects before token launches.

### Core Value Proposition
- **For Founders**: Access to community validation and funding through prediction markets
- **For Investors**: Early access to vetted projects with community backing
- **For Community**: Participate in project validation and earn rewards for accurate predictions

## 2. System Architecture

### 2.1 Core Components

#### Frontend (React/Next.js)
- **Create Page**: Project listing interface for founders
- **Browse Page**: Discovery of listed projects
- **Prediction Market Interface**: Voting/prediction interface
- **Dashboard**: User portfolio and prediction history
- **Admin Panel**: Platform management

#### Backend Services
- **API Server**: REST/GraphQL endpoints
- **Prediction Market Engine**: Handles voting logic and outcomes
- **Token Launch Automation**: Integration with pump.fun
- **Notification Service**: Real-time updates
- **Analytics Engine**: Platform metrics and insights

#### Blockchain Integration
- **Solana Program**: Core prediction market logic
- **Pump.fun Integration**: Automated token launches
- **Wallet Integration**: Solana wallet connectivity
- **Token Management**: SPL token handling

### 2.2 Technology Stack

#### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand or Redux Toolkit
- **Wallet Integration**: @solana/wallet-adapter-react
- **Charts**: Chart.js or Recharts for prediction market visualization

#### Backend
- **API**: Node.js with Express/Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Message Queue**: Bull/BullMQ for background jobs
- **Authentication**: JWT with wallet signatures

#### Blockchain
- **Solana SDK**: @solana/web3.js
- **Prediction Markets**: @useactions/action-protocol-markets
- **Token Launch & Purchase**: Slerf.tools API integration
- **Testing**: Solana test validator
- **Deployment**: Mainnet/Solana devnet

## 3. User Flow & Features

### 3.1 Founder Journey

1. **Project Submission**
   - Connect wallet
   - Fill project details (name, description, category, launch timeline)
   - Set token parameters (symbol, supply, allocations)
   - Upload project documents/whitepaper
   - Set prediction market parameters (duration, minimum stake)
   - Add social media links and project image
   - Pay listing fee (in SOL or platform token)

2. **Community Review**
   - Project goes live for community voting
   - Founders can respond to community questions
   - Real-time updates on prediction market status

3. **Outcome & Launch**
   - If prediction market favors launch: Automatic token creation on pump.fun
   - If not: Project marked as "not approved" with feedback

### 3.2 Investor/Community Journey

1. **Discovery**
   - Browse active prediction markets
   - Filter by category, funding goal, timeline
   - View project details and founder information

2. **Participation**
   - Stake tokens on prediction outcome
   - Engage in community discussions
   - Track prediction performance

3. **Rewards**
   - Earn rewards for correct predictions
   - Early access to approved tokens
   - Governance participation

### 3.3 Core Features

#### Prediction Markets (Powered by Actions Protocol)
- **Binary Markets**: Launch vs. No Launch using Actions Protocol SDK
- **Market Duration**: 7-30 days (configurable)
- **Target Pool**: 5 SOL total betting pool per project
- **YES Vote Cost**: 0.05 SOL per prediction
- **NO Vote Cost**: Dynamic pricing based on YES/NO ratio (see economic model)
- **Reward Distribution**: Token airdrops for YES voters or SOL redistribution for NO voters
- **Platform Fee**: 0.50 SOL per market (10% of total pool)
- **Automated Resolution**: Based on actual token launch success

#### Token Launch Automation
- **Pump.fun Integration**: Automated token creation using 4.5 SOL from prediction pool
- **Token Airdrop**: Automatic distribution to all YES voters
- **Founder Benefits**: Founder receives pump.fun creator fees from trading
- **Launch Options**: Automatic launch (recommended) or manual launch with 7-day window

#### Reputation System
- **Founder Scores**: Based on project success rate
- **Predictor Scores**: Based on prediction accuracy
- **Community Reputation**: Based on engagement and helpfulness

## 4. Create Page Specifications

### 4.1 Form Fields Structure

#### Core Project Information
- **Project Name** (Required): Text input with validation
- **Description** (Required): Multi-line text area with character limit
- **Project Category** (Required): Dropdown (DeFi, Gaming, NFT, Infrastructure, AI/ML, Social, Other)
- **Project Type** (Required): Dropdown (Protocol, Application, Platform, Service)
- **Project Stage** (Required): Dropdown (Idea, MVP, Beta, Production, Scaling)
- **Location** (Optional): Text input for geographic location
- **Team Size** (Required): Number input with validation

#### Token Information
- **Token Symbol** (Required): Text input with validation (3-10 characters, e.g., "PROJ")

#### Prediction Market Settings
- **Market Duration** (Required): Dropdown (7, 14, 21, 30 days)
- **Minimum Stake** (Required): SOL amount input with validation

#### Media & Links
- **Social Media Links** (Optional): Dynamic form with platform-specific inputs
  - Website, GitHub, LinkedIn, Twitter, Telegram, Discord
- **Project Image** (Optional): File upload with size/format validation
- **Project Documentation** (Optional): Multi-file upload (max 5 files, PDF/DOC)

#### Additional Information
- **Additional Notes** (Optional): Multi-line text area for extra details

### 4.2 Form Validation Rules
- **Required Fields**: All core fields must be completed
- **Character Limits**: Description (max 2000 chars), Additional Notes (max 1000 chars)
- **File Upload**: Images (max 5MB), Documents (max 10MB each)
- **Team Size**: Must be positive integer
- **Token Symbol**: Must be 3-10 characters, alphanumeric only
- **Market Duration**: Must be between 7-30 days
- **Minimum Stake**: Must be positive SOL amount

### 4.3 User Experience Features
- **Progress Indicator**: Show completion percentage
- **Save Draft**: Allow saving incomplete forms
- **Preview Mode**: Show how project will appear to community
- **Real-time Validation**: Immediate feedback on form inputs
- **Mobile Responsive**: Optimized for all device sizes

### 4.4 Submission Process
1. **Form Validation**: Client and server-side validation
2. **Wallet Connection**: Require wallet signature for submission
3. **Listing Fee Payment**: Charge SOL for platform listing
4. **Prediction Market Creation**: Initialize on-chain market
5. **Confirmation**: Show submission success and next steps

## 5. Technical Implementation

### 5.1 Actions Protocol Integration

#### Installation
```bash
npm install @useactions/action-protocol-markets
# or
yarn add @useactions/action-protocol-markets
```

#### Key Features
- **No Anchor Dependency**: Built with pure `@solana/web3.js`
- **Custom Platform Support**: Create our own prediction markets platform
- **Binary Outcomes**: Perfect for Launch vs. No Launch predictions
- **Automated Fee Handling**: Platform and creator fees managed automatically
- **Market State Management**: Built-in market lifecycle management

#### Platform Setup
```typescript
import { ActionsSDK, Connection, Keypair, PublicKey } from '@useactions/action-protocol-markets';

// Initialize our custom platform
const connection = new Connection('https://api.mainnet-beta.solana.com');
const platformKeypair = Keypair.generate();
const platformId = platformKeypair.publicKey;

// Create PLP platform with custom fees
const platformResult = await sdk.initPlatform({
  platformId: platformId,
  feePercentage: 300,        // 3% platform fee for PLP
  creatorFeePercentage: 200, // 2% creator fee for founders
  treasury: plpTreasuryAddress,
  authorityKeypair: plpAuthorityKeypair
});
```

#### Market Creation Flow
```typescript
// Create prediction market for project launch with PLP-specific parameters
const marketResult = await sdk.createMarket({
  marketName: `${projectName} Token Launch Prediction`,
  marketDescription: `Will ${projectName} successfully launch a token on pump.fun?`,
  metadataUri: projectMetadataUri,
  expiryTime: marketEndTimestamp,
  finalizationDeadline: finalizationTimestamp,
  creatorKeypair: founderKeypair
});

// Initialize PLP-specific market parameters
const plpMarketData = {
  targetPool: 5 * LAMPORTS_PER_SOL, // 5 SOL target
  yesVoteCost: 0.05 * LAMPORTS_PER_SOL, // 0.05 SOL per YES vote
  platformFee: 0.5 * LAMPORTS_PER_SOL, // 0.5 SOL platform fee
  tokenSymbol: projectTokenSymbol,
  founderWallet: founderKeypair.publicKey,
  autoLaunch: true // Enable automatic token launch
};
```

#### Prediction Management
```typescript
// Calculate NO vote cost based on current pool state
const calculateNoVoteCost = (yesPool: number, totalPool: number) => {
  const remainingPool = totalPool - yesPool - PLATFORM_FEE;
  const maxNoVotes = Math.floor(remainingPool / 0.01 * LAMPORTS_PER_SOL); // Minimum 0.01 SOL
  return remainingPool / maxNoVotes;
};

// Users place YES predictions (fixed cost)
const yesPredictionResult = await sdk.makePrediction({
  marketAddress: marketAddress,
  option: true, // YES = launch
  amount: 0.05 * LAMPORTS_PER_SOL, // Fixed 0.05 SOL
  participantKeypair: userKeypair
});

// Users place NO predictions (dynamic cost)
const noVoteCost = calculateNoVoteCost(currentYesPool, 5 * LAMPORTS_PER_SOL);
const noPredictionResult = await sdk.makePrediction({
  marketAddress: marketAddress,
  option: false, // NO = no launch
  amount: noVoteCost,
  participantKeypair: userKeypair
});

// Handle market resolution and token launch
const resolutionResult = await sdk.finishMarket({
  marketAddress: marketAddress,
  winningOption: launchSuccessful, // true if pump.fun token created
  authorityKeypair: plpAuthorityKeypair
});

// If YES wins, trigger secure token creation and airdrop
if (launchSuccessful) {
  await triggerSecureTokenLaunch(marketAddress, tokenSymbol, yesVoters, founderKeypair);
}

// Secure token launch function
const triggerSecureTokenLaunch = async (
  marketAddress: string, 
  tokenSymbol: string, 
  yesVoters: string[], 
  founderKeypair: Keypair
) => {
  // 1. Get founder's signature for token creation (but don't give them SOL)
  const launchSignature = await requestFounderLaunchSignature(founderKeypair);
  
  // 2. Create token on pump.fun using slerf.tools API
  const tokenAddress = await createTokenViaSlerf({
    symbol: tokenSymbol,
    name: projectName,
    description: projectDescription,
    creatorSignature: launchSignature,
    founderWallet: founderKeypair.publicKey
  });
  
  // 3. Immediately buy 4.5 SOL worth of tokens
  const tokensPurchased = await buyTokensViaSlerf({
    tokenAddress: tokenAddress,
    solAmount: 4.5 * LAMPORTS_PER_SOL,
    buyerWallet: plpTreasuryWallet // PLP controls the SOL
  });
  
  // 4. Distribute tokens equally to all YES voters
  const tokensPerVoter = tokensPurchased / yesVoters.length;
  await distributeTokensToVoters(tokenAddress, yesVoters, tokensPerVoter);
  
  // 5. Update market with token address
  await updateMarketWithTokenAddress(marketAddress, tokenAddress);
};
```

#### Benefits for PLP
1. **Rapid Development**: No need to build prediction market infrastructure from scratch
2. **Battle-Tested**: Actions Protocol is already deployed and used on mainnet
3. **Custom Platform**: We can create our own branded platform with PLP-specific fees
4. **Automated Fees**: Built-in fee collection for both platform and project creators
5. **Market Management**: Comprehensive market state management and resolution

### 5.2 Smart Contract Architecture

Since we're using Actions Protocol for prediction markets, we only need minimal custom smart contracts:

#### PLP Platform Contract (Optional)
```rust
// Simple contract to manage PLP-specific logic
pub struct PLPPlatform {
    pub authority: Pubkey,
    pub actions_platform_id: Pubkey,
    pub pump_fun_integration: Pubkey,
    pub treasury: Pubkey,
}

// Key functions
- `initialize_platform()`: Set up PLP platform with Actions Protocol
- `create_project_market()`: Create prediction market for specific project
- `handle_launch_resolution()`: Automatically resolve based on pump.fun success
```

#### Integration Points
- **Actions Protocol**: Handles all prediction market logic
- **Pump.fun API**: Token creation and launch automation
- **PLP Backend**: Orchestrates the entire flow

### 5.3 Integration Points

#### Automated Token Launch & Purchase
- **Slerf.tools Integration**: Use [slerf.tools](https://slerf.tools/en-us/pump-launch-and-buy-token/solana) for automated token launch and purchase
- **Secure Process**: Founder signs transaction, but PLP controls the 4.5 SOL
- **Automatic Purchase**: 4.5 SOL used to buy tokens immediately after launch
- **Equal Distribution**: Tokens distributed equally to all YES voters
- **Founder Benefits**: Founder receives pump.fun creator fees from future trading

#### Pump.fun Integration
- **API Integration**: Use pump.fun's API for token creation
- **Automated Deployment**: Trigger token launch upon positive resolution
- **Initial Liquidity**: 4.5 SOL provides immediate liquidity for the token
- **Metadata Management**: Set token name, symbol, description from project data

#### Wallet Integration
- **Multi-wallet Support**: Phantom, Solflare, Backpack, etc.
- **Transaction Signing**: For predictions and token interactions
- **Balance Tracking**: Real-time wallet balance updates

### 5.4 Data Models

#### Project Schema
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    founder_wallet VARCHAR(44) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    project_type VARCHAR(100),
    project_stage VARCHAR(100),
    location VARCHAR(255),
    team_size INTEGER,
    token_symbol VARCHAR(10),
    social_links JSONB,
    project_image_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Prediction Market Schema (Actions Protocol Integration)
```sql
CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    market_address VARCHAR(44) UNIQUE NOT NULL, -- Actions Protocol market address
    actions_platform_id VARCHAR(44) NOT NULL,   -- Our PLP platform ID
    market_name VARCHAR(255) NOT NULL,
    market_description TEXT,
    metadata_uri VARCHAR(500),
    expiry_time TIMESTAMP NOT NULL,
    finalization_deadline TIMESTAMP NOT NULL,
    market_state INTEGER DEFAULT 0, -- 0=Active, 1=Resolved, 2=Canceled, 3=AutoCanceled
    winning_option BOOLEAN, -- true=YES wins, false=NO wins, null=unresolved
    target_pool BIGINT DEFAULT 5000000000, -- 5 SOL in lamports
    platform_fee BIGINT DEFAULT 500000000, -- 0.5 SOL in lamports
    yes_vote_cost BIGINT DEFAULT 50000000, -- 0.05 SOL in lamports
    total_yes_stake BIGINT DEFAULT 0,
    total_no_stake BIGINT DEFAULT 0,
    yes_vote_count INTEGER DEFAULT 0,
    no_vote_count INTEGER DEFAULT 0,
    pump_fun_token_address VARCHAR(44), -- Set when token is created
    auto_launch BOOLEAN DEFAULT true,
    launch_window_end TIMESTAMP, -- For manual launch option
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Prediction Participants Schema
```sql
CREATE TABLE prediction_participants (
    id UUID PRIMARY KEY,
    market_id UUID REFERENCES prediction_markets(id),
    participant_wallet VARCHAR(44) NOT NULL,
    vote_option BOOLEAN NOT NULL, -- true=YES, false=NO
    stake_amount BIGINT NOT NULL,
    vote_cost BIGINT NOT NULL,
    tokens_airdropped BIGINT DEFAULT 0, -- For YES voters when token launches
    sol_rewarded BIGINT DEFAULT 0, -- For NO voters when NO wins
    claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(market_id, participant_wallet, vote_option)
);
```

## 6. Economic Model

### 6.1 Betting Mechanics

#### Target Pool Structure
- **Total Target Pool**: 5 SOL per prediction market
- **YES Vote Cost**: Fixed 0.05 SOL per vote
- **NO Vote Cost**: Dynamic pricing based on current YES/NO ratio
- **Maximum YES Votes**: 90 votes (90 × 0.05 SOL = 4.5 SOL)
- **Platform Fee**: 0.50 SOL (10% of total pool)

#### NO Vote Pricing Formula
```
NO Vote Cost = (4.5 SOL - YES Pool) / Remaining NO Vote Slots

Example:
- If 50 YES votes (2.5 SOL), remaining pool = 2.0 SOL
- If 40 NO votes possible, NO cost = 2.0 SOL / 40 = 0.05 SOL
- If 20 YES votes (1.0 SOL), remaining pool = 3.5 SOL  
- If 70 NO votes possible, NO cost = 3.5 SOL / 70 = 0.05 SOL
```

### 6.2 Reward Distribution

#### Scenario 1: YES Wins (Token Launches)
1. **Platform Fee**: 0.50 SOL to PLP treasury
2. **Token Creation**: 4.5 SOL used to create token on pump.fun
3. **Token Airdrop**: Equal distribution of tokens to all YES voters
4. **NO Voters**: Lose their stake (redistributed to YES voters via tokens)

#### Scenario 2: NO Wins (No Token Launch)
1. **Platform Fee**: 0.50 SOL to PLP treasury
2. **NO Voter Rewards**: 4.5 SOL redistributed equally among NO voters
3. **YES Voters**: Lose their stake (redistributed to NO voters)

#### Scenario 3: Market Doesn't Reach Target
- **Refund**: All participants get full refund minus platform fee
- **Platform Fee**: 0.50 SOL still collected for market creation costs

### 6.3 Token Launch Process

#### Automatic Launch (Recommended)
1. **Market Resolution**: YES outcome triggers automatic token creation
2. **Pump.fun Integration**: 4.5 SOL automatically sent to pump.fun
3. **Token Distribution**: Tokens airdropped to YES voter wallets
4. **Founder Benefits**: Founder receives pump.fun creator fees

#### Manual Launch Option (Secure Process)
1. **Market Resolution**: YES outcome gives founder launch rights
2. **Launch Window**: 7-day window for founder to trigger launch
3. **Secure Launch Process**:
   - Founder clicks "Launch Token" button and signs transaction
   - PLP platform creates token on pump.fun using founder's signature
   - 4.5 SOL automatically used to buy tokens at launch price
   - Tokens distributed equally to all YES voters
   - Founder receives pump.fun creator fees from future trading
4. **Fallback**: If not launched within window, SOL refunded to YES voters

### 6.4 Fee Structure
- **Market Creation**: 0.1-1 SOL listing fee per project
- **Platform Fee**: 0.50 SOL per successful market (10% of pool)
- **Pump.fun Fees**: Standard pump.fun creator fees (go to project founder)
- **Gas Fees**: Standard Solana transaction fees

### 6.5 Economic Incentives

#### For YES Voters
- **Token Airdrop**: Receive newly created tokens if project launches
- **Early Access**: Get tokens at launch price
- **Community Support**: Help projects they believe in

#### For NO Voters  
- **SOL Rewards**: Earn SOL if project doesn't launch
- **Risk Management**: Hedge against unsuccessful projects
- **Market Efficiency**: Provide price discovery

#### For Project Founders
- **Validation**: Community validation before token launch
- **Funding**: 4.5 SOL worth of token creation funding
- **Creator Fees**: Earn pump.fun creator fees on token trades
- **Community Building**: Build engaged community before launch

## 6. Risk Management

### 6.1 Technical Risks
- **Smart Contract Security**: Multiple audits, formal verification
- **Oracle Reliability**: Multiple data sources for resolution
- **Scalability**: Layer 2 solutions for high transaction volumes

### 6.2 Economic Risks
- **Market Manipulation**: Stake limits and time delays
- **Liquidity Risk**: Minimum liquidity requirements
- **Regulatory Compliance**: KYC/AML for large transactions

### 6.3 Operational Risks
- **Project Vetting**: Basic due diligence requirements
- **Dispute Resolution**: Community governance for edge cases
- **Emergency Procedures**: Circuit breakers for extreme events

## 7. Development Roadmap

### Phase 1: MVP (Months 1-3)
- [ ] Basic frontend with project listing
- [ ] Actions Protocol integration and custom platform setup
- [ ] Wallet integration with @solana/wallet-adapter
- [ ] Basic pump.fun integration
- [ ] Market creation and prediction functionality

### Phase 2: Core Features (Months 4-6)
- [ ] Advanced prediction market features
- [ ] Reputation system
- [ ] Enhanced UI/UX
- [ ] Mobile responsiveness

### Phase 3: Advanced Features (Months 7-9)
- [ ] Governance system
- [ ] Advanced analytics
- [ ] API for third-party integrations
- [ ] Mobile app

### Phase 4: Scale & Optimize (Months 10-12)
- [ ] Performance optimization
- [ ] Advanced risk management
- [ ] Institutional features
- [ ] Multi-chain expansion

## 8. Success Metrics

### Platform Metrics
- **Total Projects Listed**: Target 100+ in first year
- **Prediction Market Volume**: $1M+ in first year
- **Successful Launches**: 20%+ approval rate
- **User Engagement**: 1000+ active predictors

### Business Metrics
- **Revenue Growth**: $100K+ in first year
- **User Acquisition**: 10K+ registered users
- **Retention Rate**: 60%+ monthly active users
- **Net Promoter Score**: 50+ user satisfaction

## 9. Competitive Analysis

### Direct Competitors
- **Pump.fun**: Direct token launches without validation
- **Launchpad platforms**: Traditional ICO/IDO platforms
- **Prediction markets**: Polymarket, Augur

### Competitive Advantages
- **Community Validation**: Prediction markets provide objective validation
- **Automated Launch**: Seamless integration with pump.fun
- **Lower Barriers**: Easier than traditional launchpads
- **Transparency**: All decisions are on-chain and verifiable

## 10. Next Steps

1. **Technical Validation**: Build MVP smart contract and test integration
2. **Market Research**: Survey potential founders and investors
3. **Legal Review**: Understand regulatory requirements
4. **Partnership Development**: Establish relationships with key ecosystem players
5. **Community Building**: Start building initial user base

---

*This document is a living document and will be updated as the project evolves.*

