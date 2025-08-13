#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Umami 服务配置
const UMAMI_BASE_URL = 'https://umami-teal-omega.vercel.app';
const TEST_ENDPOINTS = [
  '/',
  '/login',
  '/api/auth/user',
  '/script.js'
];

console.log('🔧 Umami 修复状态检测');
console.log('='.repeat(50));

async function checkEndpoint(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const request = https.get(url, { timeout: 10000 }, (response) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      resolve({
        url,
        status: response.statusCode,
        statusText: response.statusMessage,
        responseTime,
        success: response.statusCode < 500
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        statusText: 'Request timeout after 10s',
        responseTime: 10000,
        success: false
      });
    });

    request.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        statusText: error.message,
        responseTime: Date.now() - startTime,
        success: false
      });
    });
  });
}

async function testUmamiService() {
  console.log(`📡 测试 Umami 服务: ${UMAMI_BASE_URL}`);
  console.log();

  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const testUrl = `${UMAMI_BASE_URL}${endpoint}`;
    console.log(`🔍 测试: ${endpoint}`);
    
    const result = await checkEndpoint(testUrl);
    results.push(result);
    
    const statusIcon = result.success ? '✅' : '❌';
    const statusInfo = typeof result.status === 'number' ? 
      `${result.status} ${result.statusText}` : 
      result.status;
    
    console.log(`   ${statusIcon} ${statusInfo} (${result.responseTime}ms)`);
    
    if (!result.success && result.statusText) {
      console.log(`   📝 详情: ${result.statusText}`);
    }
    console.log();
  }

  return results;
}

async function analyzeResults(results) {
  console.log('📊 结果分析');
  console.log('-'.repeat(30));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);
  
  console.log(`✅ 成功率: ${successCount}/${totalCount} (${successRate}%)`);
  
  if (successCount === 0) {
    console.log('❌ Umami 服务完全不可用');
    console.log('🔧 建议执行完整修复流程');
  } else if (successCount < totalCount) {
    console.log('⚠️  Umami 服务部分可用');
    console.log('🔧 建议检查数据库连接和环境变量');
  } else {
    console.log('🎉 Umami 服务完全正常！');
    console.log('✨ BuTP 项目将自动切换到真实数据');
  }
  
  console.log();
  
  // 分析具体问题
  const timeoutResults = results.filter(r => r.status === 'TIMEOUT');
  const errorResults = results.filter(r => r.status === 'ERROR');
  const serverErrors = results.filter(r => typeof r.status === 'number' && r.status >= 500);
  
  if (timeoutResults.length > 0) {
    console.log('⏱️  超时问题：服务响应缓慢或不可达');
  }
  
  if (errorResults.length > 0) {
    console.log('🔌 连接问题：网络连接失败');
  }
  
  if (serverErrors.length > 0) {
    console.log('💥 服务器错误：可能是数据库连接问题');
    console.log('   建议检查 Vercel 环境变量配置');
  }
}

async function generateRepairInstructions(results) {
  const hasServerErrors = results.some(r => typeof r.status === 'number' && r.status >= 500);
  const hasTimeouts = results.some(r => r.status === 'TIMEOUT');
  const allFailed = results.every(r => !r.success);
  
  console.log('🛠️  修复建议');
  console.log('-'.repeat(30));
  
  if (allFailed) {
    console.log('🚨 紧急修复流程:');
    console.log('1. 检查 Vercel 项目是否在线');
    console.log('2. 验证域名配置');
    console.log('3. 检查基础网络连接');
  } else if (hasServerErrors) {
    console.log('🔧 数据库修复流程:');
    console.log('1. 登录 Vercel → umami-teal-omega 项目');
    console.log('2. 检查环境变量: DATABASE_URL, DIRECT_DATABASE_URL');
    console.log('3. 确认 Supabase 数据库状态');
    console.log('4. 重新部署项目');
  } else if (hasTimeouts) {
    console.log('⚡ 性能优化建议:');
    console.log('1. 检查 Supabase 数据库性能');
    console.log('2. 优化数据库查询');
    console.log('3. 考虑升级服务计划');
  } else {
    console.log('🎯 服务正常运行!');
    console.log('✨ 无需额外修复');
  }
  
  console.log();
  console.log('📖 详细修复指南: UMAMI_DATABASE_REPAIR_GUIDE.md');
}

async function main() {
  try {
    const results = await testUmamiService();
    await analyzeResults(results);
    await generateRepairInstructions(results);
    
    console.log('🏁 检测完成!');
    console.log('📊 BuTP 项目访问统计功能始终可用（智能降级机制）');
    
  } catch (error) {
    console.error('❌ 检测过程出错:', error.message);
    process.exit(1);
  }
}

// 运行检测
main(); 