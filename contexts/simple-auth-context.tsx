"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Student {
  id: string
  name: string
  class: string
}

interface SimpleAuthContextType {
  currentStudent: Student | null
  isLoggedIn: boolean
  login: (student: Student) => void
  logout: () => void
  isLoading: boolean
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export const students = [
  { id: "2023213592", name: "学生 A", class: "通信工程专业" },
  { id: "2024213472", name: "学生 B", class: "计算机科学与技术专业" },
  { id: "2023213043", name: "学生 C", class: "软件工程专业" },
]

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      isLoading
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