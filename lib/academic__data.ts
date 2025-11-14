import { supabase } from './supabase'

/**
 * 缓存机制
 */
interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 从缓存获取数据
 */
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  
  return entry.data
}

/**
 * 设置缓存数据
 */
function setCache<T>(key: string, data: T): void {
  const now = Date.now()
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_DURATION
  })
}

/**
 * 清除缓存
 */
function clearCache(): void {
  cache.clear()
}

/**
 * 查询学术成绩数据的字段列表（统一字段投影）
 */
export const ACADEMIC_RESULTS_FIELDS = [
  'SNH',
  'Course_ID',
  'Course_Name',
  'Grade',
  'Credit',
  'Semester_Offered',
  'Course_Type',
  'Course_Attribute',
  'Current_Major'
] as const

/**
 * 学术成绩数据查询结果接口
 */
export interface AcademicResultRecord {
  SNH: string | null
  Course_ID: string | null
  Course_Name: string | null
  Grade: string | number | null
  Credit: string | number | null
  Semester_Offered: string | null
  Course_Type: string | null
  Course_Attribute: string | null
  Current_Major: string | null
}

/**
 * 根据学生哈希值查询学术成绩数据（带缓存和过滤）
 * @param studentHash 学生哈希值（64位十六进制字符串）
 * @returns 学术成绩数据记录数组，查询失败或未找到数据返回空数组
 */
export async function queryAcademicResults(studentHash: string): Promise<AcademicResultRecord[]> {
  try {
    // 验证哈希值格式
    if (!studentHash || typeof studentHash !== 'string') {
      console.error('学生哈希值无效: 必须是非空字符串')
      return []
    }

    const trimmedHash = studentHash.trim()

    if (trimmedHash.length !== 64 || !/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      console.error('学生哈希值格式错误: 必须是64位十六进制字符串')
      return []
    }

    // 检查缓存
    const cacheKey = `academic_results_data_${trimmedHash}`
    const cachedData = getFromCache<AcademicResultRecord[]>(cacheKey)
    if (cachedData) {
      console.log('从缓存获取学术成绩数据，记录数量:', cachedData.length)
      return cachedData
    }

    // 构建查询字段字符串（Supabase 需要给包含下划线和大写字母的字段名加双引号）
    const fieldsString = ACADEMIC_RESULTS_FIELDS.map(field => `"${field}"`).join(', ')

    // 查询学术成绩数据
    const { data: results, error } = await supabase
      .from('academic_results')
      .select(fieldsString)
      .eq('"SNH"', trimmedHash)

    if (error) {
      console.error('查询学术成绩数据失败:', error)
      console.error('完整错误对象:', JSON.stringify(error, null, 2))
      console.error('错误代码:', error.code)
      console.error('错误消息:', error.message)
      console.error('错误详情:', error.details)
      return []
    }

    if (!results || results.length === 0) {
      console.log('未找到学术成绩数据，学生哈希值:', trimmedHash)
      return []
    }

    console.log('成功查询学术成绩数据，记录数量:', results.length)

    // 类型转换
    const academicResults: AcademicResultRecord[] = results.map((record: any) => ({
      SNH: record.SNH || null,
      Course_ID: record.Course_ID || null,
      Course_Name: record.Course_Name || null,
      Grade: record.Grade || null,
      Credit: record.Credit || null,
      Semester_Offered: record.Semester_Offered || null,
      Course_Type: record.Course_Type || null,
      Course_Attribute: record.Course_Attribute || null,
      Current_Major: record.Current_Major || null
    }))

    // 过滤：如果成绩小于60分且课程属性为"任选"，则不计入查询结果
    const filteredResults = academicResults.filter(course => {
      // 将成绩转换为数字进行比较（支持等级映射）
      let gradeValue: number | null
      if (typeof course.Grade === 'number') {
        gradeValue = course.Grade
      } else {
        const raw = String(course.Grade || '').trim()
        // 等级映射：优、良、中、及格、不及格 -> 95、85、75、65、59
        const mapping: Record<string, number> = {
          '优': 95,
          '良': 85,
          '中': 75,
          '及格': 65,
          '不及格': 59,
        }
        if (raw in mapping) {
          gradeValue = mapping[raw]
        } else {
          gradeValue = !isNaN(parseFloat(raw)) ? parseFloat(raw) : null
        }
      }
      
      // 如果成绩小于60且课程属性为"任选"，则过滤掉
      if (gradeValue !== null && gradeValue < 60 && course.Course_Attribute === '任选') {
        return false
      }
      
      return true
    })

    console.log(`过滤后课程数量: ${filteredResults.length} (已过滤 ${academicResults.length - filteredResults.length} 门任选课)`)

    // 缓存过滤后的数据
    setCache(cacheKey, filteredResults)
    console.log('学术成绩数据已缓存')

    return filteredResults

  } catch (error) {
    console.error('查询学术成绩数据时发生异常:', error)
    return []
  }
}

/**
 * 导出缓存管理函数
 */
export { getFromCache, setCache, clearCache }

