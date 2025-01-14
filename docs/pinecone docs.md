Install Pinecone
If you haven’t already, install the Node client on the command line:

npm install @pinecone-database/pinecone
Initialize
Next, initialize the client and target the “quickstart” index:

import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: '********-****-****-****-************'
});
const index = pc.index('quickstart');
Upsert
Then write vectors into a namespace in your index. You use namespaces to help speed up queries and comply with multi-tenancy requirements.

await index.namespace('ns1').upsert([
  {
     id: 'vec1', 
     values: [1.0, 1.5],
     metadata: { genre: 'drama' }
  },
  {
     id: 'vec2', 
     values: [2.0, 1.0],
     metadata: { genre: 'action' }
  },
  {
     id: 'vec3', 
     values: [0.1, 0.3],
     metadata: { genre: 'drama' }
  },
  {
     id: 'vec4', 
     values: [1.0, -2.5],
     metadata: { genre: 'action' }
  }
]);
Query
Search the "ns1" namespace in your index for the 2 vectors that are most similar to an example vector, filtering for results that match a specific metadata value:

const response = await index.namespace('ns1').query({
  topK: 2,
  vector: [0.1, 0.3],
  includeValues: true,
  includeMetadata: true,
  filter: { genre: { '$eq': 'action' }}
});

console.log(response);
Now that you have experience with basic Pinecone operations, check out our sample applications using common AI patterns, tools, and algorithms and head over to our documentation for detailed guidance and best practices:


Upsert data
Query data
Filter with metadata
Node.js SDK reference




Upsert data
This page shows you how to use the upsert operation to write records into a namespace in an index. Namespaces let you partition records within an index and are essential for implementing multitenancy when you need to isolate the data of each customer/user.

If a record ID already exists, upsert overwrites the entire record. To update only part of a record, use the update operation instead.

Pinecone is eventually consistent, so there can be a slight delay before new or changed records are visible to queries. See Understanding data freshness to learn about data freshness in Pinecone and how to check the freshness of your data.

​
Upsert limits
Metric	Limit
Max upsert size	2MB or 1000 records
Max metadata size per record	40 KB
Max length for a record ID	512 characters
Max dimensionality for dense vectors	20,000
Max non-zero values for sparse vectors	1000
Max dimensionality for sparse vectors	4.2 billion
When upserting larger amounts of data, it is recommended to upsert records in large batches. A batch of upserts should be as large as possible (up to 1000 records) without exceeding the maximum request size of 2MB.

To understand the number of records you can fit into one batch based on the vector dimensions and metadata size, see the following table:

Dimension	Metadata (bytes)	Max batch size
386	0	1000
768	500	559
1536	2000	245
​
Upsert records
​
Dense vectors
To upsert a record in an index namespace, provide the record ID and the dense vector value and specify the namesapce. If the specified namespace doesn’t exist, it is created. To use the default namespace, set the namespace to an empty string ("").


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.upsert(
  vectors=[
    {"id": "A", "values": [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]},
    {"id": "B", "values": [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]},
    {"id": "C", "values": [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]},
    {"id": "D", "values": [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]}
  ],
  namespace="example-namespace1"
)

