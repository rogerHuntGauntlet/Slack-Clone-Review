import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function markAgentProfiles() {
  const client = await pool.connect();
  
  try {
    // First ensure the is_agent column exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'user_profiles'
          AND column_name = 'is_agent'
        ) THEN
          ALTER TABLE user_profiles ADD COLUMN is_agent BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);

    console.log('Ensured is_agent column exists');

    // Get all agents
    const { rows: agents } = await client.query('SELECT * FROM agents');

    console.log(`Found ${agents.length} agents`);

    // Update each agent's profile to mark it as an agent
    for (const agent of agents) {
      console.log(`Marking profile for agent: ${agent.name} (${agent.id})`);
      
      await client.query(`
        UPDATE user_profiles
        SET is_agent = true
        WHERE id = $1
      `, [agent.id]);

      console.log(`Marked profile for agent: ${agent.name}`);
    }

    console.log('Finished marking agent profiles');
  } catch (error) {
    console.error('Error marking agent profiles:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Run the sync
markAgentProfiles(); 