## Tag Generation Feature

The tag generation system automatically suggests relevant tags based on agent descriptions using OpenAI's GPT-3.5 model.

### Components:

1. **API Route** (`app/api/agents/generate-tags/route.ts`):
   - Handles POST requests with agent descriptions
   - Uses OpenAI to generate contextually relevant tags
   - Returns tags in a standardized format

2. **Tag Service** (`app/@agents/services/tag-service.ts`):
   - Provides `generateTagsFromDescription` function
   - Makes API calls to the tag generation endpoint
   - Transforms raw tags into `TagSuggestion` objects

3. **UI Integration** (`app/@agents/components/AgentModal.tsx`):
   - Automatically triggers tag generation when description length > 20 characters
   - Displays loading state while generating
   - Shows suggested tags as clickable buttons
   - Allows adding/removing tags
   - Maintains selected tags state

### Features:
- Automatic tag generation after typing
- Real-time suggestions
- Tag deduplication
- Visual feedback during generation
- Easy tag management (add/remove)

### Requirements:
- OpenAI API key in `.env.local`:
  ```
  OPENAI_API_KEY=your_openai_api_key_here
  ```

### Tag Generation Process:
1. User types description (>20 chars)
2. After 1s typing pause, sends to API
3. GPT-3.5 analyzes description
4. Returns up to 5 relevant tags
5. Tags displayed as suggestions
6. User can click to add/remove 