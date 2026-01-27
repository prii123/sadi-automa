import { NextRequest } from 'next/server';
import swaggerSpec from '@/lib/swagger';

export async function GET(request: NextRequest) {
  try {
    return new Response(JSON.stringify(swaggerSpec), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating swagger spec:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate API documentation' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}