# PLP (Project Launch Platform) - Development Rules & Guidelines

## 🎯 **Core Concept**
A Solana-based token launch platform that uses prediction markets for community validation before automated token launches on pump.fun.

## 📋 **Project Rules & Standards**

### **Technology Stack**
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with Express/Fastify, MongoDB Cloud
- **Blockchain**: @solana/web3.js, @useactions/action-protocol-markets
- **Token Launch**: Slerf.tools API integration for automated token creation
- **Wallet Integration**: @dynamic-labs/sdk-react-core @dynamic-labs/solana
- **Logging**: Universal logger that works on both client and server (never use console.log in production)
- **Environment**: Support both Mainnet and Devnet with environment switching

### **Database Choice**
- **Primary Database**: MongoDB Cloud (not PostgreSQL)
- **Schema**: Follow the schemas defined in design document
- **Collections**: projects, prediction_markets, prediction_participants

## 💰 **Economic Model Rules**

### **Betting Mechanics**
- **Total Pool**: Always 5 SOL per prediction market
- **YES Vote Cost**: Fixed 0.05 SOL per vote
- **NO Vote Cost**: Dynamic pricing based on remaining pool
- **Platform Fee**: 0.50 SOL per market (10% of total pool)
- **Maximum YES Votes**: 90 votes (90 × 0.05 SOL = 4.5 SOL)

### **Reward Distribution**
- **YES Wins (Token Launches)**:
  - 0.50 SOL → Platform fee
  - 4.50 SOL → Token creation on pump.fun
  - Tokens → Airdropped equally to all YES voters
  - Founder → Receives pump.fun creator fees

- **NO Wins (No Launch)**:
  - 0.50 SOL → Platform fee
  - 4.50 SOL → Redistributed equally to all NO voters
  - YES voters → Lose their stake

### **Token Launch Process**
- **NEVER give SOL directly to founders** - this creates trust issues
- **Secure Process**: Founder signs transaction, but PLP controls the 4.5 SOL
- **Use Slerf.tools**: For automated token creation and immediate purchase
- **Equal Distribution**: Always distribute tokens equally to YES voters

## 📝 **Create Page Form Fields**

### **Required Fields**
- Project Name (text input)
- Description (textarea, max 2000 chars)
- Project Category (dropdown: DeFi, Gaming, NFT, Infrastructure, AI/ML, Social, Other)
- Project Type (dropdown: Protocol, Application, Platform, Service)
- Project Stage (dropdown: Idea, MVP, Beta, Production, Scaling)
- Team Size (number input)
- Token Symbol (text input, 3-10 chars, alphanumeric)
- Market Duration (dropdown: 7, 14, 21, 30 days)
- Minimum Stake (SOL amount input)

### **Optional Fields**
- Location (text input)
- Social Media Links (dynamic form: Website, GitHub, LinkedIn, Twitter, Telegram, Discord)
- Project Documentation (file upload, max 5 files)
- Project Image (file upload, max 5MB)
- Additional Notes (textarea, max 1000 chars)

### **Removed Fields (Do NOT Include)**
- Launch Timeline
- Token Supply
- Founder Allocation
- Community Allocation
- Launch Strategy
- Funding amounts/deadlines
- First Fund Release Date

## 🔧 **Development Guidelines**

### **Actions Protocol Integration**
- Use @useactions/action-protocol-markets for all prediction market functionality
- Create custom PLP platform with 3% platform fee and 2% creator fee
- Follow Actions Protocol patterns for market creation and resolution

### **Security Rules**
- **Never trust founders with SOL** - always use secure escrow mechanisms
- **Validate all inputs** - client and server-side validation required
- **Use wallet signatures** - for authentication and transaction signing
- **Implement proper error handling** - graceful failure modes

