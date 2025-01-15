import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { createHash } from 'crypto';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to generate MD5 hash for Gravatar URL
const md5 = (str: string) => createHash('md5').update(str).digest('hex');

async function createPhdAgent() {
  try {
    // Get user ID by email from auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Error listing users: ${userError.message}`);
    }

    const user = users.find(u => u.email === process.env.NEXT_PUBLIC_DEBUG_EMAIL);
    if (!user) {
      throw new Error(`Could not find user with email ${process.env.NEXT_PUBLIC_DEBUG_EMAIL}`);
    }

    console.log('Found user:', user);

    // Create the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: 'PhD Knowledge Agent',
        description: 'An AI agent with knowledge from PhD research papers and academic content',
        pinecone_index: 'phd-knowledge',
        user_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create a user profile for the agent
    const agentEmail = `agent-${agent.id}@gauntlet.ai`;
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: agent.id,
        email: agentEmail,
        username: 'PhD Knowledge Agent',
        avatar_url: `https://www.gravatar.com/avatar/${md5(agentEmail)}?d=identicon`,
        status: 'online',
        is_agent: true
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    console.log('Created agent profile:', profile);

    // Create tags
    const tags = ['academic', 'research', 'phd'];
    
    // Insert tags
    const { data: createdTags, error: tagError } = await supabase
      .from('tags')
      .upsert(
        tags.map(name => ({ name })),
        { onConflict: 'name' }
      )
      .select('id, name');

    if (tagError) {
      throw tagError;
    }

    // Link tags to agent
    if (createdTags) {
      const { error: linkError } = await supabase
        .from('agent_tags')
        .insert(
          createdTags.map(tag => ({
            agent_id: agent.id,
            tag_id: tag.id,
          }))
        );

      if (linkError) {
        throw linkError;
      }
    }

    console.log('Successfully created PhD Knowledge Agent:', agent);
  } catch (error) {
    console.error('Error creating PhD Knowledge Agent:', error);
  }
}

createPhdAgent(); 