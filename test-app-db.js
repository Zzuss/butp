const { createClient } = require('@supabase/supabase-js');

// 使用应用中的相同配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

console.log('🔗 Testing application database connection...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAppConnection() {
  try {
    console.log('🔍 Testing hash validation (same as app)...');
    
    // 测试应用中使用相同的哈希验证逻辑
    const testHash = 'a97af3ae898a...'; // 从日志中看到的哈希
    console.log('Testing hash:', testHash);
    
    const { data, error } = await supabase
      .from('academic_results')
      .select('SNH')
      .eq('SNH', testHash)
      .limit(1);
    
    if (error) {
      console.error('❌ Hash validation failed:', error);
      return;
    }
    
    console.log('✅ Hash validation successful!');
    console.log('🔍 Hash found:', data && data.length > 0);
    console.log('📊 Hash data:', data);
    
    // 测试另一个已知存在的哈希
    console.log('🔍 Testing known valid hash...');
    const knownHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
    
    const { data: knownData, error: knownError } = await supabase
      .from('academic_results')
      .select('SNH, Course_Name, Grade')
      .eq('SNH', knownHash)
      .limit(3);
    
    if (knownError) {
      console.error('❌ Known hash validation failed:', knownError);
      return;
    }
    
    console.log('✅ Known hash validation successful!');
    console.log('🔍 Known hash found:', knownData && knownData.length > 0);
    console.log('📊 Known hash data:', knownData);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAppConnection(); 