'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function HordePage() {
  const [accounts, setAccounts] = useState<Array<{username: string, user_id: string}>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/twitter/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch('/api/twitter/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      const data = await response.json();
      if (data.success) {
        // Clear URL parameters
        window.history.replaceState({}, '', '/horde');
        // Refresh accounts list
        fetchAccounts();
      } else {
        console.error('Twitter auth error:', data.error);
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twitter/connect', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting Twitter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (userId: string) => {
    try {
      await fetch('/api/twitter/accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error disconnecting account:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Join X Horde</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-gray-500">No accounts connected yet</p>
          ) : (
            <ul className="space-y-4">
              {accounts.map((account) => (
                <li key={account.user_id} className="flex items-center justify-between">
                  <span className="font-medium">@{account.username}</span>
                  <Button
                    variant="destructive"
                    onClick={() => handleDisconnect(account.user_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                  >
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Connect New Account</h2>
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Twitter Account'}
          </Button>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Connect your Twitter account to join the X Horde</li>
            <li>Our AI will generate tweets about GauntletAI.com</li>
            <li>Your account will automatically like and retweet posts from other horde members</li>
            <li>Grow your Twitter following while supporting the community</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
