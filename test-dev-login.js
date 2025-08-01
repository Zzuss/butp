// 测试开发登录API

async function testDevLogin() {
  const testHash = 'cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb';
  
  console.log('🔍 测试开发登录API...');
  console.log('测试哈希值:', testHash.substring(0, 16) + '...');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/dev-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userHash: testHash }),
    });

    const data = await response.json();
    
    console.log('📊 响应状态:', response.status);
    console.log('📋 响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ 登录成功！');
      console.log('👤 用户ID:', data.user?.userId);
      console.log('🔑 用户哈希:', data.user?.userHash?.substring(0, 16) + '...');
      console.log('📝 用户名:', data.user?.name);
    } else {
      console.log('❌ 登录失败');
      console.log('🚫 错误信息:', data.error);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testDevLogin(); 