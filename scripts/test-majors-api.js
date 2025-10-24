#!/usr/bin/env node

/**
 * 专门测试专业列表API的脚本
 * 用于调试 /api/majors 接口问题
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
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
        'User-Agent': 'MajorsAPITester/1.0',
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
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          data: data,
          headers: res.headers,
        });
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

// 测试专业列表API的不同路径
async function testMajorsAPI(serverUrl) {
  const testPaths = [
    '/api/majors',
    '/majors', 
    '/api/v1/majors',
    '/api/subjects',
    '/subjects',
    '/api/programs',
    '/programs'
  ];

  colorLog('blue', '🎓 测试专业列表API...');
  console.log('');

  for (const path of testPaths) {
    const fullUrl = `${serverUrl}${path}`;
    
    try {
      colorLog('cyan', `正在测试: ${fullUrl}`);
      
      const response = await makeRequest(fullUrl);
      
      if (response.status === 200) {
        colorLog('green', `✅ ${path} - 成功 (${response.status})`);
        
        try {
          const jsonData = JSON.parse(response.data);
          console.log('   响应格式: JSON');
          console.log('   响应内容:');
          console.log('   ', JSON.stringify(jsonData, null, 2).split('\n').join('\n    '));
          
          // 尝试提取专业列表
          const majors = extractMajors(jsonData);
          if (majors.length > 0) {
            colorLog('green', `   🎯 找到 ${majors.length} 个专业！`);
            majors.slice(0, 3).forEach((major, index) => {
              console.log(`      ${index + 1}. ${major}`);
            });
            if (majors.length > 3) {
              console.log(`      ... 还有 ${majors.length - 3} 个专业`);
            }
          } else {
            colorLog('yellow', '   ⚠️  未找到专业数据');
          }
        } catch (parseError) {
          colorLog('yellow', '   ⚠️  响应不是JSON格式');
          console.log('   响应内容:', response.data.substring(0, 200));
        }
      } else if (response.status === 404) {
        colorLog('red', `❌ ${path} - 接口不存在 (404)`);
      } else {
        colorLog('red', `❌ ${path} - 错误 (${response.status})`);
        console.log('   响应:', response.data.substring(0, 200));
      }
      
    } catch (error) {
      colorLog('red', `❌ ${path} - 网络错误: ${error.message}`);
    }
    
    console.log('');
  }
}

// 从响应中提取专业列表
function extractMajors(data) {
  // 尝试不同的数据结构
  if (data.data && Array.isArray(data.data.majors)) {
    return data.data.majors;
  }
  if (Array.isArray(data.majors)) {
    return data.majors;
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (data.subjects && Array.isArray(data.subjects)) {
    return data.subjects;
  }
  if (data.programs && Array.isArray(data.programs)) {
    return data.programs;
  }
  
  // 尝试找到任何包含字符串数组的字段
  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'string') {
      return data[key];
    }
  }
  
  return [];
}

// 生成建议
function generateSuggestions(serverUrl) {
  console.log('');
  colorLog('cyan', '💡 建议和解决方案');
  colorLog('cyan', '================================');
  console.log('');
  
  console.log('1. 检查阿里云服务器的API实现:');
  console.log('   - 确认 Flask API 中是否实现了 /api/majors 路由');
  console.log('   - 检查路由是否返回正确的JSON格式');
  console.log('');
  
  console.log('2. 手动测试API (使用curl):');
  console.log(`   curl -X GET "${serverUrl}/api/majors" -H "Accept: application/json"`);
  console.log(`   curl -X GET "${serverUrl}/health" -H "Accept: application/json"`);
  console.log('');
  
  console.log('3. 检查服务器日志:');
  console.log('   - 查看 Gunicorn 和 Flask 的错误日志');
  console.log('   - 确认请求是否到达服务器');
  console.log('');
  
  console.log('4. 可能的API实现示例:');
  console.log('   ```python');
  console.log('   @app.route("/api/majors", methods=["GET"])');
  console.log('   def get_majors():');
  console.log('       return jsonify({');
  console.log('           "success": True,');
  console.log('           "data": {');
  console.log('               "majors": ["物联网工程", "电信工程", "..."]');
  console.log('           }');
  console.log('       })');
  console.log('   ```');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  node test-majors-api.js <服务器地址>');
    console.log('');
    console.log('示例:');
    console.log('  node test-majors-api.js http://116.62.123.456:8080');
    process.exit(1);
  }
  
  const serverUrl = args[0];
  
  // 验证URL格式
  try {
    new URL(serverUrl);
  } catch (error) {
    colorLog('red', '❌ 无效的服务器地址');
    process.exit(1);
  }
  
  console.log('');
  colorLog('cyan', '🔍 专业列表API诊断工具');
  colorLog('cyan', '================================');
  console.log('');
  colorLog('blue', `目标服务器: ${serverUrl}`);
  console.log('');
  
  try {
    await testMajorsAPI(serverUrl);
    generateSuggestions(serverUrl);
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
  testMajorsAPI,
  extractMajors,
};
