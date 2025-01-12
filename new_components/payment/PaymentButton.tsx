"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface PaymentButtonProps {
  amount?: number;
  currency?: string;
  productId?: string;
  className?: string;
  children?: React.ReactNode;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount = 0,
  currency = 'USD',
  productId,
  className = '',
  children
}) => {
  const router = useRouter();

  const handlePayment = async () => {
    try {
      // Add payment logic here
      console.log('Processing payment:', { amount, currency, productId });
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <button
      onClick={handlePayment}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className}`}
    >
      {children || `Pay ${currency} ${amount}`}
    </button>
  );
};

export default PaymentButton; 