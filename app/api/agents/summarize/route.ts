import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST(request: Request) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides concise, one-sentence summaries of longer text. Focus on the key points and main takeaways."
        },
        {
          role: "user",
          content: `Please provide a one-sentence summary of the following text:\n\n${content}`
        }
      ],
      max_tokens: 100,
      temperature: 0.5,
    })

    const summary = completion.choices[0]?.message?.content || ''

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error in summarize route:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
} 