index.upsert(
  vectors=[
    {"id": "E", "values": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]},
    {"id": "F", "values": [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6]},
    {"id": "G", "values": [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7]},
    {"id": "H", "values": [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]}
  ],
  namespace="example-namespace1"
)
​
Dense vectors and metadata
You can optionally attach metadata key-value pairs to records to store additional information or context. When you query the index, you can then filter by metadata to ensure only relevant records are scanned. This can reduce latency and improve the accuracy of results. For more information, see Metadata Filtering.


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.upsert(
  vectors=[
    {
      "id": "A", 
      "values": [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], 
      "metadata": {"genre": "comedy", "year": 2020}
    },
    {
      "id": "B", 
      "values": [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
      "metadata": {"genre": "documentary", "year": 2019}
    },
    {
      "id": "C", 
      "values": [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      "metadata": {"genre": "comedy", "year": 2019}
    },
    {
      "id": "D", 
      "values": [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
      "metadata": {"genre": "drama"}
    }
  ]
)
​
Dense and sparse vectors
You can optionally include sparse vector values alongside dense vector values. This allows you to perform hybrid search, or semantic and keyword search, in one query for more relevant results.

See Upsert sparse-dense vectors.

This feature is in public preview.

​
Upsert records in batches
When upserting larger amounts of data, it is recommended to upsert records in large batches. This should be as large as possible (up to 1000 records) without exceeding the maximum request size of 2MB. To understand the number of records you can fit into one batch, see the Upsert limits section.


Python

JavaScript

Java

Go

import random
import itertools
from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

def chunks(iterable, batch_size=200):
    """A helper function to break an iterable into chunks of size batch_size."""
    it = iter(iterable)
    chunk = tuple(itertools.islice(it, batch_size))
    while chunk:
        yield chunk
        chunk = tuple(itertools.islice(it, batch_size))

vector_dim = 128
vector_count = 10000

# Example generator that generates many (id, vector) pairs
example_data_generator = map(lambda i: (f'id-{i}', [random.random() for _ in range(vector_dim)]), range(vector_count))

# Upsert data with 200 vectors per upsert request
for ids_vectors_chunk in chunks(example_data_generator, batch_size=200):
    index.upsert(vectors=ids_vectors_chunk) 
​
Send upserts in parallel
Send multiple upserts in parallel to help increase throughput. Vector operations block until the response has been received. However, they can be made asynchronously as follows:


Python

JavaScript

Java

Go

import random
import itertools
from pinecone import Pinecone

# Initialize the client with pool_threads=30. This limits simultaneous requests to 30.
pc = Pinecone(api_key="YOUR_API_KEY", pool_threads=30)

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

def chunks(iterable, batch_size=200):
    """A helper function to break an iterable into chunks of size batch_size."""
    it = iter(iterable)
    chunk = tuple(itertools.islice(it, batch_size))
    while chunk:
        yield chunk
        chunk = tuple(itertools.islice(it, batch_size))

vector_dim = 128
vector_count = 10000

example_data_generator = map(lambda i: (f'id-{i}', [random.random() for _ in range(vector_dim)]), range(vector_count))

# Upsert data with 200 vectors per upsert request asynchronously
# - Pass async_req=True to index.upsert()
with pc.Index(host="INDEX_HOST", pool_threads=30) as index:
    # Send requests in parallel
    async_results = [
        index.upsert(vectors=ids_vectors_chunk, async_req=True)
        for ids_vectors_chunk in chunks(example_data_generator, batch_size=200)
    ]
    # Wait for and retrieve responses (this raises in case of error)
    [async_result.get() for async_result in async_results]
​
Python SDK with gRPC
Using the Python SDK with gRPC extras can provide higher upsert speeds. Through multiplexing, gRPC is able to handle large amounts of requests in parallel without slowing down the rest of the system (HoL blocking), unlike REST. Moreover, you can pass various retry strategies to the gRPC SDK, including exponential backoffs.

To install the gRPC version of the SDK:

Shell

pip install "pinecone[grpc]"
To use the gRPC SDK, import the pinecone.grpc subpackage and target an index as usual:

Python

from pinecone.grpc import PineconeGRPC as Pinecone

# This is gRPC client aliased as "Pinecone"
pc = Pinecone(api_key='YOUR_API_KEY')  

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")
To launch multiple read and write requests in parallel, pass async_req to the upsert operation:

Python

def chunker(seq, batch_size):
  return (seq[pos:pos + batch_size] for pos in range(0, len(seq), batch_size))

async_results = [
  index.upsert(vectors=chunk, async_req=True)
  for chunk in chunker(data, batch_size=200)
]

# Wait for and retrieve responses (in case of error)
[async_result.result() for async_result in async_results]
It is possible to get write-throttled faster when upserting using the gRPC SDK. If you see this often, we recommend you use a backoff algorithm(e.g., exponential backoffs)
while upserting.

The syntax for upsert, query, fetch, and delete with the gRPC SDK remain the same as the standard SDK.

​
Upsert a dataset as a dataframe
To quickly ingest data when using the Python SDK, use the upsert_from_dataframe method. The method includes retry logic andbatch_size, and is performant especially with Parquet file data sets.

The following example upserts the uora_all-MiniLM-L6-bm25 dataset as a dataframe.

Python

from pinecone import Pinecone, ServerlessSpec
from pinecone_datasets import list_datasets, load_dataset

pc = Pinecone(api_key="API_KEY")

dataset = load_dataset("quora_all-MiniLM-L6-bm25")

pc.create_index(
  name="example-index",
  dimension=384,
  metric="cosine",
  spec=ServerlessSpec(
    cloud="aws",
    region="us-east-1"
  )
)

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.upsert_from_dataframe(dataset.drop(columns=["blob"]))
​
Upsert records with integrated embedding
To automatically embed data as part of the upsert process, use integrated inference.


Data
Query data
After your data is indexed, you can start sending queries to Pinecone.

The query endpoint searches the index using a query vector. It retrieves the IDs of the most similar records in the index, along with their similarity scores. This endpoint can optionally return the result’s vector values and metadata, too. You specify the number of vectors to retrieve each time you send a query. Matches are always ordered by similarity from most similar to least similar.

The similarity score for a vector represents its distance to the query vector, calculated according to the distance metric for the index. The significance of the score depends on the similarity metric. For example, for indexes using the euclidean distance metric, scores with lower values are more similar, while for indexes using the dotproduct metric, higher scores are more similar.

Pinecone is eventually consistent, so there can be a slight delay before new or changed records are visible to queries. See Understanding data freshness to learn about data freshness in Pinecone and how to check the freshness of your data.

​
Query limits
Metric	Limit
Max top_k value	10,000
Max result size	4MB
The query result size is affected by the dimension of the dense vectors and whether or not dense vector values and metadata are included in the result.

If a query fails due to exceeding the 4MB result size limit, choose a lower top_k value, or use include_metadata=False or include_values=False to exclude metadata or values from the result.

​
Send a query
Each query must include a query vector, specified by either a vector or id, and the number of results to return, specified by the top_k parameter. Each query is also limited to a single namespace within an index. To target a namespace, pass the namespace parameter. To query the default namespace, pass "" or omit the namespace parameter.

Depending on your data and your query, you may get fewer than top_k results. This happens when top_k is larger than the number of possible matching vectors for your query.

For optimal performance when querying with top_k over 1000, avoid returning vector data (include_values=True) or metadata (include_metadata=True).

​
Query by vector
To query by dense vector, provide the vector values representing your query embedding and the topK parameter.

The following example sends a query vector with vector values and retrieves three matching vectors:


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.query(
    namespace="example-namespace",
    vector=[0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
    top_k=3,
    include_values=True
)
The response looks like this:


Python

JavaScript

Java

Go

C#

{
    "matches": [
        {
            "id": "C",
            "score": -1.76717265e-07,
            "values": [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
        },
        {
            "id": "B",
            "score": 0.080000028,
            "values": [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        },
        {
            "id": "D",
            "score": 0.0800001323,
            "values": [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
        },
    ],
    "namespace": "example-namespace",
    "usage": {"read_units": 5}
}
​
Query by record ID
To query by record ID, provide the unique record ID and the topK parameter.

The following example sends a query vector with an id value and retrieves three matching vectors:


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.query(
    namespace="example-namespace",
    id="B",
    top_k=3,
    include_values=True
)
For more information, see Limitations of querying by ID.

​
Query with metadata filters
Metadata filter expressions can be included with queries to limit the search to only vectors matching the filter expression.

For optimal performance, when querying pod-based indexes with top_k over 1000, avoid returning vector data (include_values=True) or metadata (include_metadata=True).
Use the filter parameter to specify the metadata filter expression. For example, to search for a movie in the “documentary” genre:


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.query(
    namespace="example-namespace",
    vector=[0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    filter={
        "genre": {"$eq": "documentary"}
    },
    top_k=1,
    include_metadata=True # Include metadata in the response.
)

# Returns:
# {'matches': [{'id': 'B',
#               'metadata': {'genre': 'documentary'},
#               'score': 0.0800000429,
#               'values': []}],
#  'namespace': 'example-namespace'}
For more information about filtering with metadata, see Understanding metadata.

​
Query with sparse and dense vectors
When querying an index containing sparse and dense vectors, include a sparse_vector in your query parameters.

Only indexes using the dotproduct metric support querying sparse vectors.

This feature is in public preview.

Examples

The following example shows how to query with a sparse-dense vector.


Python

JavaScript

Java

Go

C#

curl

query_response = index.query(
    namespace="example-namespace",
    top_k=10,
    vector=[0.1, 0.2, 0.3, 0.4],
    sparse_vector={
        'indices': [3],
        'values':  [0.8]
    }
)
To learn more, see Querying sparse-dense vectors.

​
Query across multiple namespaces
Each query is limited to a single namespace. However, the Pinecone Python SDK provides a query_namespaces utility method to run a query in parallel across multiple namespaces in an index and then merge the result sets into a single ranked result set with the top_k most relevant results.

The query_namespaces method accepts most of the same arguments as query with the addition of a required namespaces parameter.

​
Python SDK without gRPC
When using the Python SDK without gRPC extras, to get good performance, it is important to set values for the pool_threads and connection_pool_maxsize properties on the index client. The pool_threads setting is the number of threads available to execute requests, while connection_pool_maxsize is the number of cached http connections that will be held. Since these tasks are not computationally heavy and are mainly i/o bound, it should be okay to have a high ratio of threads to cpus.

The combined results include the sum of all read unit usage used to perform the underlying queries for each namespace.

Python

from pinecone import Pinecone

pc = Pinecone(api_key="YOUR_API_KEY")
index = pc.Index(
    name="example-index",
    pool_threads=50,             # <-- make sure to set these
    connection_pool_maxsize=50,  # <-- make sure to set these
)

query_vec = [ 0.1, ...] # an embedding vector with same dimension as the index
combined_results = index.query_namespaces(
    vector=query_vec,
    namespaces=['ns1', 'ns2', 'ns3', 'ns4'],
    metric="cosine",
    top_k=10,
    include_values=False,
    include_metadata=True,
    filter={"genre": { "$eq": "comedy" }},
    show_progress=False,
)

for scored_vec in combined_results.matches:
    print(scored_vec)
print(combined_results.usage)
​
Python SDK with gRPC
When using the Python SDK with gRPC extras, there is no need to set the connection_pool_maxsize because grpc makes efficient use of open connections by default.

Python

from pinecone.grpc import PineconeGRPC

pc = PineconeGRPC(api_key="API_KEHY")
index = pc.Index(
    name="example-index",
    pool_threads=50, # <-- make sure to set this
)

query_vec = [ 0.1, ...] # an embedding vector with same dimension as the index
combined_results = index.query_namespaces(
    vector=query_vec,
    namespaces=['ns1', 'ns2', 'ns3', 'ns4'],
    metric="cosine",
    top_k=10,
    include_values=False,
    include_metadata=True,
    filter={"genre": { "$eq": "comedy" }},
    show_progress=False,
)

for scored_vec in combined_results.matches:
    print(scored_vec)
print(combined_results.usage)
​
Query with integrated embedding and reranking
To automatically embed queries and rerank results as part of the search process, use integrated inference.

​
Data freshness
Pinecone is eventually consistent, so there can be a slight delay before new or changed records are visible to queries. You can use the describe_index_stats endpoint to check data freshness.

Data
Understanding metadata
You can attach metadata key-value pairs to vectors in an index. When you query the index, you can then filter by metadata to ensure only relevant records are scanned.

Searches with metadata filters retrieve exactly the number of nearest-neighbor results that match the filters. For most cases, the search latency will be even lower than unfiltered searches.

Searches without metadata filters do not consider metadata. To combine keywords with semantic search, see sparse-dense embeddings.

​
Supported metadata types
Metadata payloads must be key-value pairs in a JSON object. Keys must be strings, and values can be one of the following data types:

String
Number (integer or floating point, gets converted to a 64 bit floating point)
Booleans (true, false)
List of strings
Null metadata values are not supported. Instead of setting a key to hold a
null value, we recommend you remove that key from the metadata payload.

For example, the following would be valid metadata payloads:

JSON

{
    "genre": "action",
    "year": 2020,
    "length_hrs": 1.5
}

{
    "color": "blue",
    "fit": "straight",
    "price": 29.99,
    "is_jeans": true
}
​
Supported metadata size
Pinecone supports 40KB of metadata per vector.

​
Metadata query language
Pinecone’s filtering query language is based on MongoDB’s query and projection operators. Pinecone currently supports a subset of those selectors:

Filter	Description	Supported types
$eq	Matches vectors with metadata values that are equal to a specified value. Example: {"genre": {"$eq": "documentary"}}	Number, string, boolean
$ne	Matches vectors with metadata values that are not equal to a specified value. Example: {"genre": {"$ne": "drama"}}	Number, string, boolean
$gt	Matches vectors with metadata values that are greater than a specified value. Example: {"year": {"$gt": 2019}}	Number
$gte	Matches vectors with metadata values that are greater than or equal to a specified value. Example:{"year": {"$gte": 2020}}	Number
$lt	Matches vectors with metadata values that are less than a specified value. Example: {"year": {"$lt": 2020}}	Number
$lte	Matches vectors with metadata values that are less than or equal to a specified value. Example: {"year": {"$lte": 2020}}	Number
$in	Matches vectors with metadata values that are in a specified array. Example: {"genre": {"$in": ["comedy", "documentary"]}}	String, number
$nin	Matches vectors with metadata values that are not in a specified array. Example: {"genre": {"$nin": ["comedy", "documentary"]}}	String, number
$exists	Matches vectors with the specified metadata field. Example: {"genre": {"$exists": true}}	Boolean
$and	Joins query clauses with a logical AND. Example: {"$and": [{"genre": {"$eq": "drama"}}, {"year": {"$gte": 2020}}]}	-
$or	Joins query clauses with a logical OR. Example: {"$or": [{"genre": {"$eq": "drama"}}, {"year": {"$gte": 2020}}]}	-
For example, the following has a "genre" metadata field with a list of strings:

JSON

{ "genre": ["comedy", "documentary"] }
This means "genre" takes on both values, and requests with the following filters will match:

JSON

{"genre":"comedy"}

{"genre": {"$in":["documentary","action"]}}

{"$and": [{"genre": "comedy"}, {"genre":"documentary"}]}
However, requests with the following filter will not match:

JSON

{ "$and": [{ "genre": "comedy" }, { "genre": "drama" }] }
Additionally, requests with the following filters will not match because they are invalid. They will result in a compilation error:


# INVALID QUERY:
{"genre": ["comedy", "documentary"]}

# INVALID QUERY:
{"genre": {"$eq": ["comedy", "documentary"]}}
​
Manage high-cardinality in pod-based indexes
For pod-based indexes, Pinecone indexes all metadata by default. When metadata contains many unique values, pod-based indexes will consume significantly more memory, which can lead to performance issues, pod fullness, and a reduction in the number of possible vectors that fit per pod.

To avoid indexing high-cardinality metadata that is not needed for filtering, use selective metadata indexing, which lets you specify which fields need to be indexed and which do not, helping to reduce the overall cardinality of the metadata index while still ensuring that the necessary fields are able to be filtered.

Since high-cardinality metadata does not cause high memory utilization in serverless indexes, selective metadata indexing is not supported.

​
Considerations for serverless indexes
For each serverless index, Pinecone clusters records that are likely to be queried together. When you query a serverless index with a metadata filter, Pinecone first uses internal metadata statistics to exclude clusters that do not have records matching the filter and then chooses the most relevant remaining clusters.

Note the following considerations:

When filtering by numeric metadata that cannot be ordered in a meaningful way (e.g., IDs as opposed to dates or prices), the chosen clusters may not be accurate. This is because the metadata statistics for each cluster reflect the min and max metadata values in the cluster, and min and max are not helpful when there is no meaningful order.

In such cases, it is best to store the metadata as strings instead of numbers. When filtering by string metadata, the chosen clusters will be more accurate, with a low false-positive rate, because the string metadata statistics for each cluster reflect the actual string values, compressed for space-efficiency.

When you use a highly selective metadata filter (i.e., a filter that rejects the vast majority of records in the index), the chosen clusters may not contain enough matching records to satisfy the designated top_k.

For more details about query execution, see Serverless architecture.

​
Use metadata
The following operations support metadata:

Query an index with metadata filters
Insert metadata into an index
Delete vectors by metadata filter
Pinecone Assistant also supports metadata filters. For more information, see Understanding files in Pinecone Assistant.

Manage RAG documents
In Retrieval Augmented Generation (RAG) use cases, it is best practice to chunk large documents into smaller segments, embed each chunk separately, and then store each embedded chunk as a distinct record in Pinecone. This page shows you how to model, store, and manage such records in serverless indexes.

​
Use ID prefixes
ID prefixes enable you to query segments of content, which is especially useful for lists and mass deletion. Prefixes are commonly used to represent the following:

Hierarchical relationships: When you have multiple records representing chunks of a single document, use a common ID prefix to reference the document. This is the main use of ID prefixes for RAG.
Versioning: Assign a multi-level ID prefix to denote the version of the content.
Content typing: For multi-modal search, assign an ID prefix to identify different kind of objects (e.g., text, images, videos) in the database.
Source identification: Assign an ID prefix to denote the source of the content. For example, if you want to disconnect a given user’s account that was a data source, you can easily find and delete all of the records associated with the user.
​
Use ID prefixes to reference parent documents
When you have multiple records representing chunks of a single document, use a common ID prefix to reference the document.

You can use any prefix pattern you like, but make sure you use a consistent prefix pattern for all child records of a document. For example, the following are all valid prefixes for the first chunk of doc1:

doc1#chunk1
doc1_chunk1
doc1___chunk1
doc1:chunk1
doc1chunk1
Prefixes can also be multi-level. For example, doc1#v1#chunk1 and doc1#v2#chunk1 can represent different versions of the first chunk of doc1.

ID prefixes are not validated on upsert or update. It is useful to pick a unique and consistent delimiter that will not be used in the ID elsewhere.


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone
from pinecone import ServerlessSpec

pc = Pinecone(api_key="YOUR_API_KEY")

pc.create_index(
  name="example-index",
  dimension=8,
  metric="cosine",
  spec=ServerlessSpec(
    cloud="aws",
    region="us-east-1"
  )
)

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

index.upsert(
  vectors=[
    {"id": "doc1#chunk1", "values": [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]},
    {"id": "doc1#chunk2", "values": [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]},
    {"id": "doc1#chunk3", "values": [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]},
    {"id": "doc1#chunk4", "values": [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]}
  ],
  namespace="example-namespace"
)
​
List all record IDs for a parent document
When all records related to a document use a common ID prefix, you can use the list operation with the namespace and prefix parameters to fetch the IDs of the records.

The list operation is supported only for serverless indexes.


Python

JavaScript

Java

Go

C#

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key='YOUR_API_KEY')

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

# To iterate over all result pages using a generator function
for ids in index.list(prefix='doc1#', namespace='example-namespace'):
    print(ids)

# To manually control pagination, use list_paginate().
# See https://docs.pinecone.io/docs/get-record-ids#paginate-through-results for details.

# Response:
# ['doc1#chunk1', 'doc1#chunk2', 'doc1#chunk3']
When there are additional IDs to return, the response includes a pagination_token that you can use to get the next batch of IDs. For more details, see Paginate through list results

With the record IDs, you can then use the fetch endpoint to fetch the content of the records.

​
Delete all records for a parent document
To delete all records representing chunks of a single document, first list the record IDs based on their common ID prefix, and then delete the records by ID:


Python

JavaScript

Java

Go

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key='YOUR_API_KEY')

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

for ids in index.list(prefix='doc1#', namespace='example-namespace'):
  print(ids) # ['doc1#chunk1', 'doc1#chunk2', 'doc1#chunk3']
  index.delete(ids=ids, namespace=namespace)
​
Work with multi-level ID prefixes
The examples above are based on a simple ID prefix (doc1#), but it’s also possible to work with more complex, multi-level prefixes.

For example, let’s say you use the prefix pattern doc#v#chunk to differentiate between different versions of a document. If you wanted to delete all records for one version of a document, first list the record IDs based on the relevant doc#v# prefix and then delete the records by ID:


Python

JavaScript

Java

Go

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key='YOUR_API_KEY')

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

for ids in index.list(prefix='doc1#v1', namespace='example-namespace'):
    print(ids) # ['doc1#v1#chunk1', 'doc1#v1#chunk2', 'doc1#v1#chunk3']
    index.delete(ids=ids, namespace=namespace)
However, if you wanted to delete all records across all versions of a document, you would list the record IDs based on the doc1# part of the prefix that is common to all versions and then delete the records by ID:


Python

JavaScript

Java

Go

curl

from pinecone.grpc import PineconeGRPC as Pinecone

pc = Pinecone(api_key='YOUR_API_KEY')

# To get the unique host for an index, 
# see https://docs.pinecone.io/guides/data/target-an-index
index = pc.Index(host="INDEX_HOST")

for ids in index.list(prefix='doc1#', namespace='example-namespace'):
    print(ids) # ['doc1#v1#chunk1', 'doc1#v1#chunk2', 'doc1#v1#chunk3', 'doc1#v2#chunk1', 'doc1#v2#chunk2', 'doc1#v2#chunk3']
    index.delete(ids=ids, namespace=namespace)
​
RAG using pod-based indexes
The list endpoint does not support pod-based indexes. Instead of using ID prefixes to reference parent documents, use a metadata key-value pair. If you later need to delete the records, you can pass a metadata filter expression to the delete endpoint.