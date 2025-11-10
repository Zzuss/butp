import { createClient } from '@supabase/supabase-js'

// 使用正确的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'http://39.96.196.67:8000'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYxMDYyNDAwLCJleHAiOjE5MTg4Mjg4MDB9.FZnKH6Hf88vK-jh3gqpEjs2ULYHD8jVntoJ1Rw8J3H8'

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 检查是否为有效的Supabase配置
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASELOCAL_URL && process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY);
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
export const NOTIFICATION_IMAGES_BUCKET = 'notification-images'

// 获取文件的公开URL
export const getEducationPlanUrl = (fileName: string) => {
  return supabase.storage
    .from(EDUCATION_PLAN_BUCKET)
    .getPublicUrl(fileName).data.publicUrl
}

// 上传文件到 Supabase Storage
export const uploadEducationPlan = async (file: File, fileName: string) => {
  try {
    console.log(`📤 开始上传文件到 Supabase: ${fileName}, 大小: ${file.size} bytes`)
    
    const { data, error } = await supabase.storage
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
    const { error } = await supabase.storage
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
    
    const { data, error } = await supabase.storage
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

// 获取通知图片的公开URL
export const getNotificationImageUrl = (fileName: string) => {
  return supabase.storage
    .from(NOTIFICATION_IMAGES_BUCKET)
    .getPublicUrl(fileName).data.publicUrl
}

// 上传通知图片到 Supabase Storage
export const uploadNotificationImage = async (file: File, fileName: string) => {
  try {
    console.log(`📤 开始上传图片到 Supabase: ${fileName}, 大小: ${file.size} bytes`)
    
    const { data, error } = await supabase.storage
      .from(NOTIFICATION_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })
    
    if (error) {
      console.error('❌ Supabase 图片上传错误:', error)
      throw new Error(`Supabase 图片上传失败: ${error.message}`)
    }
    
    console.log('✅ 图片上传成功，数据:', data)
    return data
  } catch (error) {
    console.error('💥 图片上传函数执行失败:', error)
    throw error
  }
}

// 删除通知图片
export const deleteNotificationImage = async (fileName: string) => {
  try {
    const { error } = await supabase.storage
      .from(NOTIFICATION_IMAGES_BUCKET)
      .remove([fileName])
    
    if (error) throw error
  } catch (error) {
    console.error('Delete image error:', error)
    throw error
  }
}

// 专门用于通知图片的 Supabase 客户端
const notificationStorageClient = createClient(
  process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!
)

// 获取通知图片的公开URL（使用新的 Supabase 实例）
export const getNotificationImageUrlFromSpecificStorage = (fileName: string) => {
  return notificationStorageClient.storage
    .from('notification-images')
    .getPublicUrl(fileName).data.publicUrl
}

// 上传通知图片到新的 Supabase Storage
export const uploadNotificationImageToSpecificStorage = async (file: File, fileName: string) => {
  try {
    console.log(`📤 开始上传图片到指定 Supabase: ${fileName}, 大小: ${file.size} bytes`)
    
    const { data, error } = await notificationStorageClient.storage
      .from('notification-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })
    
    if (error) {
      console.error('❌ 指定 Supabase 图片上传错误:', error)
      throw new Error(`Supabase 图片上传失败: ${error.message}`)
    }
    
    console.log('✅ 图片上传成功，数据:', data)
    return data
  } catch (error) {
    console.error('💥 图片上传函数执行失败:', error)
    throw error
  }
}