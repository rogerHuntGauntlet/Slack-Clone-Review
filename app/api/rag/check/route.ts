import { NextRequest, NextResponse } from 'next/server';
import { checkIndexContents } from '@/utils/vectorStore';

export async function GET(req: NextRequest) {
    try {
        const results = await checkIndexContents();
        return NextResponse.json(results);
    } catch (error) {
        console.error('Error checking index:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 