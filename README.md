# PLP - Prediction Market Platform

A decentralized prediction market platform built on Solana, featuring a custom smart contract and modern web interface.

## 🚀 Features

- **Custom Solana Program**: Built with Anchor framework for prediction markets
- **Dynamic Labs Integration**: Seamless wallet connection and transaction signing
- **RPC Fallback System**: Robust connection management with automatic failover
- **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS
- **IPFS Integration**: Decentralized metadata storage
- **MongoDB**: Project data persistence

## 📁 Project Structure

```
PLP/
├── plp-platform/           # Next.js frontend application
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utility libraries
│   │   └── hooks/          # Custom React hooks
│   └── plp_program/        # Solana program (Anchor)
│       ├── programs/
│       │   └── errors/     # Main prediction market program
│       └── tests/          # Program tests
├── PLP_Design_Document.md  # Technical design specifications
└── PLP_Rules_Document.md   # Business rules and requirements
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Dynamic Labs** - Wallet integration
- **IPFS** - Decentralized storage

### Backend
- **Solana** - Blockchain platform
- **Anchor** - Solana program framework
- **MongoDB** - Database
- **Rust** - Smart contract language

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor CLI
- MongoDB

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PLP
   ```

2. **Install frontend dependencies**
   ```bash
   cd plp-platform
   npm install
   ```

3. **Install program dependencies**
   ```bash
   cd plp_program
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Build the Solana program**
   ```bash
   cd plp_program
   anchor build
   ```

6. **Start the development server**
   ```bash
   cd plp-platform
   npm run dev
   ```

## 📋 Program Instructions

The PLP prediction market program supports the following instructions:

- `init_treasury` - Initialize the platform treasury
- `create_market` - Create a new prediction market
- `buy_yes` - Buy YES shares
- `buy_no` - Buy NO shares
- `finalize_yes` - Finalize market with YES outcome
- `finalize_no` - Finalize market with NO outcome
- `claim_yes` - Claim winnings for YES shares
- `claim_no` - Claim winnings for NO shares
- `refund` - Refund shares if market expires without resolution

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `plp-platform` directory:

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Dynamic Labs
DYNAMIC_ENVIRONMENT_ID=your_environment_id

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# IPFS
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

## 🧪 Testing

### Program Tests
```bash
cd plp_program
anchor test
```

### Frontend Tests
```bash
cd plp-platform
npm test
```

## 📚 Documentation

- [Design Document](./PLP_Design_Document.md) - Technical architecture and design decisions
- [Rules Document](./PLP_Rules_Document.md) - Business rules and requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Dynamic Labs](https://www.dynamic.xyz/)
- [Next.js Documentation](https://nextjs.org/docs)

## 📞 Support

For support and questions, please open an issue in this repository.
