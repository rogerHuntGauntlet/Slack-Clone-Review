import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function runMigrations() {
  try {
    const migrationsDir = path.join(process.cwd(), 'lib', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir);
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const { error } = await supabase.from('_migrations').select('*').eq('name', file);
        
        if (!error) {
          console.log(`Migration ${file} already run, skipping...`);
          continue;
        }

        const { error: migrationError } = await supabase.rpc('exec_sql', { sql });
        if (migrationError) {
          throw new Error(`Error running migration ${file}: ${migrationError.message}`);
        }

        const { error: insertError } = await supabase
          .from('_migrations')
          .insert([{ name: file, executed_at: new Date().toISOString() }]);

        if (insertError) {
          throw new Error(`Error recording migration ${file}: ${insertError.message}`);
        }

        console.log(`Successfully ran migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
