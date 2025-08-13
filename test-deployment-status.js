const https = require('https');

function testUrl(url, name) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      console.log(`✅ ${name}: ${res.statusCode} ${res.statusMessage}`);
      resolve(true);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${name}: 超时`);
      req.destroy();
      resolve(false);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });
  });
}

async function testDeployments() {
  console.log('🚀 测试部署状态...\n');
  
  await testUrl('https://butp.tech', 'BuTP主站');
  await testUrl('https://umami-mysql-mauve.vercel.app/', 'Umami登录页');
  await testUrl('https://umami-mysql-mauve.vercel.app/api/heartbeat', 'Umami心跳API');
  await testUrl('https://umami-mysql-mauve.vercel.app/script.js', 'Umami追踪脚本');
  
  console.log('\n✅ 测试完成！');
}

testDeployments(); 