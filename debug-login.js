// 调试登录映射功能
const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugLogin(studentNumber) {
  console.log(`\n🔍 调试学号登录: ${studentNumber}`);
  console.log('=====================================');
  
  try {
    // 1. 检查映射表
    console.log('📋 1. 检查学号映射表...');
    const { data: mappingData, error: mappingError } = await supabase
      .from('student_number_hash_mapping')
      .select('student_hash')
      .eq('student_number', studentNumber)
      .limit(1);
    
    if (mappingError) {
      console.error('❌ 映射查询错误:', mappingError);
      return;
    }
    
    if (!mappingData || mappingData.length === 0) {
      console.error('❌ 学号不在映射表中');
      return;
    }
    
    const studentHash = mappingData[0].student_hash;
    console.log(`✅ 找到哈希值: ${studentHash}`);
    
    // 2. 验证哈希值在academic_results表中
    console.log('\n📊 2. 验证哈希值在数据库中...');
    const { data: academicData, error: academicError } = await supabase
      .from('academic_results')
      .select('SNH')
      .eq('SNH', studentHash)
      .limit(1);
    
    if (academicError) {
      console.error('❌ 学术数据查询错误:', academicError);
      return;
    }
    
    if (!academicData || academicData.length === 0) {
      console.error('❌ 哈希值不在学术数据库中');
      return;
    }
    
    console.log('✅ 哈希值在学术数据库中有效');
    
    // 3. 计算记录数量
    console.log('\n📈 3. 统计记录数量...');
    const { count, error: countError } = await supabase
      .from('academic_results')
      .select('*', { count: 'exact', head: true })
      .eq('SNH', studentHash);
    
    if (countError) {
      console.error('❌ 计数查询错误:', countError);
      return;
    }
    
    console.log(`✅ 总记录数: ${count}`);
    
    // 4. 检查学生基本信息
    console.log('\n👤 4. 获取学生信息...');
    const { data: studentInfo, error: studentError } = await supabase
      .from('academic_results')
      .select('Current_Major')
      .eq('SNH', studentHash)
      .limit(1);
    
    if (studentError) {
      console.error('❌ 学生信息查询错误:', studentError);
      return;
    }
    
    if (studentInfo && studentInfo.length > 0) {
      console.log(`✅ 专业: ${studentInfo[0].Current_Major}`);
    }
    
    console.log('\n🎉 所有检查通过！学号登录应该可以正常工作');
    console.log('=====================================\n');
    
    return {
      success: true,
      studentNumber,
      studentHash,
      recordCount: count,
      major: studentInfo?.[0]?.Current_Major
    };
    
  } catch (error) {
    console.error('💥 调试过程发生错误:', error);
    return { success: false, error: error.message };
  }
}

// 测试目标学号
async function runDebug() {
  const testStudentNumbers = ['2023213592', '2023213398', '2023213035'];
  
  for (const studentNumber of testStudentNumbers) {
    await debugLogin(studentNumber);
  }
}

runDebug().catch(console.error);
