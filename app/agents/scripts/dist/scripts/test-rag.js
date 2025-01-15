import { AgentRAGService } from '../services/rag-service';
import { FileProcessor } from '../services/file-processor';
import { config } from 'dotenv';
import path from 'path';
// Load environment variables
config({ path: path.resolve(process.cwd(), '../../../.env.local') });
async function testRAGSystem() {
    console.log('Starting RAG system test...');
    console.log('Environment check:');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '× Missing');
    console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing');
    console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT ? '✓ Set' : '× Missing');
    const ragService = new AgentRAGService();
    const fileProcessor = new FileProcessor();
    // Test data
    const testAgentId = 'test-agent-' + Date.now();
    const testContent = `
    This is a test document about artificial intelligence.
    AI systems can be used to automate various tasks.
    Machine learning is a subset of artificial intelligence.
    Deep learning is a type of machine learning.
    Natural language processing is used for text understanding.
  `;
    try {
        console.log('\n1. Creating test file...');
        // @ts-ignore - File constructor works in Node.js with Buffer
        const testFile = new File([Buffer.from(testContent)], 'test.txt', { type: 'text/plain' });
        console.log('\n2. Validating file...');
        fileProcessor.validateFile(testFile, 'text');
        console.log('\n3. Processing file content...');
        const content = await fileProcessor.extractContent(testFile, 'text');
        console.log('Extracted content length:', content.length);
        console.log('\n4. Processing for RAG...');
        await ragService.processAgentFile(testAgentId, {
            type: 'text',
            url: 'test-url',
            name: testFile.name,
            size: testFile.size
        }, content);
        console.log('\n5. Testing queries...');
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
        console.log('\n6. Cleaning up...');
        await ragService.deleteAgentKnowledge(testAgentId);
        console.log('\nTest completed successfully!');
    }
    catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}
// Run the test
testRAGSystem().catch(console.error);
