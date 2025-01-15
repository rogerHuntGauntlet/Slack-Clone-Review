import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../.env.local') });

async function checkIndexes() {
  console.log('Checking Pinecone indexes...');
  
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
  });

  try {
    const indexes = await pinecone.listIndexes();
    console.log('Current indexes:', indexes);

    // Delete existing indexes if any
    if (indexes.indexes?.length > 0) {
      for (const index of indexes.indexes) {
        console.log(`Deleting index: ${index.name}`);
        await pinecone.deleteIndex(index.name);
      }
      console.log('All indexes deleted');
    } else {
      console.log('No existing indexes found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkIndexes().catch(console.error); 