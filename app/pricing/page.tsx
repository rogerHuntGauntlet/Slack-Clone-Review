import { FC } from 'react';
import { Check } from 'lucide-react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import PricingCard from '../../components/pricing/PricingCard';

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
        name: 'Basic',
        price: 0,
        interval: 'month',
        priceId: 'free',
        description: 'For individuals just getting started',
        features: [
            'Access to basic features',
            'Limited message history',
            'Basic support',
            'Single workspace',
        ],
    },
    {
        name: 'Pro',
        price: 10,
        interval: 'month',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
        description: 'For professionals and small teams',
        features: [
            'All Basic features',
            'Unlimited message history',
            'Priority support',
            'Multiple workspaces',
            'Advanced integrations',
            'Custom branding',
        ],
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: 49,
        interval: 'month',
        priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID!,
        description: 'For large organizations',
        features: [
            'All Pro features',
            'Enterprise SSO',
            'Advanced security',
            'Custom contracts',
            'Dedicated support',
            'SLA guarantees',
            'Custom features',
        ],
    },
];

const PricingPage: FC = async () => {
    const supabase = createServerComponentClient({ cookies });
    let session;
    const { data: { session: supabaseSession } } = await supabase.auth.getSession();
    session = supabaseSession;

    if (!session) {
        console.log("no session found, checking for cookie: ")
        try {
            session = JSON.parse(sessionStorage.getItem('cookie') || '{}');
            console.log("session from cookie: ", session)

        } catch (err) {
            throw new Error('No session latofrm 122 catch error: ' + err);
        }

    }
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Get started with our flexible pricing options. Choose the plan that best fits your needs.
                        All plans include our core features with varying levels of access and support.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
                        Need a custom plan? {' '}
                        <a href="mailto:sales@example.com" className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
                            Contact our sales team
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage; 