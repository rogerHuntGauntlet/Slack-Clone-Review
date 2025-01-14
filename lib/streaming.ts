import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

// Types for streaming callbacks
interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Custom callback handler for streaming
class StreamingCallbackHandler {
  constructor(private callbacks: StreamCallbacks) {}

  handleLLMNewToken(token: string): void {
    this.callbacks.onToken(token);
  }

  handleLLMEnd(): void {
    this.callbacks.onComplete?.();
  }

  handleLLMError(error: Error): void {
    this.callbacks.onError?.(error);
  }
}

// Create a streaming-enabled LLM
export const streamingLLM = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7,
  streaming: true,
});

// Helper to create a streaming chain
export function createStreamingChain(callbacks: StreamCallbacks) {
  const handler = new StreamingCallbackHandler(callbacks);

  return RunnableSequence.from([
    (input: string) => ({ content: input }),
    streamingLLM.pipe(new StringOutputParser()),
  ]).withConfig({
    callbacks: [handler],
  });
}

// Stream processor for handling chunks with backpressure
export async function processStreamWithBackpressure(
  stream: AsyncIterable<string>,
  onChunk: (chunk: string) => Promise<void>,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    for await (const chunk of stream) {
      await onChunk(chunk);
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

// Helper to create a response stream
export function createResponseStream(
  chain: RunnableSequence,
  input: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let isCancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await chain.invoke(input, {
          callbacks: [
            new StreamingCallbackHandler({
              onToken(token: string) {
                if (!isCancelled) {
                  controller.enqueue(encoder.encode(token));
                }
              },
              onComplete() {
                if (!isCancelled) {
                  controller.close();
                }
              },
              onError(error: Error) {
                if (!isCancelled) {
                  controller.error(error);
                }
              },
            }),
          ],
        });
      } catch (error) {
        if (!isCancelled) {
          controller.error(error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
    cancel() {
      isCancelled = true;
    },
  });

  return stream;
}

// Helper to create a transform stream for processing tokens
export function createTokenProcessor(
  onToken?: (token: string) => void
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const tokens = buffer.split(/(\s+)/);
      
      // Keep the last token in buffer if it might be incomplete
      buffer = tokens.pop() || '';

      for (const token of tokens) {
        onToken?.(token);
        controller.enqueue(encoder.encode(token));
      }
    },
    flush(controller) {
      if (buffer) {
        onToken?.(buffer);
        controller.enqueue(encoder.encode(buffer));
      }
    },
  });
} 