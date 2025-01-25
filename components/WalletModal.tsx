'use client'

import React, { useEffect, useState } from 'react'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { motion, AnimatePresence } from 'framer-motion'
import { FaWallet } from 'react-icons/fa'
import { supabase } from '@/lib/supabase'

// Helper to ensure window is defined
const getProvider = () => {
  if (typeof window !== 'undefined') {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.solana;

      if (provider?.isPhantom) {
        return provider;
      }
    }
    // If Phantom is not found, return a specific error
    throw new Error('phantom-not-installed');
  }
  return null;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [hasPhantom, setHasPhantom] = useState(false)
  const [showPhantomLink, setShowPhantomLink] = useState(false)

  const requiredBalance = Number(process.env.NEXT_PUBLIC_TOKEN_REQUIRED_BALANCE) || 0
  const tokenDecimals = Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS) || 9
  const tokenSymbol = process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'SOL'
  const tokenMintAddress = process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS

  useEffect(() => {
    const checkPhantom = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const provider = getProvider();
        setHasPhantom(!!provider);
      } catch (e) {
        setHasPhantom(false);
      }
    };
    if (isOpen) {
      checkPhantom();
    }
  }, [isOpen]);

  const getTokenAccounts = async (wallet: PublicKey, solanaConnection: Connection) => {
    const filters = [
      { dataSize: 165 },
      { memcmp: { offset: 32, bytes: wallet.toBase58() } },
    ];

    try {
      return await solanaConnection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, { filters });
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return [];
    }
  };

  const connectWallet = async () => {
    try {
      setConnecting(true)
      setError(null)

      const provider = getProvider();
      if (!provider) {
        setError('Phantom wallet is not installed');
        setShowPhantomLink(true);
        return;
      }

      // Try to connect to wallet
      let response;
      try {
        // Check if already connected
        const resp = await provider.connect({ onlyIfTrusted: true });
        if (resp?.publicKey) {
          response = resp;
        }
      } catch (e) {
        // Not already connected, request new connection
        try {
          response = await provider.connect();
        } catch (err: any) {
          if (err.code === 4001) {
            throw new Error('Please approve the connection request in your wallet')
          }
          if (err.message?.includes('Already processing')) {
            throw new Error('A connection request is already in progress. Please check your Phantom wallet')
          }
          throw new Error('Failed to connect to Phantom wallet. Please try again')
        }
      }

      if (!response?.publicKey) {
        throw new Error('Failed to get public key from wallet')
      }

      const publicKey = new PublicKey(response.publicKey.toString())

      // Get SOL balance
      const rpcUrl = "https://solana-mainnet.core.chainstack.com/f54f73a5744e86405ae7fc4655cdaed4";
      if (!rpcUrl) {
        throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL is not configured');
      }
      const connection = new Connection(
        'https://solana-mainnet.core.chainstack.com/f54f73a5744e86405ae7fc4655cdaed4',
        {
          httpHeaders: {
            'Authorization': 'Bearer f54f73a5744e86405ae7fc4655cdaed4'
          },
          commitment: 'confirmed'
        }
      );
      
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceDisplay = (solBalance / LAMPORTS_PER_SOL).toFixed(4);
      let balanceDisplay = `${solBalanceDisplay} SOL`;

      // Try to get token balance if mint address is provided
      if (tokenMintAddress) {
        try {
          const tokens = await getTokenAccounts(publicKey, connection);
          const filteredTokens = tokens
            .filter((i: any) => i.account.data.parsed.info.mint === tokenMintAddress)
            .map((i: any) => i.account.data.parsed.info.tokenAmount.uiAmount);

          const userBalance = filteredTokens.length > 0 ? filteredTokens[0] : 0;
          balanceDisplay += ` | ${userBalance.toFixed(4)} ${tokenSymbol}`;

          // Check if token balance meets requirement
          if (requiredBalance > 0) {
            if (userBalance < requiredBalance / Math.pow(10, tokenDecimals)) {
              throw new Error(`Insufficient ${tokenSymbol} balance. Required: ${(requiredBalance / Math.pow(10, tokenDecimals)).toFixed(4)} ${tokenSymbol}`)
            }
          }
        } catch (err) {
          console.error('Failed to get token balance:', err);
          balanceDisplay += ` | Unable to fetch ${tokenSymbol}`;
        }
      }

      setBalance(balanceDisplay);

      // Create user profile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw new Error('Failed to get user session. Please try again')
      }

      if (!session?.user) {
        throw new Error('No active session. Please sign in first')
      }

      try {
        await supabase.from('user_profiles').upsert({
          id: session.user.id,
          wallet_address: publicKey.toString(),
          status: 'online'
        })
        onSuccess?.();
        onClose();
      } catch (err) {
        throw new Error('Failed to update user profile. Please try again')
      }

    } catch (err: any) {
      console.error('Wallet connection error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setConnecting(false)
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Phantom wallet to access the platform
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-sm">
                  {error}
                  {showPhantomLink && (
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 ml-1 underline"
                    >
                      Install Phantom Wallet
                    </a>
                  )}
                </p>
              </div>
            )}

            {!hasPhantom ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">
                  Phantom wallet is not installed. Please install it to continue.
                </p>
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-600"
                >
                  Download Phantom Wallet
                </a>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaWallet className="h-5 w-5" />
                    Connect Phantom Wallet
                  </>
                )}
              </button>
            )}

            {balance && (
              <div className="mt-4 text-center text-sm text-gray-400">
                Balance: {balance}
                {tokenMintAddress && (
                  <div className="mt-2">
                    <a
                      href={`https://pump.fun/coin/${tokenMintAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Buy more {tokenSymbol}
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
