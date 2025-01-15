import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const prompt = `Given the following agent description, generate up to 5 relevant tags. Each tag should be a single word or hyphenated phrase in lowercase. The tags should help categorize and find this agent.

Description: "${description}"

Return only an array of tags in JSON format, like this: ["tag1", "tag2", "tag3"]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const tags = JSON.parse(content || '[]');

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Error generating tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate tags' },
      { status: 500 }
    );
  }
} 