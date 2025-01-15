import { TrainingFile, FileType } from '../types/agent-types';

export class FileProcessor {
  private chunkSize: number = 500;
  private chunkOverlap: number = 50;

  async processFile(file: File): Promise<string> {
    const text = await this.readFileAsText(file);
    return this.normalizeText(text);
  }

  createChunks(text: string): string[] {
    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      // Calculate the end of this chunk
      let endIndex = currentIndex + this.chunkSize;
      
      // If this isn't the last chunk, try to find a good break point
      if (endIndex < text.length) {
        // Look for the last period, question mark, or exclamation point in the overlap region
        const searchRegion = text.slice(endIndex - this.chunkOverlap, endIndex);
        const lastSentenceEnd = Math.max(
          searchRegion.lastIndexOf('.'),
          searchRegion.lastIndexOf('?'),
          searchRegion.lastIndexOf('!')
        );

        if (lastSentenceEnd !== -1) {
          endIndex = endIndex - this.chunkOverlap + lastSentenceEnd + 1;
        }
      }

      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }

    return chunks;
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces (but not newlines) with single space
      .trim();
  }
} 