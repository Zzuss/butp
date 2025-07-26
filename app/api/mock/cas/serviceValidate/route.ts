import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据
const mockUsers: Record<string, { name: string; userId: string }> = {
  '2021211001': { name: '张三', userId: '2021211001' },
  '2021211002': { name: '李四', userId: '2021211002' },
  '2021211003': { name: '王五', userId: '2021211003' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get('ticket');
  const service = searchParams.get('service');

  if (!ticket || !service) {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationFailure code="INVALID_REQUEST">
    Missing required parameters
  </cas:authenticationFailure>
</cas:serviceResponse>`;

    return new NextResponse(errorXml, {
      status: 400,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }

  // 检查ticket格式（开发环境的ticket以ST-DEV-开头）
  if (!ticket.startsWith('ST-DEV-')) {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationFailure code="INVALID_TICKET">
    Invalid ticket format
  </cas:authenticationFailure>
</cas:serviceResponse>`;

    return new NextResponse(errorXml, {
      status: 400,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }

  // 从URL参数中获取用户名（Mock环境下从callback传递过来）
  const username = searchParams.get('username') || '2021211001'; // 默认用户

  // 如果用户名不存在，使用默认用户
  const user = mockUsers[username] || mockUsers['2021211001'];
  
  console.log(`Mock CAS: validating ticket for user ${username}, using data:`, user);

  // 返回成功的XML响应
  const successXml = `<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationSuccess>
    <cas:user>${user.userId}</cas:user>
    <cas:attributes>
      <cas:name>${user.name}</cas:name>
      <cas:userId>${user.userId}</cas:userId>
      <cas:username>${user.userId}</cas:username>
      <cas:displayName>${user.name}</cas:displayName>
      <cas:cn>${user.name}</cas:cn>
    </cas:attributes>
  </cas:authenticationSuccess>
</cas:serviceResponse>`;

  return new NextResponse(successXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
} 