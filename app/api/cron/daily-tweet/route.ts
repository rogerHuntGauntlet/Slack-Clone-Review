import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TwitterApi } from 'twitter-api-v2';
import OpenAI from 'openai';
import { Tavily } from 'tavily';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Vercel cron syntax: runs at 10 AM UTC daily (6 AM EST)
export const maxDuration = 300; // 5 minutes maximum execution time
export const schedule = '0 10 * * *';

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'twitter-accounts.json');

async function generateTweetContent() {
  const tavily = new Tavily(process.env.NEXT_PUBLIC_TAVILY_API_KEY!);
  
  const searchResponse = await tavily.search({
    query: 'GauntletAI.com company information products features',
    search_depth: 'advanced'
  });

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a social media expert. Create an engaging tweet about GauntletAI.com based on the following information. Make it sound natural and exciting, include relevant hashtags, and keep it under 280 characters."
      },
      {
        role: "user",
        content: JSON.stringify(searchResponse)
      }
    ],
  });

  return completion.choices[0].message.content;
}

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read all connected accounts
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    
    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No connected accounts' }, { status: 400 });
    }

    // Generate tweet content
    const tweetContent = await generateTweetContent();

    // Select random account to post the tweet
    const posterIndex = Math.floor(Math.random() * accounts.length);
    const posterAccount = accounts[posterIndex];

    // Post the tweet
    const posterClient = new TwitterApi(posterAccount.accessToken);
    const tweet = await posterClient.v2.tweet(tweetContent);

    // Have other accounts like and retweet
    const engagementPromises = accounts
      .filter((account: any) => account.userId !== posterAccount.userId)
      .map(async (account: any) => {
        const client = new TwitterApi(account.accessToken);
        try {
          // Like the tweet
          await client.v2.like(account.userId, tweet.data.id);
          // Retweet
          await client.v2.retweet(account.userId, tweet.data.id);
        } catch (error) {
          console.error(`Error with engagement from account ${account.username}:`, error);
        }
      });

    await Promise.all(engagementPromises);

    return NextResponse.json({
      success: true,
      tweet: tweet.data,
      poster: posterAccount.username,
      engagements: accounts.length - 1
    });
  } catch (error) {
    console.error('Error in daily tweet process:', error);
    return NextResponse.json({ error: 'Failed to process daily tweet' }, { status: 500 });
  }
}
