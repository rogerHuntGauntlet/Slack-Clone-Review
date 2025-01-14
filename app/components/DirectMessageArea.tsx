import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Message, Prisma } from '@prisma/client';
import { createMessage } from '../../lib/message-service';

interface DirectMessageAreaProps {
    currentDirectMessage: {
        id: string;
        otherUser: {
            id: string;
            name: string;
            email: string;
        };
    } | null;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    isAiTyping: boolean;
    setIsAiTyping: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DirectMessageArea({
    currentDirectMessage,
    messages,
    setMessages,
    isAiTyping,
    setIsAiTyping
}: DirectMessageAreaProps) {
    const { data: session } = useSession();

    const handleSendMessage = async (content: string) => {
        if (!session?.user?.email) return;

        try {
            // Create and save the user's message
            const messageInput: Prisma.MessageUncheckedCreateInput = {
                content,
                userId: session.user.email || '',
                directMessageId: currentDirectMessage?.id || null
            };
            
            const userMessage = await createMessage(messageInput);

            // Update messages optimistically
            setMessages(prev => [...prev, userMessage]);

            // If messaging AI Assistant or Idea Checker, get AI response
            if (currentDirectMessage?.otherUser?.email.includes('@ai.bot')) {
                // Show typing indicator
                setIsAiTyping(true);

                let aiResponse;
                if (currentDirectMessage?.otherUser?.name === 'Idea Checker') {
                    // Use the idea-check API endpoint
                    const response = await fetch('/api/idea-check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: content }),
                    });
                    aiResponse = await response.json();
                } else {
                    // Regular AI Assistant
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: content }),
                    });
                    aiResponse = await response.json();
                }

                if (aiResponse.error) {
                    throw new Error(aiResponse.error);
                }

                // Create and save the AI's response message
                const aiMessage = await createMessage({
                    content: aiResponse.content,
                    channelId: null,
                    directMessageId: currentDirectMessage?.id || null,
                    userId: currentDirectMessage?.otherUser?.id || '',
                });

                // Update messages with AI response
                setMessages(prev => [...prev, aiMessage]);
                setIsAiTyping(false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setIsAiTyping(false);
        }
    };

    // ... rest of the component code ...
} 