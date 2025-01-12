import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkPaymentStatus(userId: string) {
  // Check for any active access record (payment, riddle, or founder code)
  const { data: accessRecord, error: accessError } = await supabase
    .from('access_records')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (accessError) {
    console.error('Error checking access status:', accessError);
    return { isActive: false, shouldRedirect: true };
  }

  // If access record exists and is active
  if (accessRecord) {
    // For riddle and founder code, access is permanent
    if (accessRecord.access_type === 'riddle' || accessRecord.access_type === 'founder_code') {
      return { 
        isActive: true, 
        shouldRedirect: false,
        plan: 'premium' 
      };
    }
  }

  // Check for active subscription
  const { data: paymentRecord, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error checking payment status:', error);
    return { isActive: false, shouldRedirect: true };
  }

  // If no payment record exists or subscription is not active
  if (!paymentRecord) {
    return { isActive: false, shouldRedirect: true };
  }

  // Check if subscription is expired
  const currentPeriodEnd = new Date(paymentRecord.current_period_end);
  const now = new Date();

  if (currentPeriodEnd < now) {
    return { isActive: false, shouldRedirect: true };
  }

  return { 
    isActive: true, 
    shouldRedirect: false,
    plan: paymentRecord.plan_type 
  };
} 