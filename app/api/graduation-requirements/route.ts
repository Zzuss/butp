import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey);

// 🚀 No longer needed! CourseID matching eliminates the need for complex name matching and fuzzy logic


export async function POST(request: NextRequest) {
  try {
    const { studentHash } = await request.json();

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 });
    }

    // 1. Get student's major and year from academic_results
    const { data: studentInfoData, error: studentInfoError } = await supabase
      .from('academic_results')
      .select('Current_Major, year')
      .eq('SNH', studentHash)
      .limit(1);

    if (studentInfoError) {
      console.error('Error fetching student info:', studentInfoError);
      return NextResponse.json({ error: 'Failed to fetch student info' }, { status: 500 });
    }

    if (!studentInfoData || studentInfoData.length === 0) {
      return NextResponse.json({ error: 'Student not found or no academic results' }, { status: 404 });
    }

    const { Current_Major: studentMajor, year: studentYear } = studentInfoData[0];

    if (!studentMajor || !studentYear) {
      return NextResponse.json({ error: 'Student major or year not found' }, { status: 404 });
    }

    // 2. Get all categories and their required credits for the student's major and year from the courses table
    // 🔧 FIX: Get distinct category requirements to avoid duplication
    const { data: requiredCreditsData, error: requiredCreditsError } = await supabase
      .from('courses')
      .select('category, required_total, required_compulsory, required_elective')
      .eq('major', studentMajor)
      .eq('year', studentYear)
      .not('category', 'is', null); // Ensure category is not null

    if (requiredCreditsError) {
      console.error('Error fetching required credits:', requiredCreditsError);
      return NextResponse.json({ error: 'Failed to fetch required credits' }, { status: 500 });
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
      .select('Course_ID, Course_Name, Credit, Course_Attribute')
      .eq('SNH', studentHash)
      .not('Grade', 'is', null) // Only count courses with a grade
      .neq('Grade', '不及格') // Exclude failing grades
      .neq('Grade', '弃修') // Exclude dropped courses
      .neq('Grade', '免修') // Exclude exempted courses
      .neq('Grade', '缓考'); // Exclude deferred exams

    if (earnedCreditsError) {
      console.error('Error fetching earned credits:', earnedCreditsError);
      return NextResponse.json({ error: 'Failed to fetch earned credits' }, { status: 500 });
    }

    // 🚀 BRILLIANT SOLUTION: Use CourseID for perfect matching (no name variations needed!)
    const studentCourseIds = earnedCreditsData
      .map(c => c.Course_ID)
      .filter(id => id); // Remove any null/undefined IDs
    
    console.log(`🚀 SIMPLIFIED: Using CourseID matching for ${studentCourseIds.length} courses (no name variations needed!)`);
    
    const { data: courseCategoryMapping, error: courseCategoryMappingError } = await supabase
      .from('courses')
      .select('course_id, course_name, category, major, year')
      .in('course_id', studentCourseIds)
      .eq('major', studentMajor)        // 🔧 FIX: 只获取学生对应专业的课程分类
      .eq('year', studentYear);         // 🔧 FIX: 只获取学生对应年级的课程分类

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
    earnedCreditsData.forEach(course => {
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
    
    // 🚀 PERFECT: CourseID-based mapping statistics
    const totalCourses = earnedCreditsData.length;
    const successfulMappings = mappingStats.exact;
    const failedMappings = mappingStats.failed;
    const mappingRate = ((successfulMappings / totalCourses) * 100).toFixed(1);
    
    console.log(`🚀 CourseID-based mapping results for ${studentMajor} ${studentYear}:`);
    console.log(`   📚 Total student courses: ${totalCourses}`);
    console.log(`   ✅ Perfect CourseID matches: ${mappingStats.exact} (${((mappingStats.exact / totalCourses) * 100).toFixed(1)}%)`);
    console.log(`   ❌ No CourseID mapping: ${failedMappings} (${((failedMappings / totalCourses) * 100).toFixed(1)}%)`);
    console.log(`   🎯 Total mapping rate: ${mappingRate}% (CourseID-based, no name matching issues!)`);
    console.log(`   🏆 Graduation calculation: Based on ${successfulMappings} perfectly mapped courses`);
    
    // Collect unmapped courses for separate reporting
    const unmappedCourses = earnedCreditsData
      .filter(course => !courseToCategoryMap.has(course.Course_Name))
      .map(course => ({
        Course_Name: course.Course_Name,
        Credit: parseFloat(course.Credit) || 0
      }));
    
    if (unmappedCourses.length > 0) {
      console.log(`   ⚠️  Unmapped courses requiring review:`, unmappedCourses.slice(0, 3).map(c => c.Course_Name));
    }

    const earnedCreditsByCategory: Record<string, { earned_credits: number; courses: { Course_Name: string; Credit: number }[] }> = {};

    // 🔧 FIXED: Only count courses that can be mapped to curriculum categories
    earnedCreditsData.forEach(result => {
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

    // 🔧 FIXED: Only use categories defined in the official curriculum
    const graduationRequirements = Object.keys(requiredCreditsByCategory).map(category => {
      const required = requiredCreditsByCategory[category];
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
    
    console.log(`✅ Graduation requirements analysis for ${studentMajor} ${studentYear}:`);
    console.log(`📊 Curriculum categories: ${totalCategories}`);
    graduationRequirements.forEach(req => {
      const status = req.meets_requirement ? '✅' : '❌';
      console.log(`  ${status} ${req.category}: ${req.credits_already_obtained}/${req.required_total_credits} 学分`);
    });
    
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
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
