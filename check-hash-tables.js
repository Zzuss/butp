const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHashInTables() {
  const testHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
  
  console.log('🔍 检查哈希值在各个表中的存在情况...\n');
  
  const tables = [
    'Cohort2023_Predictions_ai',
  'Cohort2023_Predictions_ee',
  'Cohort2023_Predictions_tewm',
  'Cohort2023_Predictions_iot',
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
  
  // 查找一个在专业预测表中存在的哈希值
  console.log('\n🔍 查找在专业预测表中存在的哈希值...');
  
  // 尝试从四个专业预测表中查找数据
  let foundData = null;
  let foundTable = '';
  
  for (const table of ['Cohort2023_Predictions_ai', 'Cohort2023_Predictions_ee', 'Cohort2023_Predictions_tewm', 'Cohort2023_Predictions_iot']) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('SNH')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        foundData = data;
        foundTable = table;
        break;
      }
    } catch (tableError) {
      console.log(`❌ 查询${table}失败: ${tableError.message}`);
      continue;
    }
  }
  
  if (foundData) {
    console.log(`✅ 在${foundTable}中找到哈希值: ${foundData[0].SNH}`);
  } else {
    console.log('❌ 所有专业预测表都为空或查询失败');
  }
}

checkHashInTables(); 