import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function checkUserAccess(userId: string): Promise<boolean> {
  const supabase = createClientComponentClient();

  try {
    // Check founder codes
    const { data: founderCodes } = await supabase
      .from('founder_codes')
      .select('*')
      .eq('user_id', userId);

    if (founderCodes && founderCodes.length > 0) {
      return true;
    }

    // Check payment records
    const { data: paymentRecords } = await supabase
      .from('payment_records')
      .select('*')
      .eq('user_id', userId);

    if (paymentRecords && paymentRecords.length > 0) {
      return true;
    }

    // Check riddle completions
    const { data: riddleCompletions } = await supabase
      .from('riddle_completions')
      .select('*')
      .eq('user_id', userId);

    if (riddleCompletions && riddleCompletions.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
} 