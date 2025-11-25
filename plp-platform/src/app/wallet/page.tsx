'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useFundWallet, useSignAndSendTransaction, useWallets, useStandardWallets } from '@privy-io/react-auth/solana';
import { useSolPrice } from '@/hooks/useSolPrice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import bs58 from 'bs58';
import {
  Wallet,
  Settings,
  Send,
  Download,
  Copy,
  Check,
  X,
  Camera,
  Edit2,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Shield,
  ShoppingCart
} from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { RPC_ENDPOINT, SOLANA_NETWORK } from '@/config/solana';
import { getSolanaConnection } from '@/lib/solana';
import { ipfsUtils } from '@/lib/ipfs';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (recipientAddress: string, amount: number) => Promise<void>;
  balance: number;
}

function SendModal({ isOpen, onClose, onSend, balance }: SendModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');

    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }

    try {
      setIsSending(true);
      await onSend(recipient, amountNum);
      setRecipient('');
      setAmount('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-white/20 text-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Withdraw SOL</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-white">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="Enter Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Amount (SOL)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              <button
                onClick={() => setAmount(Math.max(0, balance - 0.01).toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-cyan-400 hover:text-cyan-300"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-400">Available: {balance.toFixed(4)} SOL</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isSending ? 'Sending...' : 'Withdraw'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DepositModal({ isOpen, onClose, address }: { isOpen: boolean; onClose: () => void; address: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-white/20 text-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Deposit SOL</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`}
              alt="Wallet QR Code"
              className="w-full h-auto"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Your Wallet Address</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={address}
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
              />
              <Button
                onClick={copyAddress}
                size="sm"
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            <p className="font-semibold mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only send SOL to this address</li>
              <li>Network: {SOLANA_NETWORK === 'devnet' ? 'Devnet' : 'Mainnet'}</li>
            </ul>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, wallet, onLogout }: any) {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [exportWarningShown, setExportWarningShown] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Security Settings</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Security Section */}
          <div className="space-y-4">

            {!exportWarningShown ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <p className="font-semibold mb-2 flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Security Warning</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Never share your private key with anyone</li>
                    <li>Privy wallets use social recovery</li>
                  </ul>
                </div>
                <Button
                  onClick={() => setExportWarningShown(true)}
                  variant="outline"
                  className="w-full border-white/10 text-white hover:bg-white/5"
                >
                  View Security Options
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <Label className="text-white mb-2 block">Wallet Type</Label>
                  <p className="text-sm text-gray-400">
                    {wallet?.walletClientType === 'privy' ? 'Privy Embedded Wallet' : 'External Wallet'}
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white">Private Key Export</Label>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {showPrivateKey && (
                    <div className="p-3 bg-black/50 rounded font-mono text-xs text-white break-all">
                      {wallet?.walletClientType === 'privy'
                        ? 'Private key export not available for Privy embedded wallets.'
                        : 'Private key managed by your wallet provider'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Logout
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WalletPage() {
  const { primaryWallet, logout, login, user: contextUser } = useWallet();
  const { solPrice, isLoading: isPriceLoading } = useSolPrice();
  const { wallets } = useWallets(); // External wallets
  const { wallets: standardWallets } = useStandardWallets(); // Standard wallet interface (includes embedded)
  const { signAndSendTransaction } = useSignAndSendTransaction();

  // Privy fiat onramp hook
  const { fundWallet } = useFundWallet({
    onUserExited: ({ balance }) => {
      // Refresh balance after funding
      if (balance) {
        const balanceInSOL = Number(balance) / 1_000_000_000; // Convert lamports to SOL
        setSolBalance(balanceInSOL);
      }
    },
  });

  // State
  const [solBalance, setSolBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  // Fetch user profile
  const { data: profileData, mutate: mutateProfile } = useSWR(
    primaryWallet?.address ? `/api/profile/${primaryWallet.address}` : null,
    fetcher,
    { refreshInterval: 0 }
  );

  // Fetch user positions
  const { data: positionsData, isLoading: positionsLoading } = useSWR(
    primaryWallet?.address ? `/api/user/${primaryWallet.address}/positions` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Debug: Log positions data
  useEffect(() => {
    if (positionsData) {
      console.log('[Wallet Page] Positions API Response:', positionsData);
      console.log('[Wallet Page] Success:', positionsData.success);
      console.log('[Wallet Page] Total Positions:', positionsData.data?.all?.length || 0);
      console.log('[Wallet Page] Active:', positionsData.data?.active?.length || 0);
      console.log('[Wallet Page] Claimable:', positionsData.data?.claimable?.length || 0);
    }
  }, [positionsData]);

  // Fetch SOL balance
  useEffect(() => {
    if (!primaryWallet?.address || primaryWallet.chainType !== 'solana') {
      setSolBalance(0);
      return;
    }

    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const publicKey = new PublicKey(primaryWallet.address);
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Failed to fetch SOL balance:', error);
        setSolBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [primaryWallet?.address, primaryWallet?.chainType]);

  // Load profile data
  useEffect(() => {
    if (profileData?.success && profileData.data) {
      // Handle Privy email format (can be string or object with 'address' field)
      const emailString = typeof contextUser?.email === 'string'
        ? contextUser.email
        : (contextUser?.email as any)?.address;
      setUsername(profileData.data.username || (emailString ? emailString.split('@')[0] : '') || '');
      setProfilePhotoUrl(profileData.data.profilePhotoUrl || '');
    } else if (contextUser?.email) {
      // Handle Privy email format (can be string or object with 'address' field)
      const emailString = typeof contextUser.email === 'string'
        ? contextUser.email
        : (contextUser.email as any)?.address;
      setUsername(emailString ? emailString.split('@')[0] : '');
    }
  }, [profileData, contextUser]);

  const handleUsernameChange = async (newUsername: string) => {
    if (!newUsername.trim() || !primaryWallet) return;

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: primaryWallet.address,
          username: newUsername.trim(),
          email: contextUser?.email,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setUsername(newUsername.trim());
        mutateProfile();
      }
    } catch (error) {
      console.error('Error saving username:', error);
    }
  };

  const handlePhotoUpload = async () => {
    if (!primaryWallet) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;

      try {
        setIsUploadingPhoto(true);
        const ipfsUri = await ipfsUtils.uploadImage(file);
        const photoUrl = ipfsUtils.getGatewayUrl(ipfsUri);

        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: primaryWallet.address,
            profilePhotoUrl: photoUrl,
            email: contextUser?.email,
          }),
        });

        const result = await response.json();
        if (result.success) {
          setProfilePhotoUrl(photoUrl);
          mutateProfile();
        }
      } catch (error: any) {
        console.error('Error uploading photo:', error);
      } finally {
        setIsUploadingPhoto(false);
      }
    };

    input.click();
  };

  const handleSend = async (recipientAddress: string, amount: number) => {
    if (!primaryWallet) throw new Error('No wallet connected');

    const connection = await getSolanaConnection();
    const fromPubkey = new PublicKey(primaryWallet.address);
    const toPubkey = new PublicKey(recipientAddress);

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create VersionedTransaction using TransactionMessage
    const messageV0 = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Get Solana wallet - prioritize external wallets, fallback to standard wallets (embedded)
    let solanaWallet;

    if (wallets && wallets.length > 0) {
      console.log('Using external Solana wallet');
      solanaWallet = wallets[0];
    } else if (standardWallets && standardWallets.length > 0) {
      console.log('Using embedded Solana wallet');
      const privyWallet = standardWallets.find((w: any) => w.isPrivyWallet || w.name === 'Privy');
      if (!privyWallet) {
        throw new Error('No Privy wallet found');
      }
      solanaWallet = privyWallet;
    } else {
      throw new Error('No Solana wallet found');
    }

    // Serialize transaction to buffer
    const txBuffer = Buffer.from(transaction.serialize());

    // Use signAndSendTransaction - works for both external and embedded wallets
    const result = await signAndSendTransaction({
      transaction: txBuffer,
      wallet: solanaWallet as any,
      chain: SOLANA_NETWORK === 'devnet' ? 'solana:devnet' : 'solana:mainnet',
    });

    // Extract signature from result and convert to base58 (Solana standard format)
    const signature = bs58.encode(result.signature);
    console.log('✅ Transaction signed and sent:', signature);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    // Update balance
    const balance = await connection.getBalance(fromPubkey);
    setSolBalance(balance / LAMPORTS_PER_SOL);
  };

  const handleRefresh = async () => {
    setBalanceLoading(true);
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const publicKey = new PublicKey(primaryWallet!.address);
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleBuySol = async () => {
    if (!primaryWallet?.address) return;

    try {
      await fundWallet({
        address: primaryWallet.address,
        chain: {
          type: 'solana',
          id: SOLANA_NETWORK === 'devnet' ? 'solana:devnet' : 'solana:mainnet',
        },
      });
    } catch (error) {
      console.error('Error opening buy SOL modal:', error);
    }
  };

  const copyAddress = () => {
    if (!primaryWallet?.address) return;
    navigator.clipboard.writeText(primaryWallet.address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  if (!primaryWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Card className="bg-white/5 border-white/10 text-white w-full max-w-md">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <Wallet className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-cyan-400" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Connect Solana Wallet</h2>
              <p className="text-sm sm:text-base text-gray-400 mb-2">
                This platform requires a Solana wallet to access features.
              </p>
            </div>
            <button
              onClick={() => login()}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all text-sm sm:text-base"
            >
              Connect Solana Wallet
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usdValue = solPrice ? (solBalance * solPrice).toFixed(2) : '...';

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Profile & Balance Section */}
      <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
        {/* Balance Display */}
        <div className="text-center mb-6 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">
            ${isPriceLoading ? '...' : usdValue}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            {balanceLoading ? '...' : solBalance.toFixed(4)} SOL
            {solPrice && !isPriceLoading && (
              <span className="text-xs sm:text-sm text-gray-500 ml-2">
                @ ${solPrice.toFixed(2)}
              </span>
            )}
          </p>
          <button
            onClick={copyAddress}
            className="text-xs text-gray-500 mt-2 hover:text-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1 break-all max-w-full px-2"
          >
            <span className="truncate">
              {primaryWallet.address.slice(0, 8)}...{primaryWallet.address.slice(-6)}
            </span>
            {addressCopied ? (
              <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <Copy className="w-3 h-3 flex-shrink-0" />
            )}
          </button>
          {addressCopied && (
            <p className="text-xs text-green-400 mt-1">Copied!</p>
          )}
        </div>

        {/* Profile Photo + Username Input + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
          {/* Profile Photo + Username - Always together */}
          <div className="flex items-center gap-2">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden ring-2 ring-white/20">
                {isUploadingPhoto ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-white" />
                )}
              </div>
              <button
                onClick={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-lg disabled:opacity-50"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>

            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => handleUsernameChange(username)}
              className="bg-white/5 border-white/10 text-white font-medium w-32 sm:w-40 h-9"
              placeholder="username"
            />
          </div>

          {/* Action Buttons - Wrap on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={balanceLoading}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${balanceLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={handleBuySol}
              variant="outline"
              size="sm"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
            >
              <ShoppingCart className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Buy SOL</span>
            </Button>
            <Button
              onClick={() => setShowDepositModal(true)}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Deposit</span>
            </Button>
            <Button
              onClick={() => setShowSendModal(true)}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Send className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Withdraw</span>
            </Button>
            <Button
              onClick={() => setShowSettingsModal(true)}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
            </Button>
          </div>
        </div>

        {/* Follower/Following Stats */}
        {profileData?.success && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <a href={`/profile/${primaryWallet.address}/followers`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-xl font-bold text-white">{profileData.data.followerCount || 0}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </a>
            <a href={`/profile/${primaryWallet.address}/following`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-xl font-bold text-white">{profileData.data.followingCount || 0}</div>
              <div className="text-xs text-gray-400">Following</div>
            </a>
          </div>
        )}
      </div>

      {/* Tokens List */}
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center p-2">
                  <img
                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                    alt="Solana"
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Solana</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">${isPriceLoading ? '...' : usdValue}</p>
                <p className="text-gray-400 text-sm">{solBalance.toFixed(4)} SOL</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Predictions Section */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-white px-2 sm:px-0">Your Predictions</h3>

          {positionsLoading ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center text-gray-400 py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading your predictions...</p>
                </div>
              </CardContent>
            </Card>
          ) : positionsData?.success && positionsData.data?.all?.length > 0 ? (
            <>
              {/* Active Positions */}
              {positionsData.data.active.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-400">Active Positions</h4>
                  {positionsData.data.active.map((position: any) => (
                    <Card key={position.marketId} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <a href={`/market/${position.marketId}`} className="hover:text-cyan-400 transition-colors">
                              <h4 className="text-white font-semibold mb-1 truncate">{position.marketName}</h4>
                            </a>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                              <span className={`px-2 py-0.5 rounded whitespace-nowrap ${
                                position.voteType === 'yes'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {position.voteType.toUpperCase()}
                              </span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {position.totalAmount.toFixed(4)} SOL
                              </span>
                              <span className="text-gray-500 hidden sm:inline">•</span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {position.tradeCount} {position.tradeCount === 1 ? 'trade' : 'trades'}
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <p className="text-white font-semibold">
                              {position.voteType === 'yes' ? position.currentYesPrice.toFixed(1) : position.currentNoPrice.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">Current Price</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Claimable Positions */}
              {positionsData.data.claimable.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-medium text-gray-400">Claimable Rewards</h4>
                  {positionsData.data.claimable.map((position: any) => (
                    <Card key={position.marketId} className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <a href={`/market/${position.marketId}`} className="hover:text-cyan-400 transition-colors">
                              <h4 className="text-white font-semibold mb-1 truncate">{position.marketName}</h4>
                            </a>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 whitespace-nowrap">
                                WON - {position.voteType.toUpperCase()}
                              </span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {position.totalAmount.toFixed(4)} SOL staked
                              </span>
                            </div>
                          </div>
                          <a
                            href={`/market/${position.marketId}`}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg text-white font-semibold transition-all text-center sm:text-left flex-shrink-0"
                          >
                            Claim
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Resolved but not claimable positions */}
              {positionsData.data.resolved.filter((p: any) => !p.canClaim).length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-medium text-gray-400">Resolved Positions</h4>
                  {positionsData.data.resolved.filter((p: any) => !p.canClaim).map((position: any) => (
                    <Card key={position.marketId} className="bg-white/5 border-white/10 opacity-60">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <a href={`/market/${position.marketId}`} className="hover:text-cyan-400 transition-colors">
                              <h4 className="text-white font-semibold mb-1 truncate">{position.marketName}</h4>
                            </a>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 whitespace-nowrap">
                                LOST - {position.voteType.toUpperCase()}
                              </span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {position.totalAmount.toFixed(4)} SOL
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">No active predictions yet</p>
                  <p className="text-xs mt-2">Start voting on markets to see them here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSend}
        balance={solBalance}
      />
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        address={primaryWallet.address}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        wallet={(primaryWallet as any)._privyWallet}
        onLogout={logout}
      />
    </div>
  );
}
