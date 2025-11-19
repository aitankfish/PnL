'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { getSolanaConnection } from '@/lib/solana';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getTreasuryPDA } from '@/lib/anchor-program';
import { useSignAndSendTransaction, useWallets, useStandardWallets } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, Shield, ArrowDownToLine, Coins } from 'lucide-react';

interface TreasuryState {
  admin: string;
  totalFees: number;
  balance: number;
  bump: number;
}

export default function TreasuryAdminPage() {
  const { primaryWallet } = useWallet();
  const { network } = useNetwork();
  const { wallets } = useWallets();
  const { wallets: standardWallets } = useStandardWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const [treasury, setTreasury] = useState<TreasuryState | null>(null);
  const [loading, setLoading] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Deployer wallet (hardcoded in program)
  const DEPLOYER_WALLET = 'Djw83UQZaEmrmd3YCW9kCHv6ZJUY9V2LGNrcSuUXwB7c';

  // Platform wallet for 1% tokens
  const PLATFORM_WALLET = '3MihVtsLsVuEccpmz4YG72Cr8CJWf1evRorTPdPiHeEQ';

  const isDeployer = primaryWallet?.address === DEPLOYER_WALLET;
  const isAdmin = primaryWallet?.address === treasury?.admin;

  // Fetch treasury state
  const fetchTreasury = async () => {
    try {
      setLoading(true);
      const connection = await getSolanaConnection();
      const [treasuryPda] = getTreasuryPDA();

      const accountInfo = await connection.getAccountInfo(treasuryPda);

      if (!accountInfo) {
        setTreasury(null);
        return;
      }

      // Parse treasury account data
      // Layout: [discriminator: 8 bytes][admin: 32 bytes][total_fees: 8 bytes][bump: 1 byte]
      const data = accountInfo.data;
      const admin = new PublicKey(data.slice(8, 40)).toBase58();
      const totalFees = Number(data.readBigUInt64LE(40));
      const bump = data[48];
      const balance = accountInfo.lamports;

      setTreasury({
        admin,
        totalFees,
        balance,
        bump,
      });
    } catch (error) {
      console.error('Failed to fetch treasury:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (primaryWallet) {
      fetchTreasury();
    }
  }, [primaryWallet, network]);

  // Get Solana wallet for signing
  const getSolanaWallet = () => {
    if (wallets && wallets.length > 0) {
      return wallets[0];
    } else if (standardWallets && standardWallets.length > 0) {
      const privyWallet = standardWallets.find((w: any) => w.isPrivyWallet || w.name === 'Privy');
      if (privyWallet) return privyWallet;
    }
    throw new Error('No Solana wallet found');
  };

  // Initialize treasury (deployer only, one-time)
  const handleInitializeTreasury = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/treasury/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerWallet: primaryWallet!.address,
          network,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const solanaWallet = getSolanaWallet();
      const txBuffer = Buffer.from(result.data.serializedTransaction, 'base64');

      const signResult = await signAndSendTransaction({
        transaction: txBuffer,
        wallet: solanaWallet as any,
        chain: network === 'devnet' ? 'solana:devnet' : 'solana:mainnet',
      });

      const signature = bs58.encode(signResult.signature);
      console.log('Treasury initialized:', signature);

      await fetchTreasury();
      alert('Treasury initialized successfully!');
    } catch (error: any) {
      console.error('Failed to initialize treasury:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Set new admin (current admin only)
  const handleSetAdmin = async () => {
    if (!newAdminAddress) {
      alert('Please enter a new admin address');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/treasury/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAdmin: primaryWallet!.address,
          newAdmin: newAdminAddress,
          network,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const solanaWallet = getSolanaWallet();
      const txBuffer = Buffer.from(result.data.serializedTransaction, 'base64');

      const signResult = await signAndSendTransaction({
        transaction: txBuffer,
        wallet: solanaWallet as any,
        chain: network === 'devnet' ? 'solana:devnet' : 'solana:mainnet',
      });

      const signature = bs58.encode(signResult.signature);
      console.log('Admin changed:', signature);

      await fetchTreasury();
      setNewAdminAddress('');
      alert('Admin changed successfully!');
    } catch (error: any) {
      console.error('Failed to set admin:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw fees (admin only)
  const handleWithdrawFees = async () => {
    if (!withdrawAmount || !recipientAddress) {
      alert('Please enter amount and recipient address');
      return;
    }

    try {
      setLoading(true);

      const amountLamports = parseFloat(withdrawAmount) * 1e9;

      const response = await fetch('/api/treasury/withdraw-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin: primaryWallet!.address,
          recipient: recipientAddress,
          amount: Math.floor(amountLamports),
          network,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const solanaWallet = getSolanaWallet();
      const txBuffer = Buffer.from(result.data.serializedTransaction, 'base64');

      const signResult = await signAndSendTransaction({
        transaction: txBuffer,
        wallet: solanaWallet as any,
        chain: network === 'devnet' ? 'solana:devnet' : 'solana:mainnet',
      });

      const signature = bs58.encode(signResult.signature);
      console.log('Fees withdrawn:', signature);

      await fetchTreasury();
      setWithdrawAmount('');
      setRecipientAddress('');
      alert('Fees withdrawn successfully!');
    } catch (error: any) {
      console.error('Failed to withdraw fees:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Treasury Management</h1>
          <p className="text-gray-300">Platform fee collection and admin controls</p>
        </div>

        {/* Wallet Status */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Connected Wallet:</span>
              <span className="font-mono">{primaryWallet?.address || 'Not connected'}</span>
            </div>
            <div className="flex justify-between">
              <span>Is Deployer:</span>
              <span className={isDeployer ? 'text-green-400' : 'text-red-400'}>
                {isDeployer ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Is Admin:</span>
              <span className={isAdmin ? 'text-green-400' : 'text-red-400'}>
                {isAdmin ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="uppercase">{network}</span>
            </div>
          </CardContent>
        </Card>

        {/* Treasury State */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Treasury Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              Current treasury configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !treasury ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : treasury ? (
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Treasury PDA:</span>
                  <span className="font-mono text-sm">{getTreasuryPDA()[0].toBase58()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin:</span>
                  <span className="font-mono text-sm">{treasury.admin}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance:</span>
                  <span className="font-bold text-cyan-400">
                    {(treasury.balance / 1e9).toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fees Collected:</span>
                  <span className="font-bold text-green-400">
                    {(treasury.totalFees / 1e9).toFixed(4)} SOL
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-gray-400">Treasury not initialized</p>
                {isDeployer && (
                  <Button
                    onClick={handleInitializeTreasury}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      'Initialize Treasury'
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        {treasury && isAdmin && (
          <>
            {/* Set Admin */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Transfer Admin Control
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Transfer treasury admin to a new wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">New Admin Wallet Address</Label>
                  <Input
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    placeholder="Enter new admin wallet address..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleSetAdmin}
                  disabled={loading || !newAdminAddress}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting Admin...
                    </>
                  ) : (
                    'Set New Admin'
                  )}
                </Button>
                <p className="text-xs text-yellow-400">
                  Warning: You will lose admin access after transferring control
                </p>
              </CardContent>
            </Card>

            {/* Withdraw Fees */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5" />
                  Withdraw Fees
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Withdraw collected platform fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Amount (SOL)</Label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.001"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400">
                    Available: {(treasury.balance / 1e9).toFixed(4)} SOL
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Recipient Wallet Address</Label>
                  <Input
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="Enter recipient wallet address..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleWithdrawFees}
                  disabled={loading || !withdrawAmount || !recipientAddress}
                  className="w-full bg-gradient-to-r from-green-500 to-cyan-500"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Withdrawing...
                    </>
                  ) : (
                    'Withdraw Fees'
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Platform Wallet Info */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Platform Token Wallet
            </CardTitle>
            <CardDescription className="text-gray-400">
              Receives 1% token allocation from each launched token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span>Platform Wallet:</span>
                <span className="font-mono text-sm">{PLATFORM_WALLET}</span>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Token claiming is automatic and can be called by anyone after token launch.
                Tokens always go to this hardcoded platform wallet.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-900/20 border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-300">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-200 space-y-2 text-sm">
            <p><strong>1. Deployer Wallet:</strong> Initializes treasury (one-time, then lock away)</p>
            <p><strong>2. Operational Wallet:</strong> Set as admin for day-to-day operations</p>
            <p><strong>3. Fee Collection:</strong> 5% completion fees accumulate in treasury PDA</p>
            <p><strong>4. Token Collection:</strong> 1% tokens go to platform wallet automatically</p>
            <p><strong>5. Withdrawal:</strong> Admin can withdraw accumulated SOL fees anytime</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
