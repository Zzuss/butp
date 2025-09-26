import { createClient } from '@supabase/supabase-js'

// 第二个 Supabase 项目配置
const supabase2Url = process.env.NEXT_PUBLIC_SUPABASE2_URL || 'https://gumchjuzdrugyujblbxu.supabase.co'
const supabase2AnonKey = process.env.NEXT_PUBLIC_SUPABASE2_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bWNoanV6ZHJ1Z3l1amJsYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjUyMzEsImV4cCI6MjA3Mzg0MTIzMX0.1xUVn7mI5OjYYmvfq5pK3rrMyLDJE6MLOKtuV3A9ioc'

// 创建第二个 Supabase 客户端
export const supabaseSecondary = createClient(supabase2Url, supabase2AnonKey)

// 检查第二个 Supabase 是否配置
export const isSupabaseSecondaryConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE2_URL && process.env.NEXT_PUBLIC_SUPABASE2_ANON_KEY);
}

export interface Course {
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
  required_total: number | null
  required_compulsory: number | null
  required_elective: number | null
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

export interface CohortProbability {
  SNH: string | null
  major: string | null
  current_pred: number | null
  proba_1: number | null  // 国内升学
  proba_2: number | null  // 境外升学
  proba_3: number | null  // 就业
  year: number | null
}

// Education Plan 相关类型
export interface EducationPlan {
  name: string
  year: string
  size: number
  lastModified: string
  url?: string
}

// Storage 相关工具函数
export const EDUCATION_PLAN_BUCKET = 'education-plans'

// 获取文件的公开URL
export const getEducationPlanUrl = (fileName: string) => {
  return supabaseSecondary.storage
    .from(EDUCATION_PLAN_BUCKET)
    .getPublicUrl(fileName).data.publicUrl
}

// 上传文件到 Supabase Storage
export const uploadEducationPlan = async (file: File, fileName: string) => {
  try {
    console.log(`📤 开始上传文件到 Supabase: ${fileName}, 大小: ${file.size} bytes`)
    
    const { data, error } = await supabaseSecondary.storage
      .from(EDUCATION_PLAN_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      })
    
    if (error) {
      console.error('❌ Supabase 上传错误:', error)
      throw new Error(`Supabase 上传失败: ${error.message}`)
    }
    
    console.log('✅ 上传成功，数据:', data)
    return data
  } catch (error) {
    console.error('💥 上传函数执行失败:', error)
    throw error
  }
}

// 删除文件
export const deleteEducationPlan = async (fileName: string) => {
  try {
    const { error } = await supabaseSecondary.storage
      .from(EDUCATION_PLAN_BUCKET)
      .remove([fileName])
    
    if (error) throw error
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// 获取所有文件列表
export const listEducationPlans = async () => {
  try {
    console.log('📋 获取文件列表从 Supabase Storage...')
    
    const { data, error } = await supabaseSecondary.storage
      .from(EDUCATION_PLAN_BUCKET)
      .list('', {
        limit: 100,
        offset: 0
      })
    
    if (error) {
      console.error('❌ 获取文件列表失败:', error)
      throw new Error(`获取文件列表失败: ${error.message}`)
    }
    
    console.log(`✅ 获取到 ${data?.length || 0} 个文件`)
    
    return data?.map(file => {
      // 从文件名提取年份
      const yearMatch = file.name.match(/Education_Plan_PDF_(\d{4})\.pdf/)
      const year = yearMatch ? yearMatch[1] : '未知'
      
      return {
        name: file.name,
        year,
        size: file.metadata?.size || 0,
        lastModified: file.updated_at || file.created_at || new Date().toISOString(),
        url: getEducationPlanUrl(file.name)
      }
    }) || []
  } catch (error) {
    console.error('💥 列表函数执行失败:', error)
    throw error
  }
}