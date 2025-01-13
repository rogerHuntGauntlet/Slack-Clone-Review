'use client'

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { checkUserAccess } from '@/utils/checkAccess';

interface SessionCookie {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    refresh_token: string;
    user: { id: string };
}

export default function AccessPage() {
    const [code, setCode] = useState('');
    const [riddleAnswer, setRiddleAnswer] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [riddleTermsAccepted, setRiddleTermsAccepted] = useState(false);
    const [remainingCodes, setRemainingCodes] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [riddleLoading, setRiddleLoading] = useState(false);
    const [sessionCookie, setSessionCookie] = useState<SessionCookie | null>(null);
    const [currentRiddle, setCurrentRiddle] = useState<{ riddle: string; answer: string } | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(5);
    const [canAnswer, setCanAnswer] = useState<boolean>(true);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const supabase = createClientComponentClient();
    const router = useRouter();

    const fetchNewRiddle = async () => {
        try {
            setRiddleLoading(true);
            const response = await fetch('https://riddles-api.vercel.app/random');
            const data = await response.json();
            if (data && data.riddle) {
                setCurrentRiddle(data);
                setTimeRemaining(5);
                setCanAnswer(true);
                setRiddleAnswer('');
            }
        } catch (error) {
            console.error('Error fetching riddle:', error);
            setError('Failed to fetch riddle');
        } finally {
            setRiddleLoading(false);
        }
    };

    // Timer effect
    useEffect(() => {
        if (!currentRiddle || timeRemaining === 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    setCanAnswer(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentRiddle, timeRemaining]);

    // Initial riddle fetch - only once after auth check
    useEffect(() => {
        if (!loading && !currentRiddle && !riddleLoading) {
            fetchNewRiddle();
        }
    }, [loading]);

    useEffect(() => {
        const checkAuth = async () => {
            // First check for cookie
            const cookieStr = await sessionStorage.getItem('cookie');
            if (cookieStr) {
                const parsedCookie = JSON.parse(cookieStr);
                setSessionCookie(parsedCookie);
                console.log("Found session cookie:", parsedCookie);
            }

            // Then check Supabase session
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (authError) {
                console.error('Auth error:', authError);
                if (!cookieStr) {
                    router.push('/');
                    return;
                }
            }

            // If we have neither a session nor a cookie, redirect
            if (!session && !cookieStr) {
                console.log('No session or cookie found');
                router.push('/');
                return;
            }

            // Check if user already has access
            const userId = session?.user?.id || JSON.parse(cookieStr!)?.user?.id;
            const hasAccess = await checkUserAccess(userId);
            if (hasAccess) {
                console.log('User already has access, redirecting to onboarding');
                router.push('/onboarding');
                return;
            }


            setLoading(false);
        };

        checkAuth();
    }, [router, supabase]);

    useEffect(() => {
        const fetchRemainingCodes = async () => {
            const { data, error } = await supabase
                .from('founder_code_count')
                .select('total_used, max_allowed')
                .single();

            if (error) {
                console.error('Error fetching remaining codes:', error);
                return;
            }

            if (!error && data) {
                setRemainingCodes(data.max_allowed - data.total_used);
            }
        };

        fetchRemainingCodes();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('Submitting request with:', { code, riddleAnswer, termsAccepted, riddleTermsAccepted });

        try {
            // Get the current session token
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const cookieStr = await sessionStorage.getItem('cookie');
            
            let token = currentSession?.access_token;
            if (!token && cookieStr) {
                const cookieData = JSON.parse(cookieStr);
                token = cookieData.access_token;
            }

            if (!token) {
                setError('No valid session found');
                setLoading(false);
                return;
            }

            // If it's a riddle submission, verify locally first
            if (riddleAnswer && currentRiddle) {
                const normalizedAnswer = riddleAnswer.toLowerCase().trim();
                const normalizedCorrect = currentRiddle.answer.toLowerCase().trim();
                
                if (normalizedAnswer !== normalizedCorrect) {
                    setError('Incorrect answer. Try again!');
                    setLoading(false);
                    return;
                }
            }

            const response = await fetch('/api/access/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code,
                    riddleAnswer: riddleAnswer || undefined,
                    termsAccepted: code ? termsAccepted : riddleTermsAccepted,
                }),
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok) {
                console.log('✅ Access granted, redirecting to onboarding');
                router.push('/onboarding');
            } else {
                console.log('Submit error:', data);
                setError(data.error || 'An error occurred');
                if (riddleAnswer) {
                    fetchNewRiddle(); // Get a new riddle if the current one failed
                }
            }

        } catch (error) {
            console.log('Submit error:', error);
            setError('An error occurred while submitting the form');
        }

        setLoading(false);
    };

    const handlePayment = async () => {
        try {
            setPaymentLoading(true);
            setError('');

            // Get the current session token
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const cookieStr = await sessionStorage.getItem('cookie');
            
            let token = currentSession?.access_token;
            if (!token && cookieStr) {
                const cookieData = JSON.parse(cookieStr);
                token = cookieData.access_token;
            }

            if (!token) {
                setError('No valid session found');
                return;
            }

            const response = await fetch('/api/create-stripe-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: currentSession?.user?.id || JSON.parse(cookieStr!)?.user?.id,
                    email: currentSession?.user?.email || JSON.parse(cookieStr!)?.user?.email
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const { sessionUrl } = await response.json();
            window.location.href = sessionUrl;
        } catch (error) {
            console.error('Payment error:', error);
            setError(error instanceof Error ? error.message : 'Failed to process payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
                <div className="max-w-4xl mx-auto pt-20 px-4">
                    <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Loading...
                    </h1>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
            <div className="max-w-4xl mx-auto pt-20">
                <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    Choose Your Path
                </h1>

                <div className="grid md:grid-cols-3 gap-8 mt-12">
                    {/* Founder Code Option */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Founder Code</h2>
                        <p className="text-gray-400 mb-4">
                            Enter any code to claim one of the {remainingCodes !== null ? remainingCodes : '...'} remaining founder spots.
                        </p>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter code"
                            className="w-full p-2 mb-4 bg-gray-700 rounded-lg border border-gray-600 text-white"
                        />
                        <div className="mb-4">
                            <label className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-gray-300">
                                    I agree that creating multiple accounts to claim multiple founder codes will result in all my accounts being banned
                                </span>
                            </label>
                        </div>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (!code) return;
                                handleSubmit(e);
                            }}
                            disabled={loading || !code || !termsAccepted || remainingCodes === 0}
                            className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : remainingCodes === 0 ? 'All Claimed' : 'Submit Code'}
                        </button>
                    </div>

                    {/* Riddle Option */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Solve the Riddle</h2>
                        <div className="mb-4">
                            {currentRiddle && !riddleLoading ? (
                                <>
                                    <div className="text-center mb-4">
                                        <div className="text-4xl font-bold text-blue-400 mb-2">{timeRemaining}</div>
                                        <p className="text-gray-400">Seconds remaining to answer</p>
                                    </div>
                                    <p className="text-gray-400 mb-4">{currentRiddle.riddle}</p>
                                    <input
                                        type="text"
                                        value={riddleAnswer}
                                        onChange={(e) => setRiddleAnswer(e.target.value)}
                                        placeholder="Quick! Type your answer..."
                                        className="w-full p-2 mb-4 bg-gray-700 rounded-lg border border-gray-600 text-white"
                                        disabled={!canAnswer}
                                    />
                                    <div className="mb-4">
                                        <label className="flex items-center space-x-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={riddleTermsAccepted}
                                                onChange={(e) => setRiddleTermsAccepted(e.target.checked)}
                                                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-300">
                                                I agree to use this access method fairly and not share answers with others
                                            </span>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!riddleAnswer || !riddleTermsAccepted) return;
                                                handleSubmit(e);
                                            }}
                                            disabled={loading || !riddleAnswer || !riddleTermsAccepted || !canAnswer}
                                            className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Checking...' : 'Submit Answer'}
                                        </button>
                                        <button
                                            onClick={() => fetchNewRiddle()}
                                            disabled={riddleLoading || canAnswer}
                                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                                        >
                                            New Riddle
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>{riddleLoading ? 'Loading riddle...' : 'Failed to load riddle. Please try again.'}</p>
                                    {!riddleLoading && (
                                        <button
                                            onClick={() => fetchNewRiddle()}
                                            disabled={riddleLoading}
                                            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Option */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Premium Access</h2>
                        <p className="text-gray-400 mb-4">Get immediate access with a one-time payment.</p>
                        <div className="text-3xl font-bold text-center mb-4">$1,000</div>
                        <button
                            onClick={handlePayment}
                            disabled={paymentLoading}
                            className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {paymentLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                'Purchase Access'
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-900/30 border-l-4 border-red-500 text-red-300 rounded">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
} 