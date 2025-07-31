const { createClient } = require('@supabase/supabase-js');

// 直接使用已知的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

console.log('🔗 Testing database connection...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing basic connection...');
    
    // 测试基本连接 - 获取记录总数
    const { count, error: countError } = await supabase
      .from('academic_results')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Database connection failed:', countError);
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('📊 Total records in academic_results:', count);
    
    // 测试获取一些样本数据
    console.log('🔍 Testing sample data retrieval...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('academic_results')
      .select('SNH, Course_Name, Grade')
      .limit(3);
    
    if (sampleError) {
      console.error('❌ Sample data retrieval failed:', sampleError);
      return;
    }
    
    console.log('✅ Sample data retrieval successful!');
    console.log('📊 Sample data:', sampleData);
    
    // 测试特定哈希值查询
    console.log('🔍 Testing hash validation...');
    const testHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
    
    const { data: hashData, error: hashError } = await supabase
      .from('academic_results')
      .select('SNH, Course_Name, Grade')
      .eq('SNH', testHash)
      .limit(5);
    
    if (hashError) {
      console.error('❌ Hash validation failed:', hashError);
      return;
    }
    
    console.log('✅ Hash validation successful!');
    console.log('🔍 Hash found:', hashData && hashData.length > 0);
    console.log('📊 Hash data count:', hashData ? hashData.length : 0);
    if (hashData && hashData.length > 0) {
      console.log('📊 First hash record:', hashData[0]);
    }
    
    // 测试其他表格
    console.log('🔍 Testing other tables...');
    
    // 测试 courses 表
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_name')
      .limit(3);
    
    if (coursesError) {
      console.error('❌ Courses table access failed:', coursesError);
    } else {
      console.log('✅ Courses table access successful!');
      console.log('📊 Sample courses:', coursesData);
    }
    
    // 测试 cohort_predictions 表
    const { data: predictionsData, error: predictionsError } = await supabase
      .from('cohort_predictions')
      .select('SNH, major')
      .limit(3);
    
    if (predictionsError) {
      console.error('❌ Cohort predictions table access failed:', predictionsError);
    } else {
      console.log('✅ Cohort predictions table access successful!');
      console.log('📊 Sample predictions:', predictionsData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection(); 