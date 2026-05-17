'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth, type User } from '@/contexts/AuthContext'
import {
  getStudentResults,
  calculateDashboardStats,
  getLatestSemesterTopCreditCourses,
  getCourseTypeStats,
  getSemesterTrends,
  getStudentInfo,
  getStudentGPA,
  type DashboardStats,
  type SubjectGrade,
  type CourseTypeStats,
  type SemesterTrend,
} from '@/lib/dashboard-data'
import { queryAcademicResults } from '@/lib/academic__data'
import { supabase } from '@/lib/supabase'

interface DashboardContextType {
  stats: DashboardStats | null
  subjectGrades: SubjectGrade[]
  courseTypeStats: CourseTypeStats[]
  semesterTrends: SemesterTrend[]
  studentInfo: { year: string; major: string } | null
  isLoading: boolean
  /** 已缓存数据的用户哈希，用于判断是否命中内存缓存 */
  cachedUserHash: string | null
  loadDashboardIfNeeded: (user: User) => Promise<void>
  invalidateDashboard: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

function getStudentNumber(user: User): string {
  const studentNumber =
    typeof (user as User & { studentNumber?: string }).studentNumber === 'string'
      ? (user as User & { studentNumber?: string }).studentNumber!
      : (user.userId || '').toString()
  return studentNumber.toString().trim()
}

async function mergeSubjectAverages(
  user: User,
  info: { year: string; major: string } | null,
  topCreditCourses: SubjectGrade[]
): Promise<SubjectGrade[]> {
  const trimmedStudentNumber = getStudentNumber(user)
  const yearPart = trimmedStudentNumber.substring(0, 4)
  const majorFromInfo = info?.major

  if (!yearPart || !majorFromInfo) {
    return topCreditCourses
  }

  const courseIds = Array.from(
    new Set(
      topCreditCourses
        .map((course) => course.courseId)
        .filter((id): id is string => !!id)
    )
  )

  if (courseIds.length === 0) {
    return topCreditCourses
  }

  const { data: avgRows, error: avgError } = await supabase
    .from('Subject_Average')
    .select('"Course_ID", "Major", "Year", "Score"')
    .eq('"Major"', majorFromInfo)
    .eq('"Year"', yearPart)
    .in('"Course_ID"', courseIds)

  if (avgError || !avgRows?.length) {
    if (avgError) {
      console.error('查询 Subject_Average 失败:', avgError)
    }
    return topCreditCourses
  }

  const scoreMap = new Map<string, number>()
  for (const row of avgRows as { Course_ID: string; Score: number | string }[]) {
    const cid = row.Course_ID
    const score =
      typeof row.Score === 'number'
        ? row.Score
        : parseFloat(String(row.Score)) || 0
    if (cid) {
      scoreMap.set(cid, score)
    }
  }

  return topCreditCourses.map((subject) => {
    const cid = subject.courseId
    const dbAverage = cid ? scoreMap.get(cid) : undefined
    return {
      ...subject,
      average:
        dbAverage !== undefined
          ? Math.round(dbAverage * 10) / 10
          : subject.average,
    }
  })
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cachedUserHash, setCachedUserHash] = useState<string | null>(null)
  const loadingForHashRef = useRef<string | null>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([])
  const [courseTypeStats, setCourseTypeStats] = useState<CourseTypeStats[]>([])
  const [semesterTrends, setSemesterTrends] = useState<SemesterTrend[]>([])
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resetState = useCallback(() => {
    setCachedUserHash(null)
    loadingForHashRef.current = null
    setStats(null)
    setSubjectGrades([])
    setCourseTypeStats([])
    setSemesterTrends([])
    setStudentInfo(null)
    setIsLoading(false)
  }, [])

  const invalidateDashboard = useCallback(() => {
    resetState()
  }, [resetState])

  useEffect(() => {
    if (!user?.isLoggedIn) {
      resetState()
      return
    }
    if (cachedUserHash && cachedUserHash !== user.userHash) {
      resetState()
    }
  }, [user?.isLoggedIn, user?.userHash, cachedUserHash, resetState])

  const loadDashboardIfNeeded = useCallback(
    async (currentUser: User) => {
      if (cachedUserHash === currentUser.userHash) {
        return
      }

      if (loadingForHashRef.current === currentUser.userHash) {
        return
      }

      loadingForHashRef.current = currentUser.userHash
      setIsLoading(true)
      try {
        await queryAcademicResults(currentUser.userHash)

        const results = await getStudentResults(currentUser.userHash)
        const info = await getStudentInfo(currentUser.userHash)
        const studentGPA = await getStudentGPA(currentUser.userHash)

        const dashboardStats = calculateDashboardStats(results, studentGPA)
        const topCreditCourses = getLatestSemesterTopCreditCourses(results, 5)

        let mergedSubjects = topCreditCourses
        try {
          mergedSubjects = await mergeSubjectAverages(currentUser, info, topCreditCourses)
        } catch (avgError) {
          console.error('加载各科平均分失败:', avgError)
        }

        const typeStats = getCourseTypeStats(results)
        const trends = getSemesterTrends(results)

        setStudentInfo(info)
        setStats(dashboardStats)
        setSubjectGrades(mergedSubjects)
        setCourseTypeStats(typeStats)
        setSemesterTrends(trends)
        setCachedUserHash(currentUser.userHash)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        loadingForHashRef.current = null
      } finally {
        setIsLoading(false)
        if (loadingForHashRef.current === currentUser.userHash) {
          loadingForHashRef.current = null
        }
      }
    },
    [cachedUserHash]
  )

  return (
    <DashboardContext.Provider
      value={{
        stats,
        subjectGrades,
        courseTypeStats,
        semesterTrends,
        studentInfo,
        isLoading,
        cachedUserHash,
        loadDashboardIfNeeded,
        invalidateDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
