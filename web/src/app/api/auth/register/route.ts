import { NextRequest, NextResponse } from 'next/server'

// Simple validation function
function validateRegistrationData(data: any) {
  const errors: string[] = []
  
  if (!data.username || data.username.trim().length < 3) {
    errors.push('用户名至少需要3个字符')
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('密码至少需要6个字符')
  }
  
  if (data.password && (!/[a-zA-Z]/.test(data.password) || !/\d/.test(data.password))) {
    errors.push('密码必须包含字母和数字')
  }
  
  if (data.password !== data.confirmPassword) {
    errors.push('两次输入的密码不一致')
  }
  
  return errors
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { username, password, confirmPassword, preferences } = data
    
    console.log('[Registration] Attempting to register user:', username)
    
    // Validate input
    const errors = validateRegistrationData({ username, password, confirmPassword })
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: errors.join(', ')
      }, { status: 400 })
    }
    
    // Call Express backend to create user
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/server', '') || 'http://localhost:3002'
    console.log('[Registration] Backend URL:', backendUrl)
    
    const response = await fetch(`${backendUrl}/server/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
        preferences: preferences || {
          theme: 'system',
          language: 'zh_CN',
          notifications: true,
          subject: 'math',
          gradeLevel: 'primary_1',
          easyMode: true,
          ...preferences
        }
      })
    })
    
    const result = await response.json()
    console.log('[Registration] Backend response:', { success: result.success, hasUser: !!result.data?.user })
    
    if (!response.ok || !result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || result.message || '注册失败'
      }, { status: response.status || 500 })
    }
    
    // Registration successful
    return NextResponse.json({
      success: true,
      message: '注册成功！请使用新账号登录',
      user: {
        id: result.data.user.id,
        username: result.data.user.username
      }
    })
    
  } catch (error) {
    console.error('[Registration] Error:', error)
    return NextResponse.json({
      success: false,
      error: '注册请求失败，请稍后重试'
    }, { status: 500 })
  }
}