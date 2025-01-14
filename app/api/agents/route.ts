import { NextResponse } from 'next/server';
import { getAllAgents } from '../../../lib/agent-service';

export async function GET() {
  try {
    const agents = await getAllAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
} 