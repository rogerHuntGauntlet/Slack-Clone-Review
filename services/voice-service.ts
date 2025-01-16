import { useState } from 'react';

interface AudioContextType extends AudioContext {
  webkitAudioContext?: AudioContext;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export class VoiceService {
  private apiKey: string;
  private voiceId: string = 'pNInz6obpgDQGcFmaJgB'; // Example ElevenLabs voice ID for a friendly, professional voice
  private static instance: VoiceService | null = null;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey?: string): VoiceService | null {
    if (!VoiceService.instance && apiKey) {
      VoiceService.instance = new VoiceService(apiKey);
    }
    return VoiceService.instance;
  }

  async synthesizeSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    const AudioContextClass = (window.AudioContext || window.webkitAudioContext) as typeof AudioContext;
    const audioContext = new AudioContextClass();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    return new Promise((resolve) => {
      source.onended = () => {
        audioContext.close();
        resolve();
      };
    });
  }
} 