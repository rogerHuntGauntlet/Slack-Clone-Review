import { NextResponse } from 'next/server';
import { AgentService } from '../services/agent-service';
import { CreateAgentDTO, UpdateAgentDTO } from '../types/agent-types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const agentService = new AgentService(supabase);
    const agents = await agentService.getAllAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.warn('Error in GET /api/agents:', error);
    // Return empty array instead of error
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: CreateAgentDTO = await request.json();
    const agentService = new AgentService(supabase);
    const newAgent = await agentService.createAgent(data);
    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: UpdateAgentDTO = await request.json();
    const agentService = new AgentService(supabase);
    const updatedAgent = await agentService.updateAgent(data);
    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Error in PUT /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await request.json();
    const agentService = new AgentService(supabase);
    await agentService.deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
} 