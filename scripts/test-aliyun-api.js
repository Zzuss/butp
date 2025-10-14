#!/usr/bin/env node

/**
 * 阿里云预测API快速测试脚本
 * 用于命令行快速验证API服务器状态
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
const DEFAULT_SERVER = 'http://your-aliyun-server.com:8080';
const TIMEOUT = 10000; // 10秒超时

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP请求函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AliyunAPITester/1.0',
        ...options.headers
      },
      timeout: TIMEOUT,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: jsonData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// 测试健康检查
async function testHealthCheck(serverUrl) {
  colorLog('blue', '🔍 测试健康检查...');
  
  try {
    const response = await makeRequest(`${serverUrl}/health`);
    
    if (response.status === 200) {
      colorLog('green', '✅ 健康检查通过');
      console.log('   状态信息:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      colorLog('red', `❌ 健康检查失败: ${response.status} ${response.statusText}`);
      console.log('   响应:', response.data);
      return false;
    }
  } catch (error) {
    colorLog('red', `❌ 健康检查错误: ${error.message}`);
    return false;
  }
}

// 测试专业列表
async function testMajorsList(serverUrl) {
  colorLog('blue', '📚 测试专业列表...');
  
  try {
    const response = await makeRequest(`${serverUrl}/api/majors`);
    
    if (response.status === 200) {
      const majors = response.data?.data?.majors || response.data?.majors || [];
      colorLog('green', `✅ 专业列表获取成功 (${majors.length}个专业)`);
      
      if (majors.length > 0) {
        console.log('   支持的专业:');
        majors.slice(0, 5).forEach((major, index) => {
          console.log(`   ${index + 1}. ${major}`);
        });
        if (majors.length > 5) {
          console.log(`   ... 还有 ${majors.length - 5} 个专业`);
        }
      } else {
        colorLog('yellow', '⚠️  专业列表为空');
      }
      
      return true;
    } else {
      colorLog('red', `❌ 专业列表获取失败: ${response.status} ${response.statusText}`);
      console.log('   响应:', response.data);
      return false;
    }
  } catch (error) {
    colorLog('red', `❌ 专业列表错误: ${error.message}`);
    return false;
  }
}

// 测试服务器基本信息
async function testServerInfo(serverUrl) {
  colorLog('blue', '🖥️  测试服务器信息...');
  
  try {
    const urlObj = new URL(serverUrl);
    colorLog('cyan', `   服务器地址: ${urlObj.hostname}`);
    colorLog('cyan', `   端口: ${urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)}`);
    colorLog('cyan', `   协议: ${urlObj.protocol}`);
    
    // 测试基本连接
    const response = await makeRequest(serverUrl);
    colorLog('green', `✅ 服务器连接成功`);
    return true;
  } catch (error) {
    colorLog('red', `❌ 服务器连接失败: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests(serverUrl) {
  console.log('');
  colorLog('cyan', '🚀 阿里云预测API测试开始');
  colorLog('cyan', '================================');
  console.log('');
  
  const results = {
    server: false,
    health: false,
    majors: false,
  };
  
  // 1. 测试服务器连接
  results.server = await testServerInfo(serverUrl);
  console.log('');
  
  if (!results.server) {
    colorLog('red', '❌ 服务器连接失败，跳过后续测试');
    return results;
  }
  
  // 2. 测试健康检查
  results.health = await testHealthCheck(serverUrl);
  console.log('');
  
  // 3. 测试专业列表
  results.majors = await testMajorsList(serverUrl);
  console.log('');
  
  return results;
}

// 打印测试结果
function printResults(results) {
  colorLog('cyan', '📊 测试结果总结');
  colorLog('cyan', '================================');
  
  const tests = [
    { name: '服务器连接', result: results.server },
    { name: '健康检查', result: results.health },
    { name: '专业列表', result: results.majors },
  ];
  
  tests.forEach(test => {
    const status = test.result ? '✅ 通过' : '❌ 失败';
    const color = test.result ? 'green' : 'red';
    colorLog(color, `   ${test.name}: ${status}`);
  });
  
  console.log('');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  if (passedCount === totalCount) {
    colorLog('green', '🎉 所有测试通过！你的API服务器运行正常');
  } else {
    colorLog('yellow', `⚠️  ${passedCount}/${totalCount} 个测试通过`);
    
    if (!results.server) {
      console.log('');
      colorLog('yellow', '💡 建议检查:');
      console.log('   1. 服务器是否正在运行');
      console.log('   2. 网络连接是否正常');
      console.log('   3. 阿里云安全组是否开放8080端口');
      console.log('   4. 服务器防火墙配置');
    }
  }
}

// 主函数
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const serverUrl = args[0] || DEFAULT_SERVER;
  
  // 验证URL格式
  try {
    new URL(serverUrl);
  } catch (error) {
    colorLog('red', '❌ 无效的服务器地址');
    console.log('');
    console.log('使用方法:');
    console.log('  node test-aliyun-api.js [服务器地址]');
    console.log('');
    console.log('示例:');
    console.log('  node test-aliyun-api.js http://116.62.123.456:8080');
    console.log('  node test-aliyun-api.js https://your-domain.com:8080');
    process.exit(1);
  }
  
  if (serverUrl === DEFAULT_SERVER) {
    colorLog('yellow', '⚠️  使用默认服务器地址，请替换为你的实际地址');
    console.log('');
  }
  
  try {
    const results = await runTests(serverUrl);
    printResults(results);
  } catch (error) {
    colorLog('red', `❌ 测试过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testMajorsList,
  testServerInfo,
  runTests,
};
