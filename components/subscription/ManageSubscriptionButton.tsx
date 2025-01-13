'use client';

import { useState } from 'react';

interface ManageSubscriptionButtonProps {
    userId: string;
    className?: string;
    children?: React.ReactNode;
}

export default function ManageSubscriptionButton({ 
    userId,
    className = '',
    children = 'Manage Subscription'
}: ManageSubscriptionButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handlePortalAccess = async () => {
        try {
            setIsLoading(true);

            const response = await fetch('/api/stripe/create-portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const { url } = await response.json();

            if (!response.ok) {
                throw new Error('Failed to create portal session');
            }

            window.location.href = url;
        } catch (error) {
            console.error('Error accessing billing portal:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handlePortalAccess}
            disabled={isLoading}
            className={`${className} disabled:opacity-50`}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
} 