// test-umami-direct.js
const { Client } = require('pg');

// 从你的 DATABASE_URL 构建连接
const connectionString = "postgresql://postgres.xobadcxrcpjytutppnxm:%2CHCCheng20041207@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function testDirectConnection() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('🔗 测试直接数据库连接...');
    
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 测试查询
    const result = await client.query('SELECT NOW()');
    console.log('✅ 查询测试成功:', result.rows[0]);

    // 测试 Umami 表
    const accountResult = await client.query('SELECT user_id, username, role FROM account LIMIT 1');
    console.log('✅ Account 表查询成功:', accountResult.rows);

    const websiteResult = await client.query('SELECT website_id, name, domain FROM website LIMIT 1');
    console.log('✅ Website 表查询成功:', websiteResult.rows);

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  } finally {
    await client.end();
  }
}

testDirectConnection();