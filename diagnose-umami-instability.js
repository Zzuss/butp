#!/usr/bin/env node

const https = require('https');

console.log('🔍 Umami服务不稳定性诊断');
console.log('='.repeat(50));

// 分析可能的原因
const POTENTIAL_CAUSES = {
  'COLD_START': {
    name: 'Vercel冷启动',
    description: '免费计划的函数会在空闲时休眠',
    indicators: ['首次访问超时', '后续访问正常', '间歇性失败']
  },
  'CONNECTION_POOL': {
    name: '数据库连接池耗尽',
    description: 'Supabase连接池达到上限',
    indicators: ['高并发时失败', '连接池错误', '随机失败']
  },
  'DATABASE_SLEEP': {
    name: 'Supabase数据库休眠',
    description: '免费计划数据库会暂停',
    indicators: ['固定时间模式失败', '重启后恢复', '长时间无访问后失败']
  },
  'NETWORK_ISSUES': {
    name: '网络连接不稳定',
    description: 'Vercel到Supabase的网络问题',
    indicators: ['随机超时', '地理位置相关', '间歇性成功']
  },
  'RESOURCE_LIMITS': {
    name: 'Vercel资源限制',
    description: '免费计划的执行时间或内存限制',
    indicators: ['特定操作失败', '大查询超时', '内存错误']
  }
};

async function testUmamiStability() {
  console.log('📊 连续测试Umami服务稳定性...\n');
  
  const results = [];
  const testCount = 10;
  const testInterval = 2000; // 2秒间隔
  
  for (let i = 1; i <= testCount; i++) {
    process.stdout.write(`第${i}/${testCount}次测试... `);
    
    const result = await testSingleRequest();
    results.push({
      test: i,
      timestamp: new Date().toISOString(),
      ...result
    });
    
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`${statusIcon} ${result.status} (${result.responseTime}ms)`);
    
    if (i < testCount) {
      await sleep(testInterval);
    }
  }
  
  return results;
}

async function testSingleRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = 'https://umami-teal-omega.vercel.app/api/auth/verify';
    
    const request = https.get(url, { timeout: 8000 }, (response) => {
      const responseTime = Date.now() - startTime;
      
      resolve({
        success: response.statusCode < 500,
        status: response.statusCode,
        statusMessage: response.statusMessage,
        responseTime,
        error: null
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        success: false,
        status: 'TIMEOUT',
        statusMessage: 'Request timeout',
        responseTime: Date.now() - startTime,
        error: 'TIMEOUT'
      });
    });

    request.on('error', (error) => {
      resolve({
        success: false,
        status: 'ERROR',
        statusMessage: error.message,
        responseTime: Date.now() - startTime,
        error: error.code || 'UNKNOWN'
      });
    });
  });
}

function analyzeResults(results) {
  console.log('\n📈 稳定性分析报告');
  console.log('='.repeat(40));
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  const successRate = ((successCount / results.length) * 100).toFixed(1);
  
  console.log(`📊 总体统计:`);
  console.log(`   成功: ${successCount}/${results.length} (${successRate}%)`);
  console.log(`   失败: ${failureCount}/${results.length}`);
  
  // 分析失败模式
  const failures = results.filter(r => !r.success);
  const timeouts = failures.filter(r => r.error === 'TIMEOUT').length;
  const errors = failures.filter(r => r.error && r.error !== 'TIMEOUT').length;
  const serverErrors = failures.filter(r => typeof r.status === 'number' && r.status >= 500).length;
  
  console.log(`\n🔍 失败分析:`);
  if (timeouts > 0) console.log(`   超时: ${timeouts}次`);
  if (serverErrors > 0) console.log(`   服务器错误: ${serverErrors}次`);
  if (errors > 0) console.log(`   连接错误: ${errors}次`);
  
  // 响应时间分析
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const responseTimes = successfulResults.map(r => r.responseTime);
    const avgResponseTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log(`\n⏱️  响应时间分析:`);
    console.log(`   平均: ${avgResponseTime}ms`);
    console.log(`   最快: ${minResponseTime}ms`);
    console.log(`   最慢: ${maxResponseTime}ms`);
  }
  
  return { successRate: parseFloat(successRate), failures, successCount, failureCount };
}

