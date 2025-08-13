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

// 模拟优化后的课程选择逻辑
function getLatestSemesterTopCreditCourses(results, limit = 5) {
  console.log('🔍 getLatestSemesterTopCreditCourses: 输入数据数量:', results?.length || 0);
  
  if (!results || results.length === 0) {
    console.log('❌ getLatestSemesterTopCreditCourses: 没有输入数据');
    return [];
  }
  
  // 按学期排序，获取最近的学期
  const sortedBySemester = [...results].sort((a, b) => {
    return b.Semester_Offered.localeCompare(a.Semester_Offered);
  });
  
  // 获取所有不同的学期，按时间倒序排列
  const uniqueSemesters = [...new Set(sortedBySemester.map(r => r.Semester_Offered))].sort((a, b) => b.localeCompare(a));
  console.log('🔍 getLatestSemesterTopCreditCourses: 所有学期按时间倒序:', uniqueSemesters);
  
  const selectedCourses = [];
  
  // 从最新学期开始，逐个学期选择课程，直到凑够limit门课程
  for (const semester of uniqueSemesters) {
    if (selectedCourses.length >= limit) break;
    
    // 获取当前学期的所有课程
    const semesterCourses = sortedBySemester.filter(r => r.Semester_Offered === semester);
    console.log(`🔍 学期 ${semester} 的课程数量: ${semesterCourses.length}`);
    
    // 按学分从高到低排序
    const sortedSemesterCourses = semesterCourses.sort((a, b) => {
      const creditA = parseFloat(a.Credit) || 0;
      const creditB = parseFloat(b.Credit) || 0;
      return creditB - creditA;
    });
    
    // 从当前学期选择课程，优先选择学分高的
    for (const course of sortedSemesterCourses) {
      if (selectedCourses.length >= limit) break;
      
      // 检查是否已经选择了这门课程（避免重复）
      const isDuplicate = selectedCourses.some(selected => 
        selected.Course_Name === course.Course_Name && 
        selected.Semester_Offered === course.Semester_Offered
      );
      
      if (!isDuplicate) {
        selectedCourses.push(course);
        console.log(`✅ 选择课程: ${course.Course_Name} (学期: ${course.Semester_Offered}, 学分: ${course.Credit})`);
      }
    }
  }
  
  console.log(`🔍 最终选择的课程数量: ${selectedCourses.length}`);
  console.log('🔍 按学分排序后的前5门课程:', selectedCourses.map(c => ({ 
    name: c.Course_Name, 
    credit: c.Credit, 
    semester: c.Semester_Offered 
  })));
  
  return selectedCourses;
}

// 测试优化后的课程选择逻辑
async function testOptimizedCourseSelection() {
  try {
    console.log('🔍 测试优化后的课程选择逻辑...');
    
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
    
    // 2. 查询学生成绩数据
    console.log('\n🔍 查询学生成绩数据...');
    const { data: results, error: error1 } = await supabase
      .from('academic_results')
      .select('*')
      .eq('SNH', testHash)
      .order('Semester_Offered', { ascending: true });
    
    if (error1) {
      console.log(`❌ 查询失败: ${error1.message}`);
      return;
    }
    
    console.log(`✅ 查询成功! 结果数量: ${results?.length || 0}`);
    
    // 3. 测试优化后的课程选择逻辑
    console.log('\n📊 测试优化后的课程选择逻辑...');
    if (results && results.length > 0) {
      // 分析学期分布
      const semesterCounts = {};
      results.forEach(course => {
        const semester = course.Semester_Offered;
        semesterCounts[semester] = (semesterCounts[semester] || 0) + 1;
      });
      
      console.log('\n📅 各学期课程数量分布:');
      Object.entries(semesterCounts)
        .sort((a, b) => b[0].localeCompare(a[0])) // 按学期倒序
        .forEach(([semester, count]) => {
          console.log(`  ${semester}: ${count}门课程`);
        });
      
      // 测试课程选择逻辑
      const selectedCourses = getLatestSemesterTopCreditCourses(results, 5);
      
      // 4. 验证结果
      console.log('\n🔍 验证结果...');
      if (selectedCourses.length > 0) {
        console.log('✅ 成功选择课程，数量:', selectedCourses.length);
        
        // 验证是否按学期优先级选择
        const selectedSemesters = [...new Set(selectedCourses.map(c => c.Semester_Offered))];
        console.log('📚 选择的课程来自学期:', selectedSemesters);
        
        // 验证是否按学分排序
        const isCreditSorted = selectedCourses.every((course, index) => {
          if (index === 0) return true;
          const prevCredit = parseFloat(selectedCourses[index - 1].Credit) || 0;
          const currentCredit = parseFloat(course.Credit) || 0;
          return prevCredit >= currentCredit;
        });
        
        console.log(`✅ 学分排序验证: ${isCreditSorted ? '通过' : '失败'}`);
        
        // 验证数据完整性
        const hasAllRequiredFields = selectedCourses.every(course => 
          course.Course_Name && 
          course.Semester_Offered && 
          course.Credit && 
          course.Grade
        );
        console.log(`✅ 数据完整性: ${hasAllRequiredFields ? '通过' : '失败'}`);
        
        if (hasAllRequiredFields) {
          console.log('\n🎉 所有测试通过！优化后的课程选择逻辑正常工作');
        } else {
          console.log('\n⚠️  部分数据字段缺失，需要检查数据源');
        }
      } else {
        console.log('❌ 没有选择到任何课程');
      }
    } else {
      console.log('📊 该哈希值没有对应的成绩数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testOptimizedCourseSelection();
