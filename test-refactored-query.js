require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试重构后的查询逻辑
async function testRefactoredQuery() {
  try {
    console.log('🔍 测试重构后的查询逻辑...');
    
    // 1. 测试不同的哈希值格式
    const testHashes = [
      '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890',  // 64位哈希值
      'dev-353214f8',  // 开发环境用户ID（应该被拒绝）
      'test-user-123',  // 普通用户ID（应该被拒绝）
      'abc123',  // 短字符串（应该被拒绝）
      '',  // 空字符串（应该被拒绝）
      'invalid-hash-123456789012345678901234567890123456789012345678901234567890'  // 64位但格式错误
    ];
    
    for (const hash of testHashes) {
      console.log(`\n📊 测试哈希值: "${hash}"`);
      
      // 2. 验证哈希值格式
      const isValidHash = hash && hash.length === 64 && /^[a-f0-9]{64}$/i.test(hash);
      console.log(`🔍 哈希值验证: ${isValidHash ? '✅ 有效' : '❌ 无效'}`);
      
      if (!isValidHash) {
        console.log('⏭️  跳过查询，继续下一个测试');
        continue;
      }
      
      // 3. 测试查询逻辑
      try {
        const { data: results, error } = await supabase
          .from('academic_results')
          .select('*')
          .eq('SNH', hash)
          .order('Semester_Offered', { ascending: true });
        
        if (error) {
          console.log(`❌ 查询失败: ${error.message}`);
          continue;
        }
        
        console.log(`✅ 查询成功! 结果数量: ${results?.length || 0}`);
        
        if (results && results.length > 0) {
          console.log('📊 前3条记录:');
          results.slice(0, 3).forEach((result, index) => {
            console.log(`  ${index + 1}. 课程: ${result.Course_Name}, 学期: ${result.Semester_Offered}, 学分: ${result.Credit}, 成绩: ${result.Grade}`);
          });
          
          // 4. 测试数据转换逻辑
          console.log('🔄 测试数据转换逻辑...');
          const courseResults = results.map(result => ({
            id: result.id || `${result.Course_ID || 'unknown'}-${result.Semester_Offered || 'unknown'}`,
            course_name: result.Course_Name || '未知课程',
            course_id: result.Course_ID || '未知编号',
            grade: result.Grade || '无成绩',
            credit: result.Credit || '0',
            semester: result.Semester_Offered || '未知学期',
            course_type: result.Course_Type || '未知类型',
            course_attribute: result.Course_Attribute || '未知属性',
            exam_type: result.Exam_Type || '未知考试类型'
          }));
          
          console.log('✅ 数据转换成功!');
          console.log('📊 转换后的前3条记录:');
          courseResults.slice(0, 3).forEach((result, index) => {
            console.log(`  ${index + 1}. 课程: ${result.course_name}, 学期: ${result.semester}, 学分: ${result.credit}, 成绩: ${result.grade}`);
          });
        } else {
          console.log('📊 该哈希值没有对应的成绩数据');
        }
        
      } catch (queryError) {
        console.log(`❌ 查询过程中发生错误: ${queryError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testRefactoredQuery();
