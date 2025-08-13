// test-umami-database.js
const { createClient } = require('@supabase/supabase-js');

// 使用你的 Supabase 配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

console.log('🔗 测试 Umami 数据库连接...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUmamiDatabase() {
  try {
    // 1. 检查 Umami 表是否存在
    console.log('🔍 检查 Umami 表结构...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('account', 'user', 'website', 'session', 'event')
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      console.error('❌ 无法查询表结构:', tablesError);
    } else {
      console.log('✅ Umami 表查询成功:');
      console.log('📊 找到的表:', tables);
    }

    // 2. 检查具体表的数据
    const umamiTables = ['account', 'user', 'website', 'session', 'event'];
    
    for (const tableName of umamiTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${tableName} 表不存在或无法访问:`, error.message);
        } else {
          console.log(`✅ ${tableName} 表存在，记录数: ${count}`);
        }
      } catch (e) {
        console.log(`❌ ${tableName} 表测试失败:`, e.message);
      }
    }

    // 3. 如果 website 表存在，查看数据
    console.log('\n🔍 检查 website 表数据...');
    const { data: websiteData, error: websiteError } = await supabase
      .from('website')
      .select('*')
      .limit(5);

    if (websiteError) {
      console.error('❌ Website 表查询失败:', websiteError);
    } else {
      console.log('✅ Website 表数据:');
      console.log(websiteData);
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

testUmamiDatabase();