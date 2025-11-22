"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Student {
  id: string
  name: string
  class: string
}

interface StudentData {
  targetScores: {
    target1_score: number | null;
    target2_score: number | null;
  } | null;
  probabilityData: {
    proba_1: number | null;
    proba_2: number | null;
  } | null;
  major: string | null;
  courseScores: Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
  }> | null;
  source2Scores: Array<{
    courseName: string;
    score: number | null;
    semester: number | null;
    category: string | null;
    courseId?: string;
    credit?: number;
    courseType?: string;
    courseAttribute?: string;
    examType?: string;
  }> | null;
  allCourseData: any | null;
}

interface SimpleAuthContextType {
  currentStudent: Student | null
  isLoggedIn: boolean
  login: (student: Student) => void
  logout: () => void
  isLoading: boolean
  // 全局缓存
  studentDataCache: Record<string, StudentData>
  setStudentDataCache: React.Dispatch<React.SetStateAction<Record<string, StudentData>>>
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export const students = [
  { id: "demo001", name: "示例学生1", class: "示例专业" },
  { id: "demo002", name: "示例学生2", class: "示例专业" },
  { id: "demo003", name: "示例学生3", class: "示例专业" },
  { id: "teststudent1", name: "测试学生1", class: "电信工程及管理" },
  { id: "teststudent2", name: "测试学生2", class: "电信工程及管理" },
  { id: "teststudent3", name: "测试学生3", class: "电信工程及管理" },
]

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studentDataCache, setStudentDataCache] = useState<Record<string, StudentData>>({})

  useEffect(() => {
    // 从cookie中恢复登录状态
    const savedStudentData = getCookie('currentStudent')
    if (savedStudentData) {
      try {
        const student = JSON.parse(savedStudentData)
        setCurrentStudent(student)
      } catch (error) {
        console.error('Failed to parse student data from cookie:', error)
        deleteCookie('currentStudent')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (student: Student) => {
    setCurrentStudent(student)
    setCookie('currentStudent', JSON.stringify(student), 7) // 保存7天
  }

  const logout = () => {
    setCurrentStudent(null)
    deleteCookie('currentStudent')
  }

  return (
    <SimpleAuthContext.Provider value={{
      currentStudent,
      isLoggedIn: !!currentStudent,
      login,
      logout,
      isLoading,
      studentDataCache,
      setStudentDataCache
    }}>
      {children}
    </SimpleAuthContext.Provider>
  )
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}

// Cookie 工具函数
function setCookie(name: string, value: string, days: number) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

function getCookie(name: string): string | null {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}