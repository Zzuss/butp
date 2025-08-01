const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHashInTables() {
  const testHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
  
  console.log('🔍 检查哈希值在各个表中的存在情况...\n');
  
  const tables = [
    'cohort_predictions',
    'academic_results',
    'cohort_probability',
    'student_profiles',
    'course_enrollments',
    'grade_records',
    'student_records'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .or(`SNH.eq.${testHash},student_hash.eq.${testHash},hash.eq.${testHash},student_id.eq.${testHash},id.eq.${testHash}`)
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ ${table}: 找到 ${data.length} 条记录`);
      } else {
        console.log(`❌ ${table}: 未找到记录`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // 查找一个在cohort_predictions表中存在的哈希值
  console.log('\n🔍 查找在cohort_predictions表中存在的哈希值...');
  try {
    const { data, error } = await supabase
      .from('cohort_predictions')
      .select('SNH')
      .limit(1);
    
    if (error) {
      console.log(`❌ 查询cohort_predictions失败: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`✅ 找到哈希值: ${data[0].SNH}`);
    } else {
      console.log('❌ cohort_predictions表为空');
    }
  } catch (err) {
    console.log(`❌ 查询失败: ${err.message}`);
  }
}

checkHashInTables(); 