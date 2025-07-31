import { createClient } from '@supabase/supabase-js'

// 使用正确的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 检查是否为有效的Supabase配置
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface Course {
  id: number
  course_id: string
  course_name: string | null
  category: string | null
  credit: number | null
  total_hours: number | null
  theory_hours: number | null
  practice_hours: number | null
  semester: number | null
  required: string | null
  exam_type: string | null
  remarks: string | null
  major: string | null
  year: number | null
  created_at: string | null
}

export interface AcademicResult {
  SNH: string | null
  Semester_Offered: string | null
  Current_Major: string | null
  Course_ID: string | null
  Course_Name: string | null
  Grade: string | null
  Grade_Remark: string | null
  Course_Type: string | null
  Course_Attribute: string | null
  Hours: string | null
  Credit: string | null
  Offering_Unit: string | null
  Tags: string | null
  Description: string | null
  Exam_Type: string | null
  Assessment_Method: string | null
}