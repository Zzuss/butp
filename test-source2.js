async function testSource2() {
  try {
    console.log('🧪 测试来源2 API...\n');
    
    const testHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
    
    const response = await fetch('http://localhost:3000/api/source2-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentHash: testHash })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 来源2 API调用成功');
      console.log(`📊 来源2课程数: ${data.data.source2Scores.length}`);
      
      // 统计有完整信息的课程
      const coursesWithSemester = data.data.source2Scores.filter(c => c.semester !== null).length;
      const coursesWithCategory = data.data.source2Scores.filter(c => c.category !== null).length;
      const coursesWithCredit = data.data.source2Scores.filter(c => c.credit !== null).length;
      const coursesWithCourseId = data.data.source2Scores.filter(c => c.courseId !== null).length;
      
      console.log(`📅 有学期信息的课程: ${coursesWithSemester}`);
      console.log(`🏷️ 有分类信息的课程: ${coursesWithCategory}`);
      console.log(`📚 有学分信息的课程: ${coursesWithCredit}`);
      console.log(`🆔 有课程ID的课程: ${coursesWithCourseId}`);
      
      // 显示前5个课程的详细信息
      console.log('\n📋 前5个来源2课程详细信息:');
      data.data.source2Scores.slice(0, 5).forEach((course, index) => {
        console.log(`${index + 1}. ${course.courseName}`);
        console.log(`   来源: ${course.source}`);
        console.log(`   成绩: ${course.score}`);
        console.log(`   学期: ${course.semester}`);
        console.log(`   分类: ${course.category}`);
        console.log(`   学分: ${course.credit}`);
        console.log(`   课程ID: ${course.courseId}`);
        console.log(`   课程类型: ${course.courseType}`);
        console.log('');
      });
      
      // 显示没有完整信息的课程
      const incompleteCourses = data.data.source2Scores.filter(c => 
        c.semester === null || c.category === null || c.credit === null
      );
      
      if (incompleteCourses.length > 0) {
        console.log(`⚠️ 有${incompleteCourses.length}个来源2课程信息不完整:`);
        incompleteCourses.slice(0, 3).forEach(course => {
          console.log(`   - ${course.courseName} (学期:${course.semester}, 分类:${course.category}, 学分:${course.credit})`);
        });
        if (incompleteCourses.length > 3) {
          console.log(`   ... 还有${incompleteCourses.length - 3}个课程`);
        }
      }
      
    } else {
      console.log('❌ 来源2 API调用失败:', data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSource2(); 