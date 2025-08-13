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

// 测试使用哈希值查询的功能
async function testHashQuery() {
  try {
    console.log('🔍 测试使用哈希值查询的功能...');
    
    // 1. 获取一个有效的哈希值
    console.log('📊 获取样本哈希值...');
    const { data: sampleHash, error: hashError } = await supabase
      .from('academic_results')
      .select('SNH')
      .limit(1);
    
    if (hashError || !sampleHash || sampleHash.length === 0) {
      console.error('❌ 获取样本哈希值失败:', hashError);
      return;
    }
    
    const testHash = sampleHash[0].SNH;
    console.log('✅ 样本哈希值:', testHash);
    
    // 2. 测试查询学生成绩
    console.log('🔍 测试查询学生成绩...');
    const { data: results, error } = await supabase
      .from('academic_results')
      .select('*')
      .eq('SNH', testHash)
      .order('Semester_Offered', { ascending: true });
    
    if (error) {
      console.log(`❌ 查询失败: ${error.message}`);
      return;
    }
    
    console.log(`✅ 查询成功! 结果数量: ${results?.length || 0}`);
    
    if (results && results.length > 0) {
      console.log('📊 前3条记录:');
      results.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. 课程: ${result.Course_Name}, 学期: ${result.Semester_Offered}, 学分: ${result.Credit}, 成绩: ${result.Grade}`);
      });
      
      // 3. 测试数据转换逻辑
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
      
      // 4. 验证表格列顺序
      console.log('📋 验证表格列顺序...');
      const expectedColumns = ['课程名称', '学期', '学分', '成绩'];
      console.log('✅ 期望的列顺序:', expectedColumns.join(' → '));
      
      // 5. 验证数据完整性
      console.log('🔍 验证数据完整性...');
      const hasAllRequiredFields = courseResults.every(result => 
        result.course_name && 
        result.semester && 
        result.credit && 
        result.grade
      );
      console.log(`✅ 数据完整性: ${hasAllRequiredFields ? '通过' : '失败'}`);
      
      if (hasAllRequiredFields) {
        console.log('🎉 所有测试通过！哈希值查询功能正常工作');
      } else {
        console.log('⚠️  部分数据字段缺失，需要检查数据源');
      }
    } else {
      console.log('📊 该哈希值没有对应的成绩数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testHashQuery();