### **User Experience Rules**
- **Dark theme by default** - modern, professional appearance
- **Mobile-first design** - optimize for mobile, then enhance for desktop
- **Responsive design** - seamless experience across all device sizes
- **Touch-friendly** - proper button sizes and spacing for mobile
- **Progress indicators** - show form completion and transaction status
- **Real-time validation** - immediate feedback on form inputs
- **Save draft functionality** - allow saving incomplete forms

### **API Design Rules**
- **RESTful endpoints** - follow standard REST patterns
- **Proper error codes** - consistent error handling
- **Input validation** - validate all incoming data
- **Rate limiting** - prevent abuse and spam

## 🎨 **UI/UX Standards**

### **Design System**
- **Color Scheme**: Dark theme with light blue/green accents
- **Typography**: Clean, readable fonts
- **Spacing**: Consistent padding and margins
- **Components**: Use shadcn/ui components where possible

### **Form Design**
- **Single column layout** - clean, focused design
- **Required field indicators** - clear visual cues
- **Error states** - helpful error messages
- **Success states** - confirmation feedback
- **Loading states** - progress indicators

### **Button Styles**
- **Primary actions**: Gradient backgrounds (blue to green)
- **Secondary actions**: Outlined or subtle backgrounds
- **Destructive actions**: Red color scheme
- **Disabled states**: Grayed out with proper contrast

## 📊 **Data Flow Rules**

### **Project Submission Flow**
1. User fills create page form
2. Client-side validation
3. Wallet connection and signature
4. Data sent to backend API
5. Stored in MongoDB Cloud
6. Actions Protocol market created
7. Prediction market goes live

### **Prediction Flow**
1. User connects wallet
2. Views active prediction markets
3. Places YES/NO prediction with SOL
4. Transaction confirmed on-chain
5. Market state updated in database
6. Real-time UI updates

### **Resolution Flow**
1. Market expiry reached
2. Check for actual token launch
3. Resolve market (YES/NO)
4. Distribute rewards (tokens or SOL)
5. Update all participant records

## 🚫 **Anti-Patterns (Things to Avoid)**

### **Never Do These**
- Give SOL directly to founders
- Use PostgreSQL instead of MongoDB
- Skip input validation
- Ignore mobile responsiveness
- Create custom prediction market contracts (use Actions Protocol)
- Hardcode API keys or sensitive data
- Skip error handling
- Use light theme (dark theme preferred)

### **Security Anti-Patterns**
- Trust user input without validation
- Store sensitive data in localStorage
- Skip wallet signature verification
- Allow unlimited file uploads
- Skip rate limiting on API endpoints

### **Environment & Network Rules**
- **Environment Variables**: Use NODE_ENV to distinguish dev/prod
- **Network Switching**: Support both Mainnet and Devnet
- **Connection Logic**: `if (process.env.NODE_ENV === 'development')` for devnet
- **Logging**: Always use logger instead of console.log
- **Error Handling**: Proper logging for debugging and monitoring

### **Mobile-First Development Rules**
- **Design Priority**: Mobile-first, then desktop enhancement
- **Breakpoints**: Use Tailwind's responsive breakpoints (sm, md, lg, xl)
- **Touch Targets**: Minimum 44px for buttons and interactive elements
- **Viewport**: Proper viewport meta tag for mobile
- **Testing**: Test on actual mobile devices, not just browser dev tools

## 📁 **File Organization Rules**

### **Frontend Structure**
```
src/
├── app/                 # Next.js app router
├── components/          # Reusable UI components
├── lib/                # Utility functions and configs
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

### **Backend Structure**
```
api/
├── routes/             # API route handlers
├── models/             # Database models
├── middleware/         # Custom middleware
├── services/           # Business logic
└── utils/              # Helper functions
```

## 🔄 **Update Process**

### **When to Update This Document**
- New features are added
- Economic model changes
- Technology stack updates
- Security requirements change
- UI/UX patterns evolve

### **Review Schedule**
- Review before major feature development
- Update after design decisions
- Validate against current implementation
- Ensure consistency across team

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintained By**: Development Team
