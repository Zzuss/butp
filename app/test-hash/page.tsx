"use client"

import { useState } from "react"
import { sha256 } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestHash() {
  const [studentId, setStudentId] = useState("2023213592")
  const [hash, setHash] = useState("")
  const [loading, setLoading] = useState(false)

  const calculateHash = async () => {
    setLoading(true)
    try {
      const result = await sha256(studentId)
      setHash(result)
    } catch (error) {
      console.error('哈希计算错误:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">哈希测试</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>计算学生ID的哈希值</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">学生ID:</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="输入学生ID"
              />
            </div>
            
            <Button onClick={calculateHash} disabled={loading}>
              {loading ? "计算中..." : "计算哈希值"}
            </Button>
            
            {hash && (
              <div>
                <label className="block text-sm font-medium mb-2">哈希值:</label>
                <pre className="bg-gray-100 p-2 rounded text-sm break-all">
                  {hash}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 