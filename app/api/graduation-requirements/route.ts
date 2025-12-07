import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASELOCAL_URL and NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY.')
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🚀 No longer needed! CourseID matching eliminates the need for complex name matching and fuzzy logic


export async function POST(request: NextRequest) {
  try {
    const { studentHash, studentNumber } = await request.json();

    if (!studentHash) {
      console.error('❌ No student hash provided');
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 });
    }

    if (!studentNumber) {
      console.error('❌ No student number provided');
      return NextResponse.json({ error: 'Student number is required' }, { status: 400 });
    }

    // 🎯 Extract year from student number (first 4 digits)
    const studentYear = studentNumber.toString().substring(0, 4);

    // 1. Get student info to determine major
    const { data: studentData, error: studentError } = await supabase
      .from('academic_results')
      .select('Current_Major, SNH')
      .eq('SNH', studentHash)
      .limit(1);

    if (studentError) {
      console.error('Error fetching student data:', studentError);
      return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 });
    }

    if (!studentData || studentData.length === 0) {
      console.error(`❌ No student found with hash: ${studentHash}`);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentMajor = studentData[0].Current_Major;

    if (!studentMajor) {
      return NextResponse.json({ error: 'Student major not found' }, { status: 404 });
    }
    
    console.log(`🎓 Student Info: Major="${studentMajor}", Number="${studentNumber}", Year="${studentYear}"`);

    // 2. Get all categories and their required credits for the student's major and year from the courses table
    // 🔧 FIX: Add year filtering to get correct curriculum for student's grade
    console.log(`🔍 Querying courses for Major: "${studentMajor}", Year: "${studentYear}"`);
    
    const { data: requiredCreditsData, error: requiredCreditsError } = await supabase
      .from('courses')
      .select('course_id, category, required_total, required_compulsory, required_elective, remarks')
      .eq('major', studentMajor)
      .eq('year', studentYear)  // 🎯 KEY FIX: Filter by student's year
      .not('category', 'is', null); // Ensure category is not null

    if (requiredCreditsError) {
      console.error('Error fetching required credits:', requiredCreditsError);
      return NextResponse.json({ error: 'Failed to fetch required credits' }, { status: 500 });
    }

    console.log(`📊 Found ${requiredCreditsData.length} course records for Major: "${studentMajor}", Year: "${studentYear}"`);
    
    // 3. Get graduation total credit requirement for this major and year
    console.log(`🎯 Querying graduation total credits for Major: "${studentMajor}", Year: "${studentYear}"`);
    
    const { data: graduationCreditData, error: graduationCreditError } = await supabase
      .from('graduation_credit_requirements')
      .select('total_credits')
      .eq('major', studentMajor)
      .eq('year', studentYear)
      .single();
    
    if (graduationCreditError) {
      console.warn('⚠️  Failed to fetch graduation total credits:', graduationCreditError);
      console.warn('   Using fallback calculation from curriculum requirements');
    }
    
    const graduationTotalCredits = graduationCreditData?.total_credits || null;
    console.log(`🎓 Graduation total credits: ${graduationTotalCredits || 'Not found, will calculate from curriculum'}`);
    
    if (requiredCreditsData.length === 0) {
      console.warn(`⚠️  No courses found for Major: "${studentMajor}", Year: "${studentYear}"`);
      console.warn(`   This might indicate:`);
      console.warn(`   1. The major name doesn't match exactly`);
      console.warn(`   2. The year ${studentYear} curriculum is not in the database`);
      console.warn(`   3. The courses table doesn't have data for this combination`);
      
      // Try to find what years and majors are available
      const { data: availableData, error: availableError } = await supabase
        .from('courses')
        .select('major, year')
        .not('major', 'is', null)
        .not('year', 'is', null);
      
      if (!availableError && availableData) {
        const uniqueCombinations = [...new Set(availableData.map(d => `${d.major}-${d.year}`))];
        console.warn(`   Available Major-Year combinations: ${uniqueCombinations.length}`);
        uniqueCombinations.forEach(combo => {
          const [major, year] = combo.split('-');
          const isMatchingMajor = major === studentMajor;
          const isMatchingYear = year === studentYear;
          console.warn(`     ${isMatchingMajor && isMatchingYear ? '✅' : isMatchingMajor ? '🔶' : '❌'} ${combo}${isMatchingMajor && isMatchingYear ? ' (EXACT MATCH)' : isMatchingMajor ? ' (MAJOR MATCH)' : ''}`);
        });
      }
    }

    // 🔧 FIX: Use first occurrence of each category instead of SUM aggregation
    // Each category should have consistent requirements across all courses
    // 🚫 EXCLUDE "其他类别" from required categories as it's not a formal graduation requirement
    const requiredCreditsByCategory: Record<string, { required_total: number; required_compulsory: number; required_elective: number }> = {};
    requiredCreditsData.forEach(course => {
      const category = course.category;
      // Skip "其他类别" and "体育基础" as they're not formal graduation requirement categories
      // "体育基础" should be merged into "体育" category
      if (category === '其他类别' || category === '体育基础') {
        return;
      }
      if (!requiredCreditsByCategory[category]) {
        // Take the first occurrence - all courses in same category should have same requirements
        requiredCreditsByCategory[category] = { 
          required_total: course.required_total || 0, 
          required_compulsory: course.required_compulsory || 0, 
          required_elective: course.required_elective || 0 
        };
      }
      // ❌ REMOVED: Don't sum up the requirements - each course already contains the total category requirement
      // requiredCreditsByCategory[category].required_total += course.required_total || 0;
    });

    // 3. Calculate earned credits for each category from academic_results
    // 🚀 UPDATED: Include Course_ID for perfect matching
    const { data: earnedCreditsData, error: earnedCreditsError } = await supabase
      .from('academic_results')
      .select('"Course_ID", "Course_Name", "Credit", "Course_Attribute", "Grade"')
      .eq('"SNH"', studentHash)
      .not('"Grade"', 'is', null); // Get all courses with grades for filtering

    if (earnedCreditsError) {
      console.error('Error fetching earned credits:', earnedCreditsError);
      return NextResponse.json({ error: 'Failed to fetch earned credits' }, { status: 500 });
    }

    // 🎯 GRADE FILTERING: Filter out failing and invalid grades
    console.log(`📊 Total courses with grades: ${earnedCreditsData.length}`);
    
    // Function to check if a grade is passing
    const isPassingGrade = (grade: string): boolean => {
      if (!grade) return false;
      
      // Only check numeric grades (should be >= 60)
      const numericGrade = parseFloat(grade);
      if (!isNaN(numericGrade)) {
        return numericGrade >= 60;
      }
      
      // If grade is not a number, ignore this course (don't include in calculation)
      return false;
    };
    
    // Filter to only include courses with passing grades (numeric >= 60)
    const passingCoursesData = earnedCreditsData.filter(course => {
      const isPassing = isPassingGrade(course.Grade);
      if (!isPassing) {
        const numericGrade = parseFloat(course.Grade);
        if (!isNaN(numericGrade)) {
          console.log(`❌ Excluding failing course: "${course.Course_Name}" (Grade: ${course.Grade} < 60)`);
        } else {
          console.log(`❌ Excluding non-numeric grade: "${course.Course_Name}" (Grade: ${course.Grade})`);
        }
      }
      return isPassing;
    });
    
    console.log(`✅ Courses with passing grades (>=60): ${passingCoursesData.length}`);
    console.log(`❌ Courses excluded (failing or non-numeric): ${earnedCreditsData.length - passingCoursesData.length}`);
    
    // 🚀 BRILLIANT SOLUTION: Use CourseID for perfect matching (no name variations needed!)
    const studentCourseIds = passingCoursesData
      .map(c => c.Course_ID)
      .filter(id => id); // Remove any null/undefined IDs
    
    console.log(`🚀 SIMPLIFIED: Using CourseID matching for ${studentCourseIds.length} courses (no name variations needed!)`);
    
    const { data: courseCategoryMapping, error: courseCategoryMappingError } = await supabase
      .from('courses')
      .select('course_id, course_name, category, major, remarks')
      .in('course_id', studentCourseIds)
      .eq('major', studentMajor)
      .eq('year', studentYear);        // 🔧 FIX: 添加年份过滤，确保获取正确年级的课程分类

    if (courseCategoryMappingError) {
      console.error('Error fetching course category mapping by ID:', courseCategoryMappingError);
      return NextResponse.json({ error: 'Failed to fetch course category mapping' }, { status: 500 });
    }
    
    console.log(`✅ SUCCESS: Found ${courseCategoryMapping?.length || 0} course mappings by CourseID`);
    
    // 🔧 DEBUG: Show key course types found
    const foundMathCourses = courseCategoryMapping?.filter(c => c.course_name.includes('数学') || c.course_name.includes('线性代数') || c.course_name.includes('概率')) || [];
    const foundPhysicsCourses = courseCategoryMapping?.filter(c => c.course_name.includes('物理')) || [];
    
    console.log(`📚 Found key courses: ${foundMathCourses.length} math courses, ${foundPhysicsCourses.length} physics courses`);

    // 🚀 SIMPLIFIED: Direct CourseID mapping (no fuzzy matching needed!)
    const courseIdToCategoryMap = new Map();
    const courseIdToNameMap = new Map();
    let mappingStats = { exact: 0, failed: 0 };
    
    // Create CourseID to category mapping
    const courseIdToRemarksMap = new Map();
    courseCategoryMapping.forEach(course => {
      courseIdToCategoryMap.set(course.course_id, course.category);
      courseIdToNameMap.set(course.course_id, course.course_name);
      if (course.remarks) {
        courseIdToRemarksMap.set(course.course_id, course.remarks);
      }
    });
    
    // 🏃‍♂️ PRIORITY 1: Sports courses special handling (highest priority)
    const courseToCategoryMap = new Map();
    const sportsCoursesInfo = new Map();
    const processedSportsBasicIds = new Set();
    
    console.log(`🏃‍♂️ Starting sports courses special processing...`);
    passingCoursesData.forEach(course => {
      const courseId = course.Course_ID;
      const courseName = course.Course_Name;
      
      console.log(`🔍 Processing course: "${courseName}" (ID: ${courseId})`);
      
      // 🔍 Special debug for 健美 course
      if (courseName === '健美' || courseId === '3812150140') {
        console.log(`🔍 SPECIAL DEBUG for 健美: CourseID=${courseId} (type: ${typeof courseId}), parseInt=${parseInt(courseId)}`);
        console.log(`🔍 Range check: ${parseInt(courseId)} >= 3812150020 = ${parseInt(courseId) >= 3812150020}`);
        console.log(`🔍 Range check: ${parseInt(courseId)} <= 3812150324 = ${parseInt(courseId) <= 3812150324}`);
        console.log(`🔍 Special check: ${courseId} === '3812150140' = ${courseId === '3812150140'}`);
        console.log(`🔍 Combined check: ${(parseInt(courseId) >= 3812150020 && parseInt(courseId) <= 3812150324) || courseId === '3812150140'}`);
        console.log(`🔍 Will this course match sports elective condition?`);
      }
      
      if (courseId) {
        // 体育基础：3812150010 -> 体育类别的必修学分
        if (courseId === '3812150010') {
          courseToCategoryMap.set(courseName, '体育');
          sportsCoursesInfo.set(courseName, { type: 'compulsory', courseId });
          processedSportsBasicIds.add(courseId);
          console.log(`🏃‍♂️ Sports compulsory match: "${courseName}" (ID: ${courseId}) → 体育 (必修)`);
        }
        // 🏃‍♂️ Check for sports elective courses (体育专项课) - CourseID range: 3812150020~3812150324, plus 健美(3812150140)
        else if ((parseInt(courseId) >= 3812150020 && parseInt(courseId) <= 3812150324) || courseId === '3812150140') {
          console.log(`🔍 DEBUG: CourseID ${courseId} matches sports elective condition`);
          courseToCategoryMap.set(courseName, '体育');
          sportsCoursesInfo.set(courseName, { type: 'elective', courseId });
          console.log(`🏃‍♂️ Sports elective match: "${courseName}" (ID: ${courseId}) → 体育 (选修)`);
        }
      }
    });
    
    console.log(`🏃‍♂️ Sports courses mapping completed`);
    console.log(`🏃‍♂️ Found ${Array.from(sportsCoursesInfo.entries()).filter(([name, info]) => info.type === 'compulsory').length} 体育必修 courses:`, Array.from(sportsCoursesInfo.entries()).filter(([name, info]) => info.type === 'compulsory').map(([name]) => name));
    console.log(`🏃‍♂️ Found ${Array.from(sportsCoursesInfo.entries()).filter(([name, info]) => info.type === 'elective').length} 体育选修 courses:`, Array.from(sportsCoursesInfo.entries()).filter(([name, info]) => info.type === 'elective').map(([name]) => name));
    
    // 🚀 PRIORITY 2: Regular CourseID mapping for non-sports courses
    passingCoursesData.forEach(course => {
      const courseId = course.Course_ID;
      const courseName = course.Course_Name;
      
      // Skip if already mapped by sports processing
      if (courseToCategoryMap.has(courseName)) {
        return;
      }
      
      if (courseId && courseIdToCategoryMap.has(courseId)) {
        const category = courseIdToCategoryMap.get(courseId);
        const mappedCourseName = courseIdToNameMap.get(courseId);
        
        courseToCategoryMap.set(courseName, category);
        console.log(`✅ Perfect match: "${courseName}" (ID: ${courseId}) → "${mappedCourseName}" (${category})`);
        mappingStats.exact++;
      } else {
        console.log(`❌ No mapping found for: "${courseName}" (ID: ${courseId || 'missing'})`);
        mappingStats.failed++;
      }
    });
    
    // 🏃‍♂️ SPECIAL: Handle sports courses with ID range mapping
    console.log(`🏃‍♂️ Checking for sports courses with special ID ranges...`);
    
    // 🔍 DEBUG: Show all potential sports-related courses in student data
    const allSportsRelatedCourses = passingCoursesData.filter(course => 
      course.Course_Name.includes('体育') || 
      course.Course_Name.includes('健美') || 
      course.Course_Name.includes('篮球') || 
      course.Course_Name.includes('足球') || 
      course.Course_Name.includes('排球') ||
      course.Course_Name.includes('游泳') ||
      course.Course_Name.includes('羽毛球') ||
      course.Course_Name.includes('网球')
    );
    
    if (allSportsRelatedCourses.length > 0) {
      console.log(`🔍 All sports-related courses found in student data:`);
      allSportsRelatedCourses.forEach(course => {
        console.log(`   - "${course.Course_Name}" (ID: ${course.Course_ID || 'missing'}, Credit: ${course.Credit}, Grade: ${course.Grade})`);
      });
    } else {
      console.log(`🔍 No sports-related courses found in student data`);
    }
    
    // 🔍 DEBUG: Show ALL courses with IDs in the sports range
    const coursesInSportsIdRange = passingCoursesData.filter(course => {
      const courseId = course.Course_ID;
      return courseId && (
        courseId === '3812150010' || 
        (parseInt(courseId) >= 3812150020 && parseInt(courseId) <= 3812150324)
      );
    });
    
    if (coursesInSportsIdRange.length > 0) {
      console.log(`🔍 Courses with sports CourseID range:`);
      coursesInSportsIdRange.forEach(course => {
        console.log(`   - "${course.Course_Name}" (ID: ${course.Course_ID}, Credit: ${course.Credit}, Grade: ${course.Grade})`);
      });
    }
    
    // 🔧 Clean up any remaining "体育基础" mappings that might have been created during normal mapping
    const cleanupCount = Array.from(courseToCategoryMap.entries())
      .filter(([_, category]) => category === '体育基础')
      .length;
    
    if (cleanupCount > 0) {
      console.log(`🧹 Cleaning up ${cleanupCount} remaining "体育基础" mappings...`);
      for (const [courseName, category] of courseToCategoryMap.entries()) {
        if (category === '体育基础') {
          courseToCategoryMap.set(courseName, '体育');
          console.log(`🧹 Cleaned up: "${courseName}" → 体育 [was: 体育基础]`);
        }
      }
    }
    
    // 🏃‍♂️ DEBUG: Show sports courses found
    const sportsCompulsoryCourses = Array.from(sportsCoursesInfo.entries())
      .filter(([_, info]) => info.type === 'compulsory')
      .map(([courseName, _]) => courseName);
    const sportsElectiveCourses = Array.from(sportsCoursesInfo.entries())
      .filter(([_, info]) => info.type === 'elective')
      .map(([courseName, _]) => courseName);
    
    if (sportsCompulsoryCourses.length > 0) {
      console.log(`🏃‍♂️ Found ${sportsCompulsoryCourses.length} 体育必修 courses:`, sportsCompulsoryCourses);
    }
    if (sportsElectiveCourses.length > 0) {
      console.log(`🏃‍♂️ Found ${sportsElectiveCourses.length} 体育选修 courses:`, sportsElectiveCourses);
    }
    
    // 📦 FINAL: Handle courses not in official curriculum as "其他类别"
    console.log(`📦 Checking for courses not in official curriculum...`);
    
    const curriculumCategories = new Set(Object.keys(requiredCreditsByCategory));
    
    // 🏃‍♂️ CRITICAL FIX: Always include "体育" category if any sports courses were mapped
    // This ensures sports courses won't be moved to "其他类别" even if courses table has "体育基础" category
    if (sportsCoursesInfo.size > 0) {
      curriculumCategories.add('体育');
      console.log(`🏃‍♂️ Added "体育" to curriculum categories (${sportsCoursesInfo.size} sports courses found)`);
    }
    
    console.log(`📋 Official curriculum categories:`, Array.from(curriculumCategories));
    
    const otherCategoryCourses: any[] = [];
    passingCoursesData.forEach(course => {
      const courseName = course.Course_Name;
      const currentCategory = courseToCategoryMap.get(courseName);
      
      // If course is not mapped to any category OR mapped to a category not in official curriculum
      if (!courseToCategoryMap.has(courseName) || !curriculumCategories.has(currentCategory!)) {
        courseToCategoryMap.set(courseName, '其他类别');
        otherCategoryCourses.push(course);
        console.log(`📦 Other category match: "${courseName}" (ID: ${course.Course_ID || 'missing'}) → 其他类别 ${currentCategory ? `[was: ${currentCategory}]` : '[unmapped]'}`);
        
        if (!courseToCategoryMap.has(courseName)) {
          mappingStats.exact++;
          mappingStats.failed--; // 减少失败计数
        }
      }
    });
    
    if (otherCategoryCourses.length > 0) {
      console.log(`📦 Found ${otherCategoryCourses.length} 其他类别 courses:`, otherCategoryCourses.map(c => c.Course_Name));
    } else {
      console.log(`📦 No courses need to be categorized as 其他类别`);
    }
    
    console.log(`📦 Other category mapping completed`);
    
    // 🚀 PERFECT: CourseID-based mapping statistics
    const totalCourses = passingCoursesData.length;
    const successfulMappings = mappingStats.exact;
    const failedMappings = mappingStats.failed;
    const mappingRate = ((successfulMappings / totalCourses) * 100).toFixed(1);
    
    console.log(`🚀 CourseID-based mapping results for ${studentMajor}:`);
    console.log(`   📚 Total student courses: ${totalCourses}`);
    console.log(`   ✅ Perfect CourseID matches: ${mappingStats.exact} (${((mappingStats.exact / totalCourses) * 100).toFixed(1)}%)`);
    console.log(`   ❌ No CourseID mapping: ${failedMappings} (${((failedMappings / totalCourses) * 100).toFixed(1)}%)`);
    console.log(`   🎯 Total mapping rate: ${mappingRate}% (CourseID-based, no name matching issues!)`);
    console.log(`   🏆 Graduation calculation: Based on ${successfulMappings} perfectly mapped courses`);
    
    // Collect unmapped courses for separate reporting
    const unmappedCourses = passingCoursesData
      .filter(course => !courseToCategoryMap.has(course.Course_Name))
      .map(course => ({
        Course_Name: course.Course_Name,
        Credit: parseFloat(course.Credit) || 0
      }));
    
    if (unmappedCourses.length > 0) {
      console.log(`   ⚠️  Unmapped courses requiring review:`, unmappedCourses.slice(0, 3).map(c => c.Course_Name));
      console.log(`   📝 Note: This should be 0 after adding 其他类别 mapping`);
    } else {
      console.log(`   ✅ All courses successfully mapped (including 其他类别)`);
    }

    const earnedCreditsByCategory: Record<string, { 
      earned_credits: number; 
      earned_compulsory: number;
      earned_elective: number;
      courses: { Course_Name: string; Credit: number; type?: string }[] 
    }> = {};

    // 🔧 ENHANCED: Count courses with compulsory/elective distinction for sports
    passingCoursesData.forEach(result => {
      const category = courseToCategoryMap.get(result.Course_Name);
      if (category) {
        if (!earnedCreditsByCategory[category]) {
          earnedCreditsByCategory[category] = { 
            earned_credits: 0, 
            earned_compulsory: 0,
            earned_elective: 0,
            courses: [] 
          };
        }
        const credit = parseFloat(result.Credit);
        if (!isNaN(credit)) {
          // 🔧 FIX: 使用精确的浮点数加法，避免精度误差
          earnedCreditsByCategory[category].earned_credits = Math.round((earnedCreditsByCategory[category].earned_credits + credit) * 10) / 10;
          
          // 🏃‍♂️ Special handling for sports courses
          if (category === '体育' && sportsCoursesInfo.has(result.Course_Name)) {
            const sportsInfo = sportsCoursesInfo.get(result.Course_Name);
            const courseRemarks = courseIdToRemarksMap.get(result.Course_ID);
            
            if (sportsInfo?.type === 'compulsory') {
              earnedCreditsByCategory[category].earned_compulsory = Math.round((earnedCreditsByCategory[category].earned_compulsory + credit) * 10) / 10;
              earnedCreditsByCategory[category].courses.push({ 
                Course_Name: result.Course_Name, 
                Credit: credit, 
                Course_Attribute: result.Course_Attribute,
                type: 'compulsory',
                remarks: courseRemarks
              } as any);
            } else if (sportsInfo?.type === 'elective') {
              earnedCreditsByCategory[category].earned_elective = Math.round((earnedCreditsByCategory[category].earned_elective + credit) * 10) / 10;
              earnedCreditsByCategory[category].courses.push({ 
                Course_Name: result.Course_Name, 
                Credit: credit, 
                Course_Attribute: result.Course_Attribute,
                type: 'elective',
                remarks: courseRemarks
              } as any);
            }
          } else {
            const courseRemarks = courseIdToRemarksMap.get(result.Course_ID);
            earnedCreditsByCategory[category].courses.push({ 
              Course_Name: result.Course_Name, 
              Credit: credit,
              Course_Attribute: result.Course_Attribute,
              remarks: courseRemarks
            } as any);
          }
        }
      }
    });

    // 🔧 ENHANCED: Include official curriculum categories and sports, but exclude "其他类别" from main list
    console.log(`📋 Required categories before filtering:`, Object.keys(requiredCreditsByCategory));
    console.log(`📋 Earned categories before filtering:`, Object.keys(earnedCreditsByCategory));
    
    // 🔍 DEBUG: Show sports category requirements if exists
    if (requiredCreditsByCategory['体育']) {
      console.log(`🏃‍♂️ Sports category requirements from database:`, requiredCreditsByCategory['体育']);
    }
    if (requiredCreditsByCategory['体育基础']) {
      console.log(`🏃‍♂️ Sports basic category requirements from database:`, requiredCreditsByCategory['体育基础']);
    }
    
    // 🔧 FIX: Only include categories that exist in the courses table (requiredCreditsByCategory)
    // Don't include categories from student grades that aren't in the official curriculum
    const allCategories = new Set([
      ...Object.keys(requiredCreditsByCategory).filter(category => category !== '其他类别' && category !== '体育基础')
    ]);
    
    // 🏃‍♂️ CRITICAL FIX: Always include "体育" if sports courses exist, even if not in requiredCreditsByCategory
    // This handles cases where courses table has "体育基础" but we map to "体育"
    if (earnedCreditsByCategory['体育'] && earnedCreditsByCategory['体育'].courses.length > 0) {
      allCategories.add('体育');
      console.log(`🏃‍♂️ Added "体育" to final categories (student has ${earnedCreditsByCategory['体育'].courses.length} sports courses)`);
    }
    
    console.log(`📋 Final categories for graduation requirements:`, Array.from(allCategories));
    
    const graduationRequirements = Array.from(allCategories).map(category => {
      let required = requiredCreditsByCategory[category] || { required_total: 0, required_compulsory: 0, required_elective: 0 };
      
      // 🏃‍♂️ SPECIAL: Override sports category requirements based on curriculum data
      if (category === '体育') {
        // 🎯 Direct CourseID matching - no category filter needed
        const sportsBasicRequirement = requiredCreditsData.find(course => 
          course.course_id === '3812150010'
        );
        const sportsElectiveRequirement = requiredCreditsData.find(course => 
          course.course_id === '3812150020'
        );
        
        const requiredCompulsory = sportsBasicRequirement ? (sportsBasicRequirement.required_compulsory || 1) : 1;
        const requiredElective = sportsElectiveRequirement ? (sportsElectiveRequirement.required_elective || 3) : 3;
        
        // Set sports requirements based on curriculum
        required = {
          required_total: requiredCompulsory + requiredElective,
          required_compulsory: requiredCompulsory,
          required_elective: requiredElective
        };
        
        console.log(`🏃‍♂️ Sports requirements: compulsory=${requiredCompulsory}, elective=${requiredElective}, total=${required.required_total}`);
      }
      
      const earned = earnedCreditsByCategory[category] || { 
        earned_credits: 0, 
        earned_compulsory: 0,
        earned_elective: 0,
        courses: [] 
      };
      
      // 🏃‍♂️ Special handling for sports category
      if (category === '体育') {
        return {
          category,
          required_total_credits: required.required_total,
          required_compulsory_credits: required.required_compulsory,
          required_elective_credits: required.required_elective,
          credits_already_obtained: earned.earned_credits,
          compulsory_credits_obtained: earned.earned_compulsory,
          elective_credits_obtained: earned.earned_elective,
          courses_taken: earned.courses,
          meets_requirement: earned.earned_credits >= required.required_total,
          meets_compulsory_requirement: earned.earned_compulsory >= required.required_compulsory,
          meets_elective_requirement: earned.earned_elective >= required.required_elective,
          is_completed: earned.earned_credits >= required.required_total  // 🎨 NEW: For green highlighting
        };
      }
      
      // 🎯 处理特殊要求（九选二）
      const processedCourses = earned.courses.map((course: any) => {
        if (course.remarks && course.remarks.includes('九选二')) {
          // 统计同一特殊要求组的课程数量
          const sameGroupCourses = earned.courses.filter((c: any) => c.remarks && c.remarks.includes('九选二'));
          const completedCount = sameGroupCourses.length;
          
          return {
            ...course,
            special_requirement: {
              type: '九选二',
              total_options: 9,
              required_count: 2,
              completed_count: completedCount,
              is_satisfied: completedCount >= 2
            }
          };
        }
        return course;
      });

      return {
        category,
        required_total_credits: required.required_total,
        required_compulsory_credits: required.required_compulsory,
        required_elective_credits: required.required_elective,
        credits_already_obtained: earned.earned_credits,
        courses_taken: processedCourses,
        // 🔧 NEW: Add graduation status for this category
        meets_requirement: earned.earned_credits >= required.required_total,
        is_completed: earned.earned_credits >= required.required_total  // 🎨 NEW: For green highlighting
      };
    });

    // 🔧 Calculate overall graduation status
    const categoriesMet = graduationRequirements.filter(req => req.meets_requirement).length;
    const totalCategories = graduationRequirements.length;
    const overallGraduationStatus = categoriesMet === totalCategories;
    
    console.log(`✅ Graduation requirements analysis for ${studentMajor}:`);
    console.log(`📊 Total categories: ${totalCategories}`);
    
    // Separate official curriculum categories from special categories
    const officialCategories = graduationRequirements.filter(req => 
      req.category !== '体育' && req.category !== '其他类别'
    );
    const specialCategories = graduationRequirements.filter(req => 
      req.category === '体育'
    );
    
    console.log(`📚 Official curriculum categories: ${officialCategories.length}`);
    officialCategories.forEach(req => {
      const status = req.meets_requirement ? '✅' : '❌';
      console.log(`  ${status} ${req.category}: ${req.credits_already_obtained}/${req.required_total_credits} 学分`);
    });
    
    if (specialCategories.length > 0) {
      console.log(`🎯 Special categories: ${specialCategories.length}`);
      specialCategories.forEach(req => {
        if (req.category === '体育') {
          const sportsReq = req as any; // Type assertion for sports-specific fields
          console.log(`  🏃‍♂️ ${req.category}: ${req.credits_already_obtained} 学分 (${req.courses_taken.length} 门课程)`);
          console.log(`    - 必修: ${sportsReq.compulsory_credits_obtained || 0}/${sportsReq.required_compulsory_credits || 0} 学分`);
          console.log(`    - 选修: ${sportsReq.elective_credits_obtained || 0}/${sportsReq.required_elective_credits || 0} 学分`);
        } else {
          console.log(`  📋 ${req.category}: ${req.credits_already_obtained} 学分 (${req.courses_taken.length} 门课程)`);
        }
      });
    }
    
    // 🔧 Prepare "其他类别" information separately
    const otherCategoryInfo = earnedCreditsByCategory['其他类别'] || null;
    
    // 📦 Show "其他类别" information separately (not included in main graduation requirements)
    if (otherCategoryInfo && otherCategoryInfo.courses.length > 0) {
      console.log(`📦 Other category (separate): ${otherCategoryInfo.earned_credits} 学分 (${otherCategoryInfo.courses.length} 门课程)`);
      console.log(`   Courses: ${otherCategoryInfo.courses.slice(0, 5).map(c => c.Course_Name).join(', ')}${otherCategoryInfo.courses.length > 5 ? '...' : ''}`);
    }
    
    // 🔧 FIX: 修复总学分计算的浮点数精度问题
    const totalRequiredCredits = Math.round(graduationRequirements.reduce((sum, req) => sum + req.required_total_credits, 0) * 10) / 10;
    const totalEarnedCredits = Math.round(graduationRequirements.reduce((sum, req) => sum + req.credits_already_obtained, 0) * 10) / 10;
    console.log(`🎯 Total progress: ${totalEarnedCredits}/${totalRequiredCredits} 学分`);
    console.log(`🏆 Graduation status: ${overallGraduationStatus ? 'ELIGIBLE' : 'NOT YET ELIGIBLE'} (${categoriesMet}/${totalCategories} categories met)`);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        graduation_requirements: graduationRequirements,
        other_category: otherCategoryInfo ? {
          category: '其他类别',
          credits_already_obtained: otherCategoryInfo.earned_credits,
          courses_taken: otherCategoryInfo.courses,
          course_count: otherCategoryInfo.courses.length
        } : null,
        unmapped_courses: unmappedCourses,
        summary: {
          total_categories: totalCategories,
          categories_met: categoriesMet,
          overall_graduation_eligible: overallGraduationStatus,
          total_required_credits: totalRequiredCredits,
          total_earned_credits: totalEarnedCredits,
          curriculum_mapping_rate: parseFloat(mappingRate),
          graduation_total_credits: graduationTotalCredits
        }
      }
    });

  } catch (error) {
    console.error('❌ Unexpected API error:', error);
    console.error('   Error type:', typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
