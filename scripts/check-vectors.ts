import { checkIndexContents } from '../utils/vectorStore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkVectors() {
    try {
        console.log('Checking vector store contents...');
        const results = await checkIndexContents();
        
        // Print summary
        console.log('\nVector Store Summary:');
        console.log('-----------------');
        console.log('Total records:', results.totalRecordCount);
        console.log('Dimensions:', results.dimension);
        console.log('Index fullness:', results.indexFullness);
        
        // Print namespace statistics
        if (results.namespaces) {
            console.log('\nNamespace Statistics:');
            Object.entries(results.namespaces).forEach(([namespace, stats]) => {
                console.log(`\nNamespace: ${namespace}`);
                console.log(`Record count: ${stats.recordCount}`);
            });
        }

    } catch (error) {
        console.error('Error checking vectors:', error);
        process.exit(1);
    }
}

// Run the check
checkVectors(); 