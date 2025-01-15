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

async function syncAgentProfiles() {
  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) {
      throw agentsError;
    }

    console.log(`Found ${agents.length} agents`);

    // For each agent, ensure they have a user profile
    for (const agent of agents) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', agent.id)
        .single();

      if (!existingProfile) {
        console.log(`Creating profile for agent: ${agent.name} (${agent.id})`);
        const agentEmail = `agent-${agent.id}@gauntlet.ai`;
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: agent.id,
            email: agentEmail,
            username: agent.name,
            avatar_url: `https://www.gravatar.com/avatar/${md5(agentEmail)}?d=identicon`,
            status: 'online'
          });

        if (profileError) {
          console.error(`Error creating profile for agent ${agent.id}:`, profileError);
          continue;
        }

        console.log(`Created profile for agent: ${agent.name}`);
      } else {
        console.log(`Profile already exists for agent: ${agent.name}`);
      }
    }

    console.log('Finished syncing agent profiles');
  } catch (error) {
    console.error('Error syncing agent profiles:', error);
    process.exit(1);
  }
}

// Run the sync
syncAgentProfiles(); 