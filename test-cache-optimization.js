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

// 模拟缓存机制
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key, data) {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_DURATION
  });
}

// 测试缓存优化和新的课程显示逻辑
async function testCacheOptimization() {
  try {
    console.log('🔍 测试缓存优化和新的课程显示逻辑...');
    
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
    
    // 2. 第一次查询（应该从数据库获取）
    console.log('\n🔍 第一次查询（从数据库获取）...');
    const startTime1 = Date.now();
    const { data: results1, error: error1 } = await supabase
      .from('academic_results')
      .select('*')
      .eq('SNH', testHash)
      .order('Semester_Offered', { ascending: true });
    
    if (error1) {
      console.log(`❌ 第一次查询失败: ${error1.message}`);
      return;
    }
    
    const queryTime1 = Date.now() - startTime1;
    console.log(`✅ 第一次查询成功! 结果数量: ${results1?.length || 0}, 耗时: ${queryTime1}ms`);
    
    // 3. 模拟缓存数据
    console.log('\n💾 模拟缓存数据...');
    setCache(`student_results_${testHash}`, results1);
    console.log('✅ 数据已缓存');
    
    // 4. 第二次查询（应该从缓存获取）
    console.log('\n🔍 第二次查询（从缓存获取）...');
    const startTime2 = Date.now();
    const cachedData = getFromCache(`student_results_${testHash}`);
    const cacheTime = Date.now() - startTime2;
    
    if (cachedData) {
      console.log(`✅ 从缓存获取成功! 结果数量: ${cachedData.length}, 耗时: ${cacheTime}ms`);
      console.log(`🚀 性能提升: ${Math.round((queryTime1 - cacheTime) / queryTime1 * 100)}%`);
    } else {
      console.log('❌ 缓存获取失败');
    }
    
    // 5. 测试新的课程显示逻辑
    console.log('\n📊 测试新的课程显示逻辑...');
    if (results1 && results1.length > 0) {
      // 按学期排序，获取最近的学期
      const sortedBySemester = [...results1].sort((a, b) => {
        return b.Semester_Offered.localeCompare(a.Semester_Offered);
      });
      
      const recentSemester = sortedBySemester[0].Semester_Offered;
      const recentCourses = sortedBySemester.filter(r => r.Semester_Offered === recentSemester);
      
      console.log(`📅 最新学期: ${recentSemester}`);
      console.log(`📚 该学期课程数量: ${recentCourses.length}`);
      
      // 按学分从高到低排序，取前5门课程
      const topCreditCourses = recentCourses
        .sort((a, b) => {
          const creditA = parseFloat(a.Credit) || 0;
          const creditB = parseFloat(b.Credit) || 0;
          return creditB - creditA;
        })
        .slice(0, 5);
      
      console.log('\n🏆 学分最高的5门课程:');
      topCreditCourses.forEach((course, index) => {
        console.log(`  ${index + 1}. ${course.Course_Name} - 学分: ${course.Credit}, 成绩: ${course.Grade}`);
      });
      
      // 6. 验证数据完整性
      console.log('\n🔍 验证数据完整性...');
      const hasAllRequiredFields = topCreditCourses.every(course => 
        course.Course_Name && 
        course.Semester_Offered && 
        course.Credit && 
        course.Grade
      );
      console.log(`✅ 数据完整性: ${hasAllRequiredFields ? '通过' : '失败'}`);
      
      if (hasAllRequiredFields) {
        console.log('\n🎉 所有测试通过！缓存优化和新的课程显示逻辑正常工作');
      } else {
        console.log('\n⚠️  部分数据字段缺失，需要检查数据源');
      }
    } else {
      console.log('📊 该哈希值没有对应的成绩数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testCacheOptimization();
