import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: "缺少有效的认证信息" 
    });
  }

  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`http://localhost:3002/server/export/lesson-plans/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': session.user.id || '',
        'X-Username': session.user.name || '',
      },
      body: JSON.stringify(req.body)
    });

    // Handle binary responses (PDF, PNG)
    if (response.headers.get('content-type')?.includes('application') || 
        response.headers.get('content-type')?.includes('image')) {
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', response.headers.get('content-type'));
      res.setHeader('Content-Disposition', response.headers.get('content-disposition'));
      res.status(response.status).send(Buffer.from(buffer));
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
    
  } catch (error) {
    console.error('Export proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
}