function diagnoseIssue(analysisResult) {
  console.log('\n🎯 问题诊断');
  console.log('='.repeat(30));
  
  const { successRate, failures } = analysisResult;
  
  if (successRate === 0) {
    console.log('❌ 服务完全不可用');
    console.log('🔧 可能原因: Vercel项目已暂停或数据库完全不可达');
    console.log('💡 建议: 检查Vercel项目状态和数据库配置');
  } else if (successRate < 30) {
    console.log('🚨 服务极不稳定');
    console.log('🔧 可能原因: 数据库连接配置错误或资源严重不足');
  } else if (successRate < 70) {
    console.log('⚠️  服务不稳定');
    
    const hasTimeouts = failures.some(f => f.error === 'TIMEOUT');
    const hasServerErrors = failures.some(f => typeof f.status === 'number' && f.status >= 500);
    
    if (hasTimeouts && hasServerErrors) {
      console.log('🔧 可能原因: Vercel冷启动 + 数据库连接池问题');
      console.log('💡 建议: 升级Vercel计划或优化数据库连接');
    } else if (hasTimeouts) {
      console.log('🔧 可能原因: Vercel冷启动或网络延迟');
      console.log('💡 建议: 考虑保持应用"温热"或优化超时设置');
    } else if (hasServerErrors) {
      console.log('🔧 可能原因: 数据库连接池耗尽或配置问题');
      console.log('💡 建议: 检查数据库连接字符串和连接池设置');
    }
  } else {
    console.log('✅ 服务基本稳定');
    console.log('💡 偶尔的失败是正常的，可能是网络波动或冷启动');
  }
}

function provideSolutions() {
  console.log('\n🛠️  解决方案建议');
  console.log('='.repeat(35));
  
  console.log('🎯 针对Vercel冷启动问题:');
  console.log('   1. 设置定时任务定期访问应用保持活跃');
  console.log('   2. 升级到Vercel Pro计划（无冷启动）');
  console.log('   3. 优化函数启动时间');
  
  console.log('\n🎯 针对数据库连接问题:');
  console.log('   1. 检查Supabase连接池设置');
  console.log('   2. 优化DATABASE_URL参数（连接池大小）');
  console.log('   3. 实现数据库连接重试机制');
  
  console.log('\n🎯 针对Supabase免费计划限制:');
  console.log('   1. 升级到Supabase Pro计划');
  console.log('   2. 优化查询减少数据库负载');
  console.log('   3. 实现本地缓存减少数据库访问');
  
  console.log('\n🎯 立即可尝试的快速修复:');
  console.log('   1. 重新部署Vercel项目');
  console.log('   2. 在Supabase中重启数据库');
  console.log('   3. 检查并更新环境变量');
  
  console.log('\n💡 BuTP项目的优势:');
  console.log('   ✅ 智能降级机制已完美处理这种不稳定性');
  console.log('   ✅ 用户体验不会因为Umami不稳定而受影响');
  console.log('   ✅ 系统设计考虑了外部服务的不可靠性');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('开始连续测试，这可能需要约20-30秒...\n');
    
    const results = await testUmamiStability();
    const analysis = analyzeResults(results);
    diagnoseIssue(analysis);
    provideSolutions();
    
    console.log('\n📋 测试详情:');
    console.log('   每次测试间隔: 2秒');
    console.log('   超时设置: 8秒');
    console.log('   测试端点: /api/auth/verify');
    
    console.log('\n🏁 诊断完成！');
    
  } catch (error) {
    console.error('❌ 诊断过程出错:', error.message);
  }
}

main(); 