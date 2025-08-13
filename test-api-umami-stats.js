#!/usr/bin/env node

const http = require('http');

console.log('🔍 测试 /api/umami-stats API 端点');
console.log('='.repeat(40));

async function testUmamiStatsAPI() {
  return new Promise((resolve) => {
    console.log('📡 发送请求到 http://localhost:3000/api/umami-stats');
    
    const request = http.get('http://localhost:3000/api/umami-stats', (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log(`\n✅ 响应状态: ${response.statusCode}`);
        console.log(`📊 响应头: ${JSON.stringify(response.headers, null, 2)}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`\n📋 响应数据:`);
          console.log(`   success: ${jsonData.success}`);
          console.log(`   timestamp: ${jsonData.timestamp}`);
          
          if (jsonData.data) {
            console.log(`   data.daily.pageviews: ${jsonData.data.daily?.pageviews || 'N/A'}`);
            console.log(`   data.weekly.pageviews: ${jsonData.data.weekly?.pageviews || 'N/A'}`);
            console.log(`   data.monthly.pageviews: ${jsonData.data.monthly?.pageviews || 'N/A'}`);
            console.log(`   data.halfYearly.pageviews: ${jsonData.data.halfYearly?.pageviews || 'N/A'}`);
            
            if (jsonData.data.meta) {
              console.log(`   meta.dataSource: ${jsonData.data.meta.dataSource || 'N/A'}`);
              console.log(`   meta.usingFallback: ${jsonData.data.meta.usingFallback || 'N/A'}`);
              console.log(`   meta.note: ${jsonData.data.meta.note || 'N/A'}`);
            }
          }
          
          if (jsonData.error) {
            console.log(`   error: ${jsonData.error}`);
          }
          
          resolve({ success: true, data: jsonData });
        } catch (parseError) {
          console.log(`❌ JSON解析失败: ${parseError.message}`);
          console.log(`📄 原始响应数据:`);
          console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
          resolve({ success: false, error: parseError.message, rawData: data });
        }
      });
    });
    
    request.on('error', (error) => {
      console.log(`❌ 请求失败: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    request.on('timeout', () => {
      console.log(`❌ 请求超时`);
      request.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    request.setTimeout(10000); // 10秒超时
  });
}

async function main() {
  try {
    const result = await testUmamiStatsAPI();
    
    console.log('\n🎯 测试结果分析:');
    
    if (result.success && result.data) {
      if (result.data.success) {
        console.log('✅ API正常工作，返回了数据');
        
        if (result.data.data?.meta?.usingFallback) {
          console.log('📊 使用了智能降级数据 - 这是正常的');
        } else {
          console.log('🎉 获取到了真实的Umami数据');
        }
      } else {
        console.log('⚠️  API返回了错误响应');
        console.log('🔧 建议: 检查服务器端的错误处理逻辑');
      }
    } else {
      console.log('❌ API无法访问或返回无效数据');
      console.log('🔧 建议: 检查开发服务器是否在3000端口运行');
    }
    
    console.log('\n💡 如果API工作正常但前端仍显示"暂无统计数据"，');
    console.log('   可能是前端组件的错误处理逻辑有问题');
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
  }
}

main(); 