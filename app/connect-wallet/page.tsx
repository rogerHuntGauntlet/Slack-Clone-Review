'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

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

// Use configured RPC endpoint with fallbacks
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
const WS_URL = process.env.NEXT_PUBLIC_SOLANA_WS_URL;

if (!RPC_URL) {
  console.error('NEXT_PUBLIC_SOLANA_RPC_URL is not defined');
}

// Use GenesysGo's public RPC as fallback
const FALLBACK_RPC_ENDPOINTS = [
  'https://ssc-dao.genesysgo.net',
  'https://api.devnet.solana.com',  // Devnet as last resort
];

export default function ConnectWallet() {
  const router = useRouter()
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
      // Wait for window to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      const provider = getProvider();
      setHasPhantom(!!provider);
    };
    checkPhantom();
  }, []);

  const tryConnection = async (endpoint: string) => {
    console.log('Trying connection to:', endpoint);
    
    if (!endpoint.startsWith('http')) {
      console.error('Invalid endpoint URL:', endpoint);
      throw new Error('Invalid RPC endpoint URL');
    }

    const connectionConfig: any = {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    };

    // Add custom fetch for Chainstack endpoint
    if (endpoint === RPC_URL) {
      connectionConfig.fetch = (url: string, options: any) => {
        const finalOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
          },
        };
        return fetch(url, finalOptions);
      };
      connectionConfig.wsEndpoint = WS_URL;
    }

    const connection = new Connection(endpoint, connectionConfig);
    
    try {
      console.log('Getting latest blockhash from:', endpoint);
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      console.log('Successfully connected to', endpoint, 'blockhash:', blockhash);
      return connection;
    } catch (e) {
      console.error('Failed to connect to', endpoint, e);
      throw e;
    }
  };

  const getWorkingConnection = async () => {
    let lastError: Error | null = null;

    // Try Chainstack endpoint first if available
    if (RPC_URL) {
      try {
        const connection = await tryConnection(RPC_URL);
        return connection;
      } catch (e) {
        console.warn('Failed to connect to Chainstack RPC, trying fallbacks');
        lastError = e instanceof Error ? e : new Error('Unknown error occurred');
      }
    }

    // Try each fallback endpoint until one works
    for (const endpoint of FALLBACK_RPC_ENDPOINTS) {
      try {
        const connection = await tryConnection(endpoint);
        return connection;
      } catch (e) {
        console.warn(`Failed to connect to ${endpoint}`, e);
        lastError = e instanceof Error ? e : new Error('Unknown error occurred');
        continue;
      }
    }
    throw new Error(`Unable to connect to Solana network: ${lastError?.message || 'All endpoints failed'}`);
  };

  const requestAirdrop = async (connection: Connection, publicKey: PublicKey) => {
    try {
      const signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      console.log('Airdrop successful');
      return true;
    } catch (e) {
      console.error('Airdrop failed:', e);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      setConnecting(true)
      setError(null)

      // Get provider with delay to ensure proper initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const provider = getProvider();
        if (!provider) {
          throw new Error('phantom-not-installed');
        }
      } catch (e: any) {
        if (e.message === 'phantom-not-installed') {
          setError('Phantom wallet is not installed. Click here to install: ');
          setShowPhantomLink(true);
          return;
        }
        throw e;
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

      // Get a working Solana connection
      const connection = await getWorkingConnection();

      // Get SOL balance first
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceDisplay = (solBalance / LAMPORTS_PER_SOL).toFixed(4);
      
      // Initialize user balance
      let userBalance = null;
      let balanceDisplay = `${solBalanceDisplay} SOL`;

      // Try to get token balance if mint address is provided
      if (tokenMintAddress) {
        try {
          const mint = new PublicKey(tokenMintAddress)
          const tokenAccounts = await connection.getTokenAccountsByOwner(
            publicKey,
            { mint }
          )
          
          if (tokenAccounts.value.length > 0) {
            const tokenBalance = await connection.getTokenAccountBalance(
              tokenAccounts.value[0].pubkey
            )
            userBalance = tokenBalance.value.uiAmount;
            balanceDisplay += ` | ${userBalance?.toFixed(4)} ${tokenSymbol}`;
          } else {
            balanceDisplay += ` | 0 ${tokenSymbol}`;
          }
        } catch (err) {
          console.error('Failed to get token balance:', err);
          balanceDisplay += ` | Unable to fetch ${tokenSymbol}`;
        }
      }

      setBalance(balanceDisplay);

      // Check if token balance meets requirement (if token is required)
      if (tokenMintAddress && requiredBalance > 0) {
        if (!userBalance) {
          throw new Error(`No ${tokenSymbol} tokens found in wallet. Required: ${(requiredBalance / Math.pow(10, tokenDecimals)).toFixed(4)} ${tokenSymbol}`)
        }
        if (userBalance < requiredBalance / Math.pow(10, tokenDecimals)) {
          throw new Error(`Insufficient ${tokenSymbol} balance. Required: ${(requiredBalance / Math.pow(10, tokenDecimals)).toFixed(4)} ${tokenSymbol}`)
        }
      }

      // Create user profile and redirect to platform
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
        router.push('/platform')
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 rounded-2xl bg-white/5 p-8 backdrop-blur-lg"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Connect Your Wallet</h2>
          <p className="mt-2 text-sm text-gray-400">
            Connect your Phantom wallet to access the platform
          </p>
        </div>

        {error && (
          <div className="text-red-500 mb-4">
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
          </div>
        )}

        {!hasPhantom && (
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
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 16L12 8M12 8L15 11M12 8L9 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download Phantom Wallet
            </a>
          </div>
        )}

        {hasPhantom && (
          <div className="mt-8">
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:bg-purple-500"
            >
              {connecting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 7V12L15 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Connect Phantom Wallet
                </>
              )}
            </button>
          </div>
        )}

        {balance !== null && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Balance: {balance}
            {tokenMintAddress && (
              <div className="mt-2">
                <a
                  href="https://pump.fun/coin/4KDMEPoyuQVcLs6n6GUpAPM7dhrmsQxYHmJ7uckwpump"
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
      </motion.div>
    </div>
  )
} 