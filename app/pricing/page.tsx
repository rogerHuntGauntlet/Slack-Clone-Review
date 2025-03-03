import { FC } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import PricingCard from '../../components/pricing/PricingCard';
import SessionHandler from '../../components/pricing/SessionHandler';

interface PricingPlan {
    name: string;
    price: number;
    interval: string;
    priceId: string;
    features: string[];
    description: string;
    highlighted?: boolean;
}

const pricingPlans: PricingPlan[] = [
    {
        name: 'Lifetime Access',
        price: 1000,
        interval: 'one-time',
        priceId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID!,
        description: 'Full lifetime access to all features',
        features: [
            'Unlimited message history',
            'Priority support',
            'Multiple workspaces',
            'Advanced integrations',
            'Custom branding',
            'Lifetime updates',
            'No recurring fees',
            'All future features included',
        ],
        highlighted: true,
    },
];

const PricingPage: FC = async () => {
    const supabase = createClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {session && <SessionHandler session={session} />}
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
                        Lifetime Access
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Get unlimited lifetime access to all features with a one-time payment.
                    </p>
                </div>

                <div className="max-w-lg mx-auto">
                    {pricingPlans.map((plan) => (
                        <PricingCard
                            key={plan.name}
                            plan={plan}
                            userId={session?.user?.id}
                        />
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Questions about the platform? {' '}
                        <a href="mailto:support@example.com" className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
                            Contact our team
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage; 