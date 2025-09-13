import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: "缺少有效的认证信息" 
    });
  }

  try {
    const response = await fetch('http://localhost:3002/server/content/exercises', {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': session.user.id || '',
        'X-Username': session.user.name || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Content exercises proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
}