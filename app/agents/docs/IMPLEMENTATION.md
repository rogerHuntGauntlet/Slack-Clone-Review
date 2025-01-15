# Slack Clone Agent System Implementation

## RULES
- All new components should be added to the `@agents/components` folder.
- All new services should be added to the `@agents/services` folder.
- All new types should be added to the `@agents/types` folder.
- All new pages should be added to the `@agents/pages` folder.
- All new routes should be added to the `@agents/routes` folder.
- All new hooks should be added to the `@agents/hooks` folder.
- All new utils should be added to the `@agents/utils` folder.
- All new styles should be added to the `@agents/styles` folder.
- All new tests should be added to the `@agents/tests` folder.
- All new documentation should be added to the `@agents/docs` folder.

## Overview
This document details the implementation of the agent system in our Slack clone project, focusing on file management, UI components, database schema, and service layer implementations.

## Database Schema

### Tables

1. **agents**
   ```sql
   CREATE TABLE agents (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       description TEXT,
       is_active BOOLEAN DEFAULT true,
       configuration JSONB,
       pinecone_index VARCHAR(255),
       pinecone_namespace VARCHAR(255),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, name)
   );
   ```

2. **agent_files**
   ```sql
   CREATE TABLE agent_files (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
       type file_type NOT NULL,
       url TEXT NOT NULL,
       name VARCHAR(255) NOT NULL,
       size INTEGER NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **tags**
   ```sql
   CREATE TABLE tags (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       name VARCHAR(50) NOT NULL UNIQUE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **agent_tags** (Junction Table)
   ```sql
   CREATE TABLE agent_tags (
       agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
       tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (agent_id, tag_id)
   );
   ```

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own agents and related data
- Tags are readable by all authenticated users but manageable only through agent ownership
- Automatic cascading deletes for cleanup

### Indexes

- `idx_agents_user_id`: Quick agent lookup by user
- `idx_agent_files_agent_id`: Quick file lookup by agent
- `idx_agent_tags_agent_id` and `idx_agent_tags_tag_id`: Efficient tag relationship queries

## Components

### 1. AgentCard Component
A comprehensive card interface for displaying agent information:

#### Features
- Status indicator with active/inactive state
- Training files count with icon
- Tag display with indigo styling
- Last updated timestamp
- Action buttons for edit and delete
- Toggle switch for active status

#### Styling
- Clean, sectioned layout with borders
- Hover effect with indigo border glow
- Consistent spacing and padding
- Smooth transitions and animations
- Mobile-responsive design

### 2. AgentModal Component
A comprehensive modal interface for creating and editing agents:

#### Layout
- Three-column layout (80vh height, 90vw width)
- Left column: Agent metadata
- Middle column: File upload grid
- Right column: File preview gallery

#### Metadata Management (Left Column)
- Agent name input
- Description textarea
- Tags management system
  - Add tags via input field
  - Remove tags with click
  - Tags displayed as pills
  - Enter key support for quick addition

#### File Upload System (Middle Column)
- 2x2 grid layout for different file types:
  - Text files
  - Image files
  - Video files
  - Audio files
- Each upload section includes:
  - File type label
  - File count
  - Drag-and-drop zone
  - File list with reordering capability

#### Preview System (Right Column)
- Grid layout for all uploaded files
- Thumbnail/preview for each file type
- Enlarge button on hover
- File name display
- "No files" message when empty
- Enlarged preview modal with:
  - Full-size display
  - Media controls for audio/video
  - Text content display
  - Close button

## Types and Interfaces

### Agent Types
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  configuration?: Record<string, any>;
  trainingFiles: TrainingFile[];
  tags: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### File Management Types
```typescript
interface TrainingFile {
  type: FileType;
  url: string;
  name: string;
  size: number;
}

interface AgentFile {
  file: File;
  type: FileType;
  progress: number;
  previewResult?: PreviewResult;
}
```

### DTO Types
```typescript
interface CreateAgentDTO {
  name: string;
  description: string;
  configuration?: Record<string, any>;
  files?: File[];
  tags: string[];
}

interface UpdateAgentDTO {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  
  configuration?: Record<string, any>;
  files?: File[];
  tags?: string[];
}
```

## UI/UX Considerations

### Landing Page
- Hero section with gradient background
- Statistics dashboard showing:
  - Total agents
  - Active agents
  - Total training files
  - Recently updated agents
- Search and filter functionality
- Tag-based filtering
- Status filtering (All/Active/Inactive)
- Responsive grid layout for agent cards

### Responsive Design
- Mobile-first approach
- Flexible layouts
- Appropriate spacing on all devices
- Touch-friendly interactions

### User Feedback
- Loading states with spinners
- Error handling with clear messages
- Success notifications
- Interactive hover states
- Smooth transitions

### Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Color contrast compliance
- Screen reader support

## Future Improvements

1. Batch file operations
2. Advanced file preview features
3. Enhanced tag suggestions
4. File type specific validations
5. Improved error handling
6. Performance optimizations for large files
7. Enhanced file metadata extraction
8. Advanced search and filtering

## Technical Debt and Considerations

1. Type safety improvements
2. Error boundary implementation
3. Testing coverage
4. Performance monitoring
5. Security auditing
6. Accessibility testing
7. Browser compatibility verification 

## Recent Changes (March 14, 2024)

### 1. Database Schema Implementation
Created new Supabase migration (`20240314000000_create_agents_tables.sql`) with:

#### Database Tables
- `agents`: Core agent information
- `agent_files`: Training file storage
- `tags`: Reusable tag system
- `agent_tags`: Many-to-many relationship junction

#### Custom Types
```sql
CREATE TYPE file_type AS ENUM ('text', 'image', 'video', 'audio');
```

#### Security Features
- Row Level Security (RLS) policies for all tables
- User-based access control
- Secure file management
- Tag visibility controls

#### Performance Optimizations
- Strategic indexes for common queries
- Automatic timestamp management
- Efficient cascading deletes

### 2. UI Implementation

#### Landing Page
Created responsive agents page with:
- Hero section with gradient background
- Statistics dashboard
- Search and filtering system
- Tag-based navigation
- Status filtering

#### AgentCard Component
Implemented new card design with:
- Status indicators
- File count display
- Tag visualization
- Action buttons
- Toggle switches
- Hover effects
- Timestamp display

#### Styling Updates
- Consistent indigo color scheme
- Platform-aligned design
- Responsive layouts
- Interactive elements
- Loading states
- Error handling

### 3. Mock Data
Added development testing data:
- Sample agents with varied states
- Different file types
- Tag combinations
- Active/inactive status
- Realistic timestamps

### 2. RAG Implementation
Created new RAG system for agent knowledge processing:

#### Core Components
1. **AgentRAGService** (`services/rag-service.js`)
   - Document chunking with configurable size and overlap
   - OpenAI embeddings generation
   - Pinecone vector storage management
   - Knowledge querying with metadata filtering
   - Batch vector upsert for efficiency
   - Automatic index management

2. **FileProcessor** (`services/file-processor.js`)
   - File type validation
   - Content extraction
   - Text normalization
   - Size limit enforcement
   - Support for text files (extensible for image/video/audio)

3. **API Routes** (`api/rag/route.ts`)
   - POST: Process and index new files
   - GET: Query agent knowledge
   - DELETE: Remove agent knowledge

#### Testing Tools
1. **Test Script** (`scripts/test-rag.js`)
   - End-to-end testing of RAG functionality
   - Sample document processing
   - Query testing
   - Cleanup utilities

2. **Index Management** (`scripts/check-indexes.js`)
   - Index status checking
   - Index cleanup utilities
   - Environment validation

#### Configuration
- Chunk size: 500 characters
- Chunk overlap: 50 characters
- Vector dimension: 1536 (OpenAI ada-002)
- Pinecone configuration:
  - Environment: gcp-starter
  - Pod type: s1.x1
  - Metric: cosine

#### File Processing Limits
- Text files: 10MB
- Image files: 5MB
- Video files: 100MB
- Audio files: 50MB

#### Current Status
- Basic text file processing implemented
- Vector storage and retrieval working
- Batch processing for efficiency
- Error handling and validation in place
- Environment configuration complete
- Testing infrastructure ready

#### Next Steps
1. Implement image processing
2. Add video content extraction
3. Implement audio transcription
4. Add file type validation
5. Enhance error handling
6. Add progress tracking
7. Implement retry mechanisms
8. Add content validation 

#### Integration with Agent System
1. **File Upload Flow**
   ```typescript
   // When creating/updating an agent with files
   const formData = new FormData();
   formData.append('agentId', agent.id);
   formData.append('file', file);
   formData.append('fileType', fileType);
   await fetch('/api/agents/rag', { 
     method: 'POST', 
     body: formData 
   });
   ```

2. **Knowledge Query Flow**
   ```typescript
   // When agent needs to access its knowledge
   const response = await fetch(
     `/api/agents/rag?agentId=${agentId}&query=${query}`
   );
   const { results } = await response.json();
   // results contain relevant content with similarity scores
   ```

3. **Cleanup Flow**
   ```typescript
   // When deleting an agent
   await fetch(`/api/agents/rag?agentId=${agentId}`, {
     method: 'DELETE'
   });
   ```

4. **Error Handling**
   - File validation errors return 400 status
   - Processing errors return 500 status
   - All errors include descriptive messages
   - Client-side retry logic recommended

5. **Performance Considerations**
   - Batch vector upserts (100 vectors per batch)
   - Parallel file processing
   - Efficient chunking with overlap
   - Metadata filtering for fast queries 

## PhD Agent Evaluator Implementation

### Components

1. **AgentIdeaInput Component**
   - Text input for idea submission
   - Support for audio/video recording
   - File upload capabilities (txt, pdf, doc, docx)
   - Error notification system
   - Loading states during evaluation

2. **IdeaEvaluationModal Component**
   - Chat-like interface for agent interaction
   - Message history with user/assistant roles
   - Support for formatted responses (headers, bullet points)
   - Input area for follow-up questions
   - Loading states during message submission

### API Endpoints

1. **/api/agents/evaluate**
   - Accepts user messages
   - Generates embeddings using OpenAI
   - Queries Pinecone for relevant research context
   - Uses GPT-4 to evaluate ideas based on research
   - Returns structured evaluation response

2. **/api/agents/transcribe**
   - Handles audio/video file transcription
   - Uses Whisper API for conversion

3. **/api/agents/extract-text**
   - Processes uploaded documents (PDF, DOC)
   - Extracts text content for evaluation

### State Management
- Evaluation results
- Loading states
- Error handling
- Message history
- Modal visibility

### Environment Variables Required
- OPENAI_API_KEY
- PINECONE_API_KEY
- PHD_PINECONE_INDEX_NAME
- PHD_PINECONE_NAMESPACE

### Future Improvements
1. Persistent chat history
2. Context-aware follow-up responses
3. Enhanced file processing capabilities
4. Real-time transcription feedback
5. Better error recovery mechanisms 

## Recent Changes (March 15, 2024)

### 1. UI/UX Improvements

#### Landing Page Redesign
- Added hero section with gradient background and compelling copy
- Implemented metrics dashboard showing:
  - Total agents count
  - Active agents count
  - Recently updated agents (7-day window)
- Added "Return to Workspace" button linking to `/platform`

#### Template System
- Implemented quick start templates section
- Added three initial templates:
  - Customer Support Agent
  - Research Assistant
  - Content Creator
- Each template includes:
  - Name and description
  - Pre-written prompt
  - "Use Template" button that pre-fills evaluator

#### Agent Management
- Enhanced agent cards with status indicators
- Added edit functionality to existing agents
- Improved empty state messaging
- Consolidated agent creation flow

### 2. PhD Evaluator Improvements
- Redesigned modal interface with:
  - Professional header including icon
  - Clear title and description
  - Proper close button
- Enhanced chat interface
- Added direct "Create Agent" flow from evaluation
- Implemented automatic chat log inclusion in agent creation
- Fixed file handling to prevent duplicate uploads

### 3. File Preview System
- Added comprehensive file preview functionality
- Implemented type-specific previews:
  - Text content display
  - Image preview
  - Video player
  - Audio player
- Added metadata display with:
  - File name
  - Type
  - Size
- Implemented proper scrolling behavior for long content 