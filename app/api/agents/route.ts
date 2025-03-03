import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

interface Tag {
  id: string;
  name: string;
}

interface CreateAgentDTO {
  name: string;
  description: string;
  configuration?: Record<string, any>;
  pineconeIndex?: string;
  pineconeNamespace?: string;
  tags?: string[];
}

export async function GET() {
  try {
    const supabase = createClient({ cookies });
    
    // Just return empty array for now until table is created
    return NextResponse.json([]);
  } catch (error) {
    console.warn('Error in GET /api/agents:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateAgentDTO = await request.json();
    
    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: body.name,
        description: body.description,
        configuration: body.configuration || {},
        pinecone_index: body.pineconeIndex,
        pinecone_namespace: body.pineconeNamespace,
        user_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create auth user for the agent
    const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email: `${agent.id}@gauntlet.ai`,
      password: crypto.randomUUID(), // Generate a random password
      email_confirm: true,
      user_metadata: {
        is_agent: true,
        name: body.name,
        avatar_url: `https://www.gravatar.com/avatar/${agent.id}?d=robohash`
      }
    });

    if (authCreateError) {
      // If auth user creation fails, delete the agent
      await supabase.from('agents').delete().eq('id', agent.id);
      return NextResponse.json({ error: authCreateError.message }, { status: 500 });
    }

    // Create corresponding user profile for the agent
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: agent.id, // Use the same ID as the agent
        username: body.name,
        bio: body.description,
        is_agent: true,
        status: 'online',
        email: `${agent.id}@gauntlet.ai`,
        avatar_url: `https://www.gravatar.com/avatar/${agent.id}?d=robohash`
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, clean up
      await supabase.auth.admin.deleteUser(authUser.user.id);
      await supabase.from('agents').delete().eq('id', agent.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // If tags are provided, create them and link to agent
    if (body.tags && body.tags.length > 0) {
      // First, ensure all tags exist
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', body.tags);

      const existingTagNames = existingTags?.map((t: Tag) => t.name) || [];
      const newTags = body.tags.filter((tagName: string) => !existingTagNames.includes(tagName));

      // Insert new tags
      if (newTags.length > 0) {
        const { error: tagError } = await supabase
          .from('tags')
          .insert(newTags.map((tagName: string) => ({ name: tagName })));

        if (tagError) {
          console.error('Error creating tags:', tagError);
        }
      }

      // Get all tag IDs (both existing and newly created)
      const { data: allTags } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', body.tags);

      if (allTags) {
        // Link tags to agent
        const { error: linkError } = await supabase
          .from('agent_tags')
          .insert(
            allTags.map((tag: Tag) => ({
              agent_id: agent.id,
              tag_id: tag.id,
            }))
          );

        if (linkError) {
          console.error('Error linking tags:', linkError);
        }
      }
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error in POST /api/agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient({ cookies });
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    return NextResponse.json(data);
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
    const supabase = createClient({ cookies });
    const { data: session } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await request.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
} 