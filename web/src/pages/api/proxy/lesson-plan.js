import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Get NextAuth session server-side
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: "缺少有效的认证信息",
      code: "MISSING_AUTH",
      message: "请先登录后再进行此操作"
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward request to Express backend (no auth needed - already validated)
    const response = await fetch('http://localhost:3002/server/lesson-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass user info from session to backend
        'X-User-ID': session.user.id || '',
        'X-Username': session.user.name || '',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    // Forward response back to frontend
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      message: error.message 
    });
  }
}