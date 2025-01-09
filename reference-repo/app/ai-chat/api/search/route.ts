import { NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';

type SearchHit = {
  _id: string;
  _source: {
    content: string;
    sender: string;
    [key: string]: any;
  };
}

const createClient = () => {
  const cloudId = process.env.ELASTIC_CLOUD_ID;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!cloudId || !apiKey) {
    console.error('Missing Elasticsearch configuration');
    return null;
  }

  return new Client({
    cloud: { id: cloudId },
    auth: { apiKey },
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  const client = createClient();
  if (!client) {
    return NextResponse.json({ error: 'Elasticsearch client not initialized' }, { status: 500 });
  }

  try {
    const result = await client.search({
      index: 'messages',
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['content', 'sender']
          }
        }
      }
    });

    const hits = (result.hits.hits as SearchHit[]).map(hit => ({
      id: hit._id,
      ...hit._source
    }));

    return NextResponse.json(hits);
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
