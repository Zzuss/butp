// 查询cohort_probability表中第二行的学号
const { createClient } = require('@supabase/supabase-js');

// 直接使用已知的Supabase配置（与test-db-connection.js相同）
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

console.log('🔗 连接数据库...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function querySecondRow() {
  try {
    console.log('🔍 查询cohort_probability表中第二行的学号...');
    
    // 首先检查表的总记录数
    const { count, error: countError } = await supabase
      .from('cohort_probability')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ 获取记录数失败:', countError);
      return;
    }
    
    console.log(' cohort_probability表总记录数:', count);
    
    if (count < 2) {
      console.log('⚠️  表中记录数少于2条，无法获取第二行');
      return;
    }
    
    // 查询第二行数据（使用range，索引从0开始，所以第二行是索引1）
    const { data, error } = await supabase
      .from('cohort_probability')
      .select('SNH, major, proba_1, proba_2, proba_3')
      .range(1, 1); // 获取第二行（索引1）
    
    if (error) {
      console.error('❌ 查询第二行失败:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ 成功获取第二行数据:');
      console.log('📝 学号哈希值:', data[0].SNH);
      console.log('🎓 专业:', data[0].major || '未知');
      console.log(' 国内读研概率:', data[0].proba_1 || '未知');
      console.log(' 海外读研概率:', data[0].proba_2 || '未知');
      console.log('🎯 毕业概率:', data[0].proba_3 || '未知');
      
      // 显示完整的哈希值（用于复制）
      console.log('\n📋 完整哈希值（用于登录）:');
      console.log(data[0].SNH);
      
    } else {
      console.log('⚠️  未找到第二行数据');
    }
    
    // 额外查询前几行作为参考
    console.log('\n🔍 前5行数据概览:');
    const { data: firstFive, error: firstFiveError } = await supabase
      .from('cohort_probability')
      .select('SNH, major')
      .range(0, 4);
    
    if (firstFiveError) {
      console.error('❌ 查询前5行失败:', firstFiveError);
    } else if (firstFive && firstFive.length > 0) {
      firstFive.forEach((row, index) => {
        console.log(`第${index + 1}行: ${row.SNH.substring(0, 16)}... (${row.major || '未知专业'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error);
  }
}

querySecondRow();