const fs = require('fs');
const path = require('path');

const replacements = {
  "import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'": "import { createClient } from '@/utils/supabase/client'",
  "import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'": "import { createClient } from '@/utils/supabase/server'",
  "import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'": "import { createClient } from '@/utils/supabase/server'",
  "createClientComponentClient()": "createClient()",
  "createServerComponentClient({": "createClient({",
  "createRouteHandlerClient({": "createClient({"
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  Object.entries(replacements).forEach(([oldText, newText]) => {
    if (content.includes(oldText)) {
      content = content.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      walkDir(filePath);
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      updateFile(filePath);
    }
  });
}

// Start from the current directory
walkDir('.'); 