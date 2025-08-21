"use client"

import { useState } from "react"
import { sha256 } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyHash() {
  const [testResults, setTestResults] = useState<Array<{
    studentId: string;
    hash: string;
    expectedHash: string;
    isMatch: boolean;
  }>>([])
  const [loading, setLoading] = useState(false)

  // 测试学号及其期望的哈希值
  const testCases = [
    {
      studentId: "teststudent1",
      expectedHash: "0886e2a5c75eaa21b81977e56f67c6faceafb1ee67eeb8a85c1eacc8bbd2447b"
    },
    {
      studentId: "teststudent2", 
      expectedHash: "cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb"
    },
    {
      studentId: "teststudent3",
      expectedHash: "282449dd2c0f5a7e0bfd50328d6eb7a09f49a4174a024cbbfa66e31fb728874d"
    }
  ]

  const verifyHashes = async () => {
    setLoading(true)
    const results = []

    for (const testCase of testCases) {
      try {
        const hash = await sha256(testCase.studentId)
        const isMatch = hash === testCase.expectedHash
        results.push({
          studentId: testCase.studentId,
          hash,
          expectedHash: testCase.expectedHash,
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
      <h1 className="text-2xl font-bold mb-6">验证哈希函数</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试学号和哈希值匹配</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={verifyHashes} disabled={loading} className="mb-4">
            {loading ? "验证中..." : "开始验证"}
          </Button>
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      测试学号: {result.studentId}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${result.isMatch ? 'text-green-600' : 'text-red-600'}`}>
                          {result.isMatch ? '✅ 匹配' : '❌ 不匹配'}
                        </span>
                      </div>
                      
                      <div className="text-xs">
                        <div className="font-medium">计算出的哈希值:</div>
                        <div className="font-mono bg-gray-100 p-2 rounded break-all">
                          {result.hash}
                        </div>
                      </div>
                      
                      <div className="text-xs">
                        <div className="font-medium">期望的哈希值:</div>
                        <div className="font-mono bg-gray-100 p-2 rounded break-all">
                          {result.expectedHash}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            1. 点击&ldquo;开始验证&rdquo;来测试哈希函数<br/>
            2. 如果所有测试都显示&ldquo;✅ 匹配&rdquo;，说明哈希函数工作正常<br/>
            3. 然后可以使用这些测试学号登录系统来测试概率数据功能<br/>
            4. 如果哈希值不匹配，可能需要检查哈希算法或数据库中的实际数据
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 