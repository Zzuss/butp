import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Aggregate required credits by category
    const requiredCreditsByCategory: Record<string, { required_total: number; required_compulsory: number; required_elective: number }> = {};
    requiredCreditsData.forEach(course => {
      const category = course.category;
      if (!requiredCreditsByCategory[category]) {
        requiredCreditsByCategory[category] = { required_total: 0, required_compulsory: 0, required_elective: 0 };
      }
      requiredCreditsByCategory[category].required_total += course.required_total || 0;
      requiredCreditsByCategory[category].required_compulsory += course.required_compulsory || 0;
      requiredCreditsByCategory[category].required_elective += course.required_elective || 0;
    });

    // 3. Calculate earned credits for each category from academic_results
    const { data: earnedCreditsData, error: earnedCreditsError } = await supabase
      .from('academic_results')
      .select('Course_Name, Credit, Course_Attribute')
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

    // Map Course_Name from academic_results to category using the courses table
    const { data: courseCategoryMapping, error: courseCategoryMappingError } = await supabase
      .from('courses')
      .select('course_name, category')
      .in('course_name', earnedCreditsData.map(c => c.Course_Name));

    if (courseCategoryMappingError) {
      console.error('Error fetching course category mapping:', courseCategoryMappingError);
      return NextResponse.json({ error: 'Failed to fetch course category mapping' }, { status: 500 });
    }

    const courseToCategoryMap = new Map(courseCategoryMapping.map(c => [c.course_name, c.category]));

    const earnedCreditsByCategory: Record<string, { earned_credits: number; courses: { Course_Name: string; Credit: number }[] }> = {};

    earnedCreditsData.forEach(result => {
      const category = courseToCategoryMap.get(result.Course_Name);
      if (category) {
        if (!earnedCreditsByCategory[category]) {
          earnedCreditsByCategory[category] = { earned_credits: 0, courses: [] };
        }
        const credit = parseFloat(result.Credit);
        if (!isNaN(credit)) {
          earnedCreditsByCategory[category].earned_credits += credit;
          earnedCreditsByCategory[category].courses.push({ Course_Name: result.Course_Name, Credit: credit });
        }
      }
    });

    // Combine data for the final response
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
      };
    });

    return NextResponse.json({ success: true, data: graduationRequirements });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
