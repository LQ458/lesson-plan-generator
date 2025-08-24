import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryString = url.searchParams.toString();
    const backendUrl = `${BACKEND_URL}/content/lesson-plans${queryString ? `?${queryString}` : ''}`;
    
    const cookies = request.headers.get('cookie') || '';
    console.log('[Proxy] /api/content/lesson-plans - Cookies:', cookies);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Proxy] Backend response status:', response.status);
    const data = await response.json();
    console.log('[Proxy] Backend response success:', data.success);
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}