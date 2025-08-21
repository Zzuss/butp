async function testMergedData() {
  try {
    console.log('🧪 测试合并数据逻辑...\n');
    
    const testHash = 'f3f2cfd350b4eee35a7a01ea6658ac3f8111fd8c637f7bca7bec7c5f1a6a9f5d';
    
    // 获取来源1数据
    const source1Response = await fetch('http://localhost:3000/api/student-course-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentHash: testHash })
    });
    
    // 获取来源2数据
    const source2Response = await fetch('http://localhost:3000/api/source2-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentHash: testHash })
    });
    
    const source1Data = await source1Response.json();
    const source2Data = await source2Response.json();
    
    if (source1Data.success && source2Data.success) {
      console.log('✅ 两个数据源都获取成功');
      console.log(`📊 来源1课程数: ${source1Data.data.courseScores.length}`);
      console.log(`📊 来源2课程数: ${source2Data.data.source2Scores.length}`);
      
      // 测试合并逻辑
      const source1Courses = source1Data.data.courseScores;
      const source2Courses = source2Data.data.source2Scores;
      
      // 模拟合并逻辑
      const allCourses = [];
      const processedCourseNames = new Set();
      
      // 第一步：先置入来源2的数据
      console.log('\n📋 第一步：处理来源2数据');
      source2Courses.forEach(course => {
        if (course.score !== null && course.score !== undefined && course.score !== 0) {
          allCourses.push(course);
          processedCourseNames.add(course.courseName);
          console.log(`✅ 添加来源2: ${course.courseName} (成绩: ${course.score})`);
        } else {
          console.log(`❌ 跳过来源2: ${course.courseName} (成绩: ${course.score})`);
        }
      });
      
      // 第二步：再置入来源1的数据
      console.log('\n📋 第二步：处理来源1数据');
      source1Courses.forEach(course => {
        if (course.score !== null && course.score !== undefined) {
          const existingIndex = allCourses.findIndex(c => c.courseName === course.courseName);
          
          if (existingIndex >= 0) {
            // 冲突情况：用来源1成绩覆盖
            const oldScore = allCourses[existingIndex].score;
            allCourses[existingIndex] = {
              ...allCourses[existingIndex],
              score: course.score,
              source: '专业预测表 (覆盖)'
            };
            console.log(`🔄 覆盖冲突: ${course.courseName} (来源2: ${oldScore} → 来源1: ${course.score})`);
          } else {
            // 新课程：直接添加
            allCourses.push({
              ...course,
              source: '专业预测表'
            });
            processedCourseNames.add(course.courseName);
            console.log(`✅ 添加来源1: ${course.courseName} (成绩: ${course.score})`);
          }
        } else {
          console.log(`❌ 跳过来源1: ${course.courseName} (成绩: ${course.score})`);
        }
      });
      
      console.log('\n📊 合并结果统计:');
      console.log(`总课程数: ${allCourses.length}`);
      console.log(`来源2课程: ${allCourses.filter(c => c.source === 'academic_results').length}`);
      console.log(`来源1课程: ${allCourses.filter(c => c.source === '专业预测表').length}`);
console.log(`覆盖课程: ${allCourses.filter(c => c.source === '专业预测表 (覆盖)').length}`);
      
      // 显示前10个合并后的课程
      console.log('\n📋 前10个合并后的课程:');
      allCourses.slice(0, 10).forEach((course, index) => {
        console.log(`${index + 1}. ${course.courseName}`);
        console.log(`   来源: ${course.source}`);
        console.log(`   成绩: ${course.score}`);
        console.log(`   学期: ${course.semester}`);
        console.log(`   分类: ${course.category}`);
        console.log(`   学分: ${course.credit}`);
        console.log('');
      });
      
    } else {
      console.log('❌ 数据获取失败');
      if (!source1Data.success) console.log('来源1失败:', source1Data.error);
      if (!source2Data.success) console.log('来源2失败:', source2Data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testMergedData(); 