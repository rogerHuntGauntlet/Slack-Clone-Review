import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Input validation schema
const SummarySchema = z.object({
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  summary: z.string().min(1, 'Summary is required'),
});

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SummarySchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: validatedData.error.issues
      }, { status: 400 });
    }

    // Create the summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('zen_ticket_summaries')
      .insert({
        ticket_id: validatedData.data.ticket_id,
        summary: validatedData.data.summary,
        created_by: user.id,
        created_by_role: 'client'
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Database insert error:', summaryError);
      return NextResponse.json({ 
        error: 'Failed to create summary',
        details: summaryError.message 
      }, { status: 500 });
    }

    return NextResponse.json(summaryData);
  } catch (error) {
    console.error('Error in POST /api/zen_ticket_summaries:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 