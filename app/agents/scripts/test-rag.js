import { AgentRAGService } from '../services/rag-service.js';
import { FileProcessor } from '../services/file-processor.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../.env.local') });

async function validateEnvironment() {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

async function createTestFile(content, filename) {
  const tempDir = path.join(__dirname, 'temp');
  const filePath = path.join(tempDir, filename);
  
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

async function cleanup(filePath, testAgentId, ragService) {
  try {
    await fs.unlink(filePath);
    await fs.rmdir(path.dirname(filePath));
    if (ragService) {
      await ragService.deleteAgentKnowledge(testAgentId);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function testRAGSystem() {
  console.log('Starting RAG system test...');
  let testFilePath;
  let ragService;
  let testAgentId;
  
  try {
    // Validate environment first
    await validateEnvironment();
    console.log('✓ Environment validated');
    
    ragService = new AgentRAGService((progress) => {
      console.log(`Progress: ${progress.currentOperation} - ${progress.processedChunks}/${progress.totalChunks}`);
    });
    const fileProcessor = new FileProcessor();
    
    // Test data
    testAgentId = 'test-agent-' + Date.now();
    const testContent = `
      This is a test document about artificial intelligence.
      AI systems can be used to automate various tasks.
      Machine learning is a subset of artificial intelligence.
      Deep learning is a type of machine learning.
      Natural language processing is used for text understanding.
    `;

    // Create test file
    console.log('\n1. Creating test file...');
    testFilePath = await createTestFile(testContent, 'test.txt');
    console.log('✓ Test file created at:', testFilePath);
    
    // Read file content
    console.log('\n2. Reading file content...');
    const fileContent = await fs.readFile(testFilePath, 'utf-8');
    console.log('✓ File content read, length:', fileContent.length);
    
    // Process for RAG
    console.log('\n3. Processing for RAG...');
    try {
      await ragService.processAgentFile(testAgentId, {
        type: 'text',
        url: testFilePath,
        name: path.basename(testFilePath),
        size: Buffer.byteLength(fileContent)
      }, fileContent);
      console.log('✓ Content processed and indexed');
      
      // Test queries
      console.log('\n4. Testing queries...');
      const queries = [
        'What is artificial intelligence?',
        'Tell me about machine learning',
        'What is NLP used for?'
      ];
      
      for (const query of queries) {
        console.log(`\nQuery: "${query}"`);
        const results = await ragService.queryAgentKnowledge(testAgentId, query);
        console.log('Results:', JSON.stringify(results, null, 2));
      }
      
      console.log('\n✓ Test completed successfully!');
    } catch (error) {
      if (error.message.includes('FORBIDDEN')) {
        console.error('Failed to create index: Your Pinecone free plan only supports one starter index.');
        console.error('Please delete any existing indexes and try again, or upgrade your plan.');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (testFilePath) {
      await cleanup(testFilePath, testAgentId, ragService);
      console.log('\n✓ Cleanup completed');
    }
  }
}

// Run the test
testRAGSystem().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 