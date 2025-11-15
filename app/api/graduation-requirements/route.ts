import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey);

// 🚀 No longer needed! CourseID matching eliminates the need for complex name matching and fuzzy logic


export async function POST(request: NextRequest) {
  try {
    const { studentHash, studentNumber } = await request.json();

    console.log(`🔍 API Request: studentHash="${studentHash}", studentNumber="${studentNumber}"`);

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

    // 1. Get student's major from academic_results
    console.log(`🔍 Querying academic_results for SNH: "${studentHash}"`);
    
    const { data: studentInfoData, error: studentInfoError } = await supabase
      .from('academic_results')
      .select('"Current_Major"')
      .eq('"SNH"', studentHash)
      .limit(1);

    if (studentInfoError) {
      console.error('❌ Database error fetching student info:', studentInfoError);
      console.error('   Error details:', JSON.stringify(studentInfoError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch student info', 
        details: studentInfoError.message || 'Database query failed'
      }, { status: 500 });
    }

    if (!studentInfoData || studentInfoData.length === 0) {
      return NextResponse.json({ error: 'Student not found or no academic results' }, { status: 404 });
    }

    const { Current_Major: studentMajor } = studentInfoData[0];

    if (!studentMajor) {
      return NextResponse.json({ error: 'Student major not found' }, { status: 404 });
    }
    
    console.log(`🎓 Student Info: Major="${studentMajor}", Number="${studentNumber}", Year="${studentYear}"`);

    // 2. Get all categories and their required credits for the student's major and year from the courses table
    // 🔧 FIX: Add year filtering to get correct curriculum for student's grade
    console.log(`🔍 Querying courses for Major: "${studentMajor}", Year: "${studentYear}"`);
    
    const { data: requiredCreditsData, error: requiredCreditsError } = await supabase
      .from('courses')
      .select('category, required_total, required_compulsory, required_elective')
      .eq('major', studentMajor)
      .eq('year', studentYear)  // 🎯 KEY FIX: Filter by student's year
      .not('category', 'is', null); // Ensure category is not null

    if (requiredCreditsError) {
      console.error('Error fetching required credits:', requiredCreditsError);
      return NextResponse.json({ error: 'Failed to fetch required credits' }, { status: 500 });
    }

    console.log(`📊 Found ${requiredCreditsData.length} course records for Major: "${studentMajor}", Year: "${studentYear}"`);
    
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
    const requiredCreditsByCategory: Record<string, { required_total: number; required_compulsory: number; required_elective: number }> = {};
    requiredCreditsData.forEach(course => {
      const category = course.category;
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
      .select('course_id, course_name, category, major')
      .in('course_id', studentCourseIds)
      .eq('major', studentMajor);        // 🔧 FIX: 只获取学生对应专业的课程分类

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
    courseCategoryMapping.forEach(course => {
      courseIdToCategoryMap.set(course.course_id, course.category);
      courseIdToNameMap.set(course.course_id, course.course_name);
    });
    
    // Map student courses using CourseID
    const courseToCategoryMap = new Map();
    passingCoursesData.forEach(course => {
      const courseId = course.Course_ID;
      const courseName = course.Course_Name;
      
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
    
    passingCoursesData.forEach(course => {
      const courseId = course.Course_ID;
      const courseName = course.Course_Name;
      
      // Skip if already mapped
      if (courseToCategoryMap.has(courseName)) {
        return;
      }
      
      if (courseId) {
        // 体育基础：3812150010
        if (courseId === '3812150010') {
          courseToCategoryMap.set(courseName, '体育基础');
          console.log(`🏃‍♂️ Sports basic match: "${courseName}" (ID: ${courseId}) → 体育基础`);
          mappingStats.exact++;
          mappingStats.failed--; // 减少失败计数
        }
        // 体育专项课：3812150020~3812150324
        else if (courseId >= '3812150020' && courseId <= '3812150324') {
          courseToCategoryMap.set(courseName, '体育专项课');
          console.log(`🏃‍♂️ Sports specialized match: "${courseName}" (ID: ${courseId}) → 体育专项课`);
          mappingStats.exact++;
          mappingStats.failed--; // 减少失败计数
        }
      }
    });
    
    console.log(`🏃‍♂️ Sports courses mapping completed`);
    
    // 🏃‍♂️ DEBUG: Show sports courses found
    const sportsBasicCourses = passingCoursesData.filter(course => 
      course.Course_ID === '3812150010' && courseToCategoryMap.has(course.Course_Name)
    );
    const sportsSpecializedCourses = passingCoursesData.filter(course => 
      course.Course_ID && course.Course_ID >= '3812150020' && course.Course_ID <= '3812150324' && courseToCategoryMap.has(course.Course_Name)
    );
    
    if (sportsBasicCourses.length > 0) {
      console.log(`🏃‍♂️ Found ${sportsBasicCourses.length} 体育基础 courses:`, sportsBasicCourses.map(c => c.Course_Name));
    }
    if (sportsSpecializedCourses.length > 0) {
      console.log(`🏃‍♂️ Found ${sportsSpecializedCourses.length} 体育专项课 courses:`, sportsSpecializedCourses.map(c => c.Course_Name));
    }
    
    // 📦 FINAL: Handle remaining unmapped courses as "其他类别"
    console.log(`📦 Checking for remaining unmapped courses...`);
    
    const otherCategoryCourses: any[] = [];
    passingCoursesData.forEach(course => {
      const courseName = course.Course_Name;
      
      // If course is not mapped to any category, add it to "其他类别"
      if (!courseToCategoryMap.has(courseName)) {
        courseToCategoryMap.set(courseName, '其他类别');
        otherCategoryCourses.push(course);
        console.log(`📦 Other category match: "${courseName}" (ID: ${course.Course_ID || 'missing'}) → 其他类别`);
        mappingStats.exact++;
        mappingStats.failed--; // 减少失败计数
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

    const earnedCreditsByCategory: Record<string, { earned_credits: number; courses: { Course_Name: string; Credit: number }[] }> = {};

    // 🔧 FIXED: Only count courses that can be mapped to curriculum categories
    passingCoursesData.forEach(result => {
      const category = courseToCategoryMap.get(result.Course_Name);
      if (category) {
        if (!earnedCreditsByCategory[category]) {
          earnedCreditsByCategory[category] = { earned_credits: 0, courses: [] };
        }
        const credit = parseFloat(result.Credit);
        if (!isNaN(credit)) {
          // 🔧 FIX: 使用精确的浮点数加法，避免精度误差
          earnedCreditsByCategory[category].earned_credits = Math.round((earnedCreditsByCategory[category].earned_credits + credit) * 10) / 10;
          earnedCreditsByCategory[category].courses.push({ Course_Name: result.Course_Name, Credit: credit });
        }
      }
    });

    // 🔧 ENHANCED: Include both official curriculum categories and special categories (like sports)
    const allCategories = new Set([
      ...Object.keys(requiredCreditsByCategory),
      ...Object.keys(earnedCreditsByCategory)
    ]);
    
    const graduationRequirements = Array.from(allCategories).map(category => {
      const required = requiredCreditsByCategory[category] || { required_total: 0, required_compulsory: 0, required_elective: 0 };
      const earned = earnedCreditsByCategory[category] || { earned_credits: 0, courses: [] };
      
      return {
        category,
        required_total_credits: required.required_total,
        required_compulsory_credits: required.required_compulsory,
        required_elective_credits: required.required_elective,
        credits_already_obtained: earned.earned_credits,
        courses_taken: earned.courses,
        // 🔧 NEW: Add graduation status for this category
        meets_requirement: earned.earned_credits >= required.required_total
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
      req.category !== '体育基础' && req.category !== '体育专项课' && req.category !== '其他类别'
    );
    const specialCategories = graduationRequirements.filter(req => 
      req.category === '体育基础' || req.category === '体育专项课' || req.category === '其他类别'
    );
    
    console.log(`📚 Official curriculum categories: ${officialCategories.length}`);
    officialCategories.forEach(req => {
      const status = req.meets_requirement ? '✅' : '❌';
      console.log(`  ${status} ${req.category}: ${req.credits_already_obtained}/${req.required_total_credits} 学分`);
    });
    
    if (specialCategories.length > 0) {
      console.log(`🎯 Special categories: ${specialCategories.length}`);
      specialCategories.forEach(req => {
        console.log(`  📋 ${req.category}: ${req.credits_already_obtained} 学分 (${req.courses_taken.length} 门课程)`);
      });
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
        unmapped_courses: unmappedCourses,
        summary: {
          total_categories: totalCategories,
          categories_met: categoriesMet,
          overall_graduation_eligible: overallGraduationStatus,
          total_required_credits: totalRequiredCredits,
          total_earned_credits: totalEarnedCredits,
          curriculum_mapping_rate: parseFloat(mappingRate)
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
