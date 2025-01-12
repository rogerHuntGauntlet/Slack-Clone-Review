'use client'

import { FC } from 'react';
import { Check } from 'lucide-react';

interface PricingPlan {
  name: string;
  price: number;
  interval: string;
  priceId: string;
  features: string[];
  description: string;
  highlighted?: boolean;
}

interface PricingCardProps {
  plan: PricingPlan;
  userId?: string;
}

const PricingCard: FC<PricingCardProps> = ({ plan, userId }) => {
  const handleSubscribe = async () => {
    if (!userId) {
      // Redirect to sign in if not authenticated
      window.location.href = '/auth';
      return;
    }

    if (plan.priceId === 'free') {
      // Handle free plan subscription
      window.location.href = '/platform';
      return;
    }

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          priceId: plan.priceId,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div
      className={`relative rounded-2xl p-0.5 ${
        plan.highlighted
          ? 'bg-gradient-to-b from-blue-500 to-purple-600'
          : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <div className="h-full rounded-2xl bg-white dark:bg-gray-800 p-6">
        {plan.highlighted && (
          <div className="absolute -top-5 left-0 right-0 flex justify-center">
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          </div>
        )}

        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{plan.description}</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
            <span className="text-gray-500 dark:text-gray-400">/{plan.interval}</span>
          </div>
        </div>

        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <Check size={20} className="text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            plan.highlighted
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
        </button>
      </div>
    </div>
  );
};

export default PricingCard; 