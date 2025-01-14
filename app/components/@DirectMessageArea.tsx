import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Message } from '@prisma/client';
import { checkIdea } from '../../scripts/idea-checker';
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
            const messageData: any = {
                content,
                userId: session.user.id,
            };
            if (currentDirectMessage?.id) {
                messageData.directMessageId = currentDirectMessage.id;
            }
            const userMessage = await createMessage(messageData);

            // Update messages optimistically
            setMessages(prev => [...prev, userMessage]);

            // If messaging AI Assistant or Idea Checker, get AI response
            if (currentDirectMessage?.otherUser?.email.includes('@ai.bot')) {
                // Show typing indicator
                setIsAiTyping(true);

                let aiResponse;
                if (currentDirectMessage?.otherUser?.name === 'Idea Checker') {
                    // Use RAG-powered idea checker
                    const ideaCheck = await checkIdea(content);
                    aiResponse = {
                        role: 'assistant',
                        content: ideaCheck.analysis,
                        // You could also include suggestions and relevant sections in a formatted way
                        // For example:
                        // content: `${ideaCheck.analysis}\n\nRelevant Research Sections:\n${ideaCheck.relevantSections.join('\n')}\n\nKey Suggestions:\n${ideaCheck.suggestedImprovements.join('\n')}`
                    };
                } else {
                    // Regular AI Assistant - use OpenAI directly
                    aiResponse = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: content }),
                    });
                    aiResponse = await aiResponse.json();
                }

                // Create and save the AI's response message
                const aiMessageData: any = {
                    content: aiResponse.content,
                    userId: currentDirectMessage?.otherUser?.id || '',
                };
                if (currentDirectMessage?.id) {
                    aiMessageData.directMessageId = currentDirectMessage.id;
                }
                const aiMessage = await createMessage(aiMessageData);

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