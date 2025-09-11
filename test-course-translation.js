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

// 测试课程名称翻译功能
async function testCourseTranslation() {
  try {
    console.log('🔍 测试课程名称翻译功能...');
    
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
    
    // 3. 测试课程名称翻译
    if (results && results.length > 0) {
      console.log('\n📚 测试课程名称翻译...');
      
      // 获取前5门课程进行翻译测试
      const testCourses = results.slice(0, 5);
      
      for (const course of testCourses) {
        console.log(`\n🔍 测试课程: ${course.Course_Name}`);
        
        // 查询翻译表
        const { data: translation, error: transError } = await supabase
          .from('courses_translations')
          .select('Course_Name_Eng')
          .eq('Course_Name_Chi', course.Course_Name)
          .single();
        
        if (transError) {
          if (transError.code === 'PGRST116') {
            console.log(`  ❌ 未找到英文翻译: ${course.Course_Name}`);
          } else {
            console.log(`  ❌ 查询翻译失败: ${transError.message}`);
          }
        } else if (translation && translation.Course_Name_Eng) {
          console.log(`  ✅ 找到英文翻译: ${translation.Course_Name_Eng}`);
        } else {
          console.log(`  ⚠️  翻译字段为空: ${course.Course_Name}`);
        }
      }
      
      // 4. 测试批量翻译性能
      console.log('\n⚡ 测试批量翻译性能...');
      const startTime = Date.now();
      
      const translatedResults = await Promise.all(
        testCourses.map(async (course) => {
          try {
            const { data: translation } = await supabase
              .from('courses_translations')
              .select('Course_Name_Eng')
              .eq('Course_Name_Chi', course.Course_Name)
              .single();
            
            return {
              ...course,
              course_name: translation?.Course_Name_Eng || course.Course_Name
            };
          } catch (error) {
            return {
              ...course,
              course_name: course.Course_Name
            };
          }
        })
      );
      
      const endTime = Date.now();
      console.log(`✅ 批量翻译完成，耗时: ${endTime - startTime}ms`);
      
      // 5. 显示翻译结果
      console.log('\n📊 翻译结果对比:');
      testCourses.forEach((original, index) => {
        const translated = translatedResults[index];
        console.log(`  ${index + 1}. ${original.Course_Name} → ${translated.course_name}`);
      });
      
    } else {
      console.log('📊 该哈希值没有对应的成绩数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testCourseTranslation();




















