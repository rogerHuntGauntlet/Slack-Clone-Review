import { NextResponse } from 'next/server';
import { checkIdea } from '../../../scripts/idea-checker';

export async function POST(req: Request) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        const ideaCheck = await checkIdea(message);

        // Format the response with analysis, relevant sections, and suggestions
        const formattedResponse = {
            role: 'assistant',
            content: `${ideaCheck.analysis}\n\n${
                ideaCheck.relevantSections.length > 0
                    ? `Relevant Research Sections:\n${ideaCheck.relevantSections.join('\n')}\n\n`
                    : ''
            }${
                (ideaCheck.suggestedImprovements || []).length > 0
                    ? `Key Suggestions:\n${(ideaCheck.suggestedImprovements || []).join('\n')}`
                    : ''
            }`
        };

        return NextResponse.json(formattedResponse);
    } catch (error) {
        console.error('Error in idea-check route:', error);
        return NextResponse.json(
            { error: 'Failed to process idea' },
            { status: 500 }
        );
    }
} 