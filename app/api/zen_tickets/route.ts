import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Input validation schema
const TicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  project_id: z.string().min(1, 'Project ID is required'),
  tags: z.array(z.string()),
  category: z.object({
    type: z.enum(['feature', 'bug', 'improvement'])
  })
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
    console.log('Received request body:', body);

    const validatedData = TicketSchema.safeParse(body);
    if (!validatedData.success) {
      console.log('Validation errors:', validatedData.error.issues);
      return NextResponse.json({
        error: 'Missing required fields',
        details: validatedData.error.issues
      }, { status: 400 });
    }

    console.log('Validated data:', validatedData.data);

    // Create the ticket
    const { data: ticket, error: insertError } = await supabase
      .from('zen_tickets')
      .insert({
        title: validatedData.data.title,
        description: validatedData.data.description,
        priority: validatedData.data.priority,
        project_id: validatedData.data.project_id,
        category: validatedData.data.category,
        tags: validatedData.data.tags,
        created_by: user.id,
        client: user.id,
        status: 'new'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create ticket',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('Created ticket:', ticket);
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error in POST /api/zen_tickets:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project_id from URL params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch tickets for the project
    const { data: tickets, error: fetchError } = await supabase
      .from('zen_tickets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
} 