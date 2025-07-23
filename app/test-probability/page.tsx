"use client"

import { useState, useEffect, useCallback } from "react"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { getUserProbabilityData } from "@/lib/dashboard-data"
import { sha256 } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestProbability() {
  const { currentStudent } = useSimpleAuth()
  const [probabilityData, setProbabilityData] = useState<{
    proba_1: number;
    proba_2: number;
    proba_3: number;
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentStudent) {
      setError("未登录")
      return
    }

    setLoading(true)
    setError(null)
    setDebugInfo(null)
    
    try {
      // 测试哈希函数
      const studentHash = await sha256(currentStudent.id)
      setDebugInfo(`学生ID: ${currentStudent.id}\n哈希值: ${studentHash}`)
      
      const data = await getUserProbabilityData(currentStudent.id)
      setProbabilityData(data)
      if (!data) {
        setError("未找到概率数据 - 这是正常的，系统将显示默认值（就业70%，升学80%，实习90%）")
      }
    } catch (err) {
      console.error('详细错误信息:', err)
      setError(`获取数据失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [currentStudent])

  useEffect(() => {
    if (currentStudent) {
      fetchData()
    }
  }, [currentStudent, fetchData])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">概率数据测试</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>当前用户信息</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStudent ? (
            <div>
              <p><strong>学号:</strong> {currentStudent.id}</p>
              <p><strong>姓名:</strong> {currentStudent.name}</p>
              <p><strong>专业:</strong> {currentStudent.class}</p>
            </div>
          ) : (
            <p>未登录</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo && (
            <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
              {debugInfo}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>概率数据</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>加载中...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {probabilityData && (
            <div className="space-y-2">
              <p><strong>就业概率 (proba_1):</strong> {(probabilityData.proba_1 * 100).toFixed(1)}%</p>
              <p><strong>升学概率 (proba_2):</strong> {(probabilityData.proba_2 * 100).toFixed(1)}%</p>
              <p><strong>实习概率 (proba_3):</strong> {(probabilityData.proba_3 * 100).toFixed(1)}%</p>
            </div>
          )}
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "加载中..." : "重新获取"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
} 