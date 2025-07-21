const https = require('https');

const options = {
  hostname: 'butp.tech',
  port: 443,
  path: '/',
  method: 'GET'
};

console.log('正在检查 https://butp.tech 的可访问性...');

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log('响应头:', JSON.stringify(res.headers, null, 2));
  
  res.on('data', () => {
    // 不需要处理响应体数据
  });
  
  res.on('end', () => {
    console.log('请求完成');
  });
});

req.on('error', (e) => {
  console.error(`请求出错: ${e.message}`);
});

req.end(); 