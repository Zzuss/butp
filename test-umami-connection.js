// Umami 连接测试脚本
// 用于实时监控 Umami 服务状态

const https = require('https');

const UMAMI_BASE_URL = 'https://umami-teal-omega.vercel.app';
const UMAMI_WEBSITE_ID = '4bd87e19-b721-41e5-9de5-0c694e046425';

async function testConnection() {
    console.log('🔄 测试新的 Umami 连接状态...\n');
    
    // 测试1: 基础健康检查
    console.log('1. 测试 Umami 服务健康状态...');
    try {
        const response = await fetch(`${UMAMI_BASE_URL}/api/heartbeat`, {
            method: 'GET',
            headers: {
                'User-Agent': 'BuTP-Test/1.0'
            },
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Umami 服务正常:', data);
        } else {
            console.log('❌ Umami 服务响应异常:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('❌ Umami 服务连接失败:', error.message);
    }

    // 测试2: 脚本文件可用性
    console.log('\n2. 测试追踪脚本...');
    try {
        const response = await fetch(`${UMAMI_BASE_URL}/script.js`, {
            method: 'GET',
            headers: {
                'User-Agent': 'BuTP-Test/1.0'
            },
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const script = await response.text();
            if (script.includes('umami')) {
                console.log('✅ 追踪脚本正常加载');
            } else {
                console.log('⚠️ 追踪脚本内容异常');
            }
        } else {
            console.log('❌ 追踪脚本加载失败:', response.status);
        }
    } catch (error) {
        console.log('❌ 追踪脚本连接失败:', error.message);
    }

    // 测试3: 主站点访问
    console.log('\n3. 测试主站点访问...');
    try {
        const response = await fetch(UMAMI_BASE_URL, {
            method: 'GET',
            headers: {
                'User-Agent': 'BuTP-Test/1.0'
            },
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const html = await response.text();
            if (html.includes('Umami')) {
                console.log('✅ 主站点正常访问');
            } else {
                console.log('⚠️ 主站点可访问，但内容异常');
            }
        } else {
            console.log('❌ 主站点访问失败:', response.status);
        }
    } catch (error) {
        console.log('❌ 主站点连接失败:', error.message);
    }

    console.log('\n📊 测试完成!\n');
    console.log('🔗 访问链接:');
    console.log(`   Umami 仪表板: ${UMAMI_BASE_URL}`);
    console.log(`   网站ID: ${UMAMI_WEBSITE_ID}`);
}

// 检查是否有命令行参数 --monitor
if (process.argv.includes('--monitor')) {
    console.log('🔄 启动持续监控模式 (每30秒检查一次)...\n');
    
    // 立即执行一次
    testConnection();
    
    // 设置定时执行
    setInterval(() => {
        console.log('\n' + '='.repeat(50));
        console.log('🕐 定时检查 -', new Date().toLocaleString());
        console.log('='.repeat(50));
        testConnection();
    }, 30000);
    
} else {
    // 单次执行
    testConnection();
} 