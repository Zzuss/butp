"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAllStudents, type Student } from '@/lib/student-data'
import { ChevronDown, User, Check } from 'lucide-react'

interface StudentSelectorProps {
  onStudentSelect: (student: Student) => void
  selectedStudent: Student | null
}

export function StudentSelector({ onStudentSelect, selectedStudent }: StudentSelectorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStudents() {
      try {
        const studentList = await getAllStudents()
        setStudents(studentList)
      } catch (error) {
        console.error('Failed to load students:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadStudents()
  }, [])

  const groupedStudents = students.reduce((acc, student) => {
    const major = student.Current_Major || '未指定专业'
    if (!acc[major]) {
      acc[major] = []
    }
    acc[major].push(student)
    return acc
  }, {} as Record<string, Student[]>)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            学生选择
          </CardTitle>
          <CardDescription>正在加载学生列表...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          学生选择
        </CardTitle>
        <CardDescription>
          请选择要查看数据的学生 ({students.length} 名学生)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selectedStudent ? (
              <span className="truncate">
                {selectedStudent.displayName}
              </span>
            ) : (
              "请选择学生..."
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-auto border border-border bg-background rounded-md shadow-lg">
              {Object.entries(groupedStudents).map(([major, majorStudents]) => (
                <div key={major} className="p-2">
                  <div className="text-sm font-medium text-muted-foreground px-2 py-1 bg-muted rounded">
                    {major} ({majorStudents.length})
                  </div>
                  {majorStudents.map((student) => (
                    <button
                      key={student.SNH}
                      className="w-full text-left px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded text-sm flex items-center justify-between"
                      onClick={() => {
                        onStudentSelect(student)
                        setIsOpen(false)
                      }}
                    >
                      <span className="truncate">
                        {student.SNH.substring(0, 8)}...
                      </span>
                      {selectedStudent?.SNH === student.SNH && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedStudent && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">已选择学生</div>
            <div className="text-xs text-muted-foreground mt-1">
              专业: {selectedStudent.Current_Major}
            </div>
            <div className="text-xs text-muted-foreground">
              SNH: {selectedStudent.SNH.substring(0, 16)}...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}