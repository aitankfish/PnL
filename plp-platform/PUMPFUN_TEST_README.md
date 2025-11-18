# Pump.fun Integration Test

This is a standalone test script to verify Pump.fun SDK works before integrating into our platform.

## Prerequisites

1. **Wallet with SOL** (0.05-0.1 SOL recommended for testing)
2. **Private key** from your wallet in base58 format

---

## How to Get Your Private Key

### Option 1: From Phantom/Solflare (Export)
1. Open your wallet
2. Go to Settings → Security → Export Private Key
3. Copy the private key (it's in base58 format)

### Option 2: Generate New Test Wallet
```bash
# Install Solana CLI if you haven't
solana-keygen new --no-bip39-passphrase -o test-wallet.json

# Get the private key in base58
solana-keygen pubkey test-wallet.json
cat test-wallet.json | jq -r '.[0:32] | @base64d | @base58'
```

---

## Running the Test

### Step 1: Set Your Private Key
```bash
export WALLET_PRIVATE_KEY="your_base58_private_key_here"
```

### Step 2: Run the Test Script
```bash
npx tsx test-pumpfun-launch.ts
```

### Step 3: Watch the Output
The script will:
1. ✅ Connect to Solana mainnet
2. ✅ Load your wallet and check balance
3. ✅ Initialize Pump.fun SDK
4. ✅ Generate token mint keypair
5. ✅ Create token on Pump.fun
6. ✅ Provide links to view your token

---

## What to Expect

### Console Output:
```
═══════════════════════════════════════════════════
🧪 PUMP.FUN TOKEN LAUNCH TEST
═══════════════════════════════════════════════════

Network: MAINNET-BETA
RPC: https://mainnet.helius-rpc.com/...

Token Details:
  Name: PLP Test Token
  Symbol: PLPTEST
  Description: Test token created from PLP platform...

═══════════════════════════════════════════════════

📡 Step 1: Connecting to Solana...
✅ Connected! Current block height: 123456

👛 Step 2: Loading wallet...
✅ Wallet loaded: YourWalletAddress...
   Balance: 0.1234 SOL

🚀 Step 3: Initializing Pump.fun SDK...
✅ SDK initialized

🎫 Step 4: Generating token mint keypair...
✅ Mint address: TokenMintAddress...

📝 Step 5: Creating token on Pump.fun...
   This will:
   • Create the token
   • Set up bonding curve
   • Make it tradeable on Pump.fun

✅ Fetched Pump.fun global state

🔧 Building create instruction...
✅ Instruction built

🔨 Building transaction...
✅ Transaction signed

📤 Sending transaction to blockchain...
   This may take 10-30 seconds...

✅ Transaction sent!
   Signature: TransactionSignature...
   Explorer: https://solscan.io/tx/...

⏳ Waiting for confirmation...
✅ Transaction confirmed!

═══════════════════════════════════════════════════
🎉 SUCCESS! TOKEN CREATED ON PUMP.FUN
═══════════════════════════════════════════════════

📊 Token Information:
   Name: PLP Test Token
   Symbol: PLPTEST
   Mint: TokenMintAddress...

🔗 Links:
   Pump.fun: https://pump.fun/TokenMintAddress...
   Solscan: https://solscan.io/token/TokenMintAddress...
   Transaction: https://solscan.io/tx/TransactionSignature...

✅ Next Steps:
   1. Visit the Pump.fun link to see your token
   2. Try buying/selling to test the bonding curve
   3. If everything works, integrate this into the platform!

═══════════════════════════════════════════════════
```

---

## Costs

- **Transaction fee:** ~0.000005-0.00001 SOL (~$0.001)
- **Token creation fee:** ~0.02 SOL (~$5) (exact fee depends on Pump.fun)
- **Total estimated cost:** ~0.02-0.05 SOL (~$5-10)

---

## Troubleshooting

### Error: "WALLET_PRIVATE_KEY environment variable not set"
**Solution:** Set your private key:
```bash
export WALLET_PRIVATE_KEY="your_base58_key"
```

### Error: "Insufficient SOL balance"
**Solution:** Add more SOL to your wallet. You need at least 0.02 SOL.

### Error: "Transaction failed"
**Possible causes:**
- Network congestion → Wait a few minutes and try again
- Invalid image URL → Use a publicly accessible image URL
- RPC endpoint issues → Try a different RPC in the script

### Error: "Failed to fetch Pump.fun global state"
**Solution:** Pump.fun might be down or RPC issues. Try:
1. Wait a few minutes
2. Use a different RPC endpoint
3. Check https://pump.fun/ is accessible

---

## Safety Notes

⚠️ **IMPORTANT:**
- This script runs on **MAINNET** and uses **REAL SOL**
- Only run this when you're ready to spend ~$5-10
- Use a test wallet, not your main wallet
- The script has a 5-second countdown to give you time to cancel (Ctrl+C)

---

## Next Steps After Success

Once the test succeeds:

1. **Verify the token exists:**
   - Visit the Pump.fun link
   - Check the token on Solscan
   - Try buying a small amount to test trading

2. **Understand the flow:**
   - Review the console output
   - Note what data is returned
   - Understand the steps involved

3. **Integrate into platform:**
   - Replace PumpPortal with official SDK in `useResolution.ts`
   - Use the same flow as this test script
   - Add proper error handling
   - Integrate with your market resolution logic

---

## What This Proves

If this test succeeds, it proves:
- ✅ Pump.fun SDK works correctly
- ✅ Token creation flow is functional
- ✅ We can create tokens on Pump.fun programmatically
- ✅ Bonding curve is set up correctly
- ✅ Token is immediately tradeable

This gives us confidence to integrate the official SDK into our platform!

---

## Support

If you encounter issues:
1. Check the error message in the console
2. Review the troubleshooting section above
3. Check Pump.fun Discord: https://discord.gg/pumpfun
4. Review Pump.fun docs: https://docs.pump.fun/ (if available)

---

**Last Updated:** 2025-01-18
