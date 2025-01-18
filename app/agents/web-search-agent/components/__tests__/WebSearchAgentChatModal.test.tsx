/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebSearchAgentChatModal } from '../WebSearchAgentChatModal';
import { WebSearchProvider } from '../../context/WebSearchContext';
import { webSearchAgentService } from '../../services/web-search-agent-service';
import { WebSearchStorageService } from '../../services/web-search-storage-service';

// Mock services
jest.mock('../../services/web-search-agent-service');
jest.mock('../../services/web-search-storage-service');

// Mock speech synthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
  onvoiceschanged: null
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  text: '',
  onstart: null,
  onend: null,
  onerror: null
}));

describe('WebSearchAgentChatModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    agentId: 'test-agent-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock webSearchAgentService methods
    (webSearchAgentService.initializeAgent as jest.Mock).mockResolvedValue(undefined);
    (webSearchAgentService.getCurrentAgentName as jest.Mock).mockReturnValue('Test Agent');
    (webSearchAgentService.sendMessage as jest.Mock).mockResolvedValue({
      content: 'Test response',
      citations: []
    });

    // Mock fetch for voice summary
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ voiceSummary: 'Test voice summary' })
    });
  });

  it('renders correctly when open', () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    expect(screen.getByText(/Chat with Test Agent/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} isOpen={false} />
      </WebSearchProvider>
    );

    expect(screen.queryByText(/Chat with Test Agent/i)).not.toBeInTheDocument();
  });

  it('initializes agent and shows greeting', async () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    await waitFor(() => {
      expect(webSearchAgentService.initializeAgent).toHaveBeenCalledWith('test-agent-id');
      expect(screen.getByText(/Hi there! I'm Test Agent/i)).toBeInTheDocument();
    });
  });

  it('handles user input and sends messages', async () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    const input = screen.getByPlaceholderText(/Type your message/i);
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(webSearchAgentService.sendMessage).toHaveBeenCalledWith('test message', false);
      expect(screen.getByText('test message')).toBeInTheDocument();
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
  });

  it('handles errors during message sending', async () => {
    (webSearchAgentService.sendMessage as jest.Mock).mockRejectedValue(new Error('Test error'));

    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    const input = screen.getByPlaceholderText(/Type your message/i);
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sorry, there was an error/i)).toBeInTheDocument();
    });
  });

  it('toggles voice output', async () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    // Find and click the mute button
    const muteButton = screen.getByRole('button', { name: /volume/i });
    fireEvent.click(muteButton);

    // Send a message
    const input = screen.getByPlaceholderText(/Type your message/i);
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      // Voice synthesis should not be called when muted
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    // Unmute and send another message
    fireEvent.click(muteButton);
    fireEvent.change(input, { target: { value: 'another message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      // Voice synthesis should be called when unmuted
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });
  });

  it('closes modal when close button is clicked', () => {
    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('stores messages in agent memory', async () => {
    const mockStoreMessage = jest.fn();
    (WebSearchStorageService as jest.Mock).mockImplementation(() => ({
      storeMessage: mockStoreMessage
    }));

    render(
      <WebSearchProvider>
        <WebSearchAgentChatModal {...defaultProps} />
      </WebSearchProvider>
    );

    const input = screen.getByPlaceholderText(/Type your message/i);
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(mockStoreMessage).toHaveBeenCalledTimes(2); // Once for user message, once for response
    });
  });
}); 