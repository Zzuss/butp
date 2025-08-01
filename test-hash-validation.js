// 测试哈希值检测功能
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 直接使用已知的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

console.log('🔗 连接数据库...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : '未设置');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未设置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testHashValidation() {
  // 测试哈希值：来自cohort_probability表第二行
  const testHash = 'cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb';
  
  console.log('\n🔍 测试哈希值检测功能...');
  console.log('测试哈希值:', testHash.substring(0, 16) + '...');
  
  // 检查所有包含SNH字段的表
  const tables = ['academic_results', 'cohort_probability', 'target_scores', 'source2_scores'];
  
  for (const table of tables) {
    try {
      console.log(`\n📋 检查表: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('SNH')
        .eq('SNH', testHash)
        .limit(1);
      
      if (error) {
        console.error(`❌ 查询表 ${table} 失败:`, error.message);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ 哈希值在表 ${table} 中找到！`);
        
        // 获取更多信息
        const { data: fullData, error: fullError } = await supabase
          .from(table)
          .select('*')
          .eq('SNH', testHash)
          .limit(1);
        
        if (!fullError && fullData && fullData.length > 0) {
          const record = fullData[0];
          console.log(`📝 记录信息:`);
          console.log(`   - 表: ${table}`);
          if (record.major) console.log(`   - 专业: ${record.major}`);
          if (record.proba_1) console.log(`   - 国内读研概率: ${record.proba_1}`);
          if (record.proba_2) console.log(`   - 海外读研概率: ${record.proba_2}`);
          if (record.proba_3) console.log(`   - 毕业概率: ${record.proba_3}`);
        }
      } else {
        console.log(`❌ 哈希值在表 ${table} 中未找到`);
      }
    } catch (tableError) {
      console.error(`❌ 查询表 ${table} 时发生错误:`, tableError.message);
    }
  }
  
  console.log('\n🎯 测试完成！');
}

testHashValidation().catch(console.error); 