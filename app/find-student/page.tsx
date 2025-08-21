"use client"

import { useState } from "react"
import { sha256 } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// 数据库中已知存在的一些哈希值
const knownHashes = [
  "0886e2a5c75eaa21b81977e56f67c6faceafb1ee67eeb8a85c1eacc8bbd2447b",
  "cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb",
  "282449dd2c0f5a7e0bfd50328d6eb7a09f49a4174a024cbbfa66e31fb728874d",
  "fc18f0250852c8530fa4399675d21edb6877f9f18b759da8a0705be86b61e7e5",
  "b8470e2f87f66b7f2daa5320cf06daab2818b728dcba92def5d9d32ff1799752"
]

export default function FindStudent() {
  const [testResults, setTestResults] = useState<Array<{
    studentId: string;
    hash: string;
    isMatch: boolean;
  }>>([])
  const [loading, setLoading] = useState(false)

  // 测试一些常见的学号格式
  const testStudentIds = [
    "2023213592",
    "2024213472", 
    "2023213043",
    "teststudent1",
    "teststudent2",
    "teststudent3",
    "2023213591",
    "2023213593",
    "2024213471",
    "2024213473",
    "2023213042",
    "2023213044",
    "2023213590",
    "2023213594",
    "2024213470"
  ]

  const findMatchingStudent = async () => {
    setLoading(true)
    const results = []

    for (const studentId of testStudentIds) {
      try {
        const hash = await sha256(studentId)
        const isMatch = knownHashes.includes(hash)
        results.push({
          studentId,
          hash,
          isMatch
        })
      } catch (error) {
        console.error('哈希计算错误:', error)
      }
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">查找匹配的学号</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>已知的数据库哈希值</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {knownHashes.map((hash, index) => (
              <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                {hash}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试学号匹配</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={findMatchingStudent} disabled={loading} className="mb-4">
            {loading ? "测试中..." : "开始测试"}
          </Button>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">测试结果:</h3>
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded border ${
                    result.isMatch ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      学号: {result.studentId}
                    </span>
                    <span className={`text-sm ${result.isMatch ? 'text-green-600' : 'text-gray-500'}`}>
                      {result.isMatch ? '✅ 匹配' : '❌ 不匹配'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    哈希值: {result.hash}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            1. 点击&ldquo;开始测试&rdquo;按钮来测试常见的学号格式<br/>
            2. 如果找到匹配的学号，它会显示为绿色<br/>
            3. 使用匹配的学号登录系统来测试概率数据功能<br/>
            4. 如果都没有匹配，可能需要检查数据库中的实际学号格式
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 