"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// 我们知道这些哈希值在数据库中存在
const knownWorkingHashes = [
  {
    hash: "0886e2a5c75eaa21b81977e56f67c6faceafb1ee67eeb8a85c1eacc8bbd2447b",
    description: "测试哈希值1"
  },
  {
    hash: "cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb", 
    description: "测试哈希值2"
  },
  {
    hash: "282449dd2c0f5a7e0bfd50328d6eb7a09f49a4174a024cbbfa66e31fb728874d",
    description: "测试哈希值3"
  }
]

export default function TestKnownHash() {
  const [testResults, setTestResults] = useState<Array<{
    hash: string;
    description: string;
    data: { proba_1: number; proba_2: number; proba_3: number } | null;
    error: string | null;
  }>>([])
  const [loading, setLoading] = useState(false)

  const testKnownHashes = async () => {
    setLoading(true)
    const results = []

    for (const item of knownWorkingHashes) {
      try {
        // 直接使用哈希值查询数据库
        const { data, error } = await fetch('/api/test-probability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hash: item.hash })
        }).then(res => res.json())

        results.push({
          hash: item.hash,
          description: item.description,
          data: data,
          error: error
        })
      } catch (err) {
        results.push({
          hash: item.hash,
          description: item.description,
          data: null,
          error: `请求失败: ${err}`
        })
      }
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">测试已知哈希值</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试数据库中的真实数据</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testKnownHashes} disabled={loading} className="mb-4">
            {loading ? "测试中..." : "测试已知哈希值"}
          </Button>
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">{result.description}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded mb-2">
                      哈希值: {result.hash}
                    </div>
                    
                    {result.error ? (
                      <p className="text-red-500 text-sm">{result.error}</p>
                    ) : result.data ? (
                      <div className="space-y-1">
                        <p><strong>就业概率:</strong> {(result.data.proba_1 * 100).toFixed(1)}%</p>
                        <p><strong>升学概率:</strong> {(result.data.proba_2 * 100).toFixed(1)}%</p>
                        <p><strong>实习概率:</strong> {(result.data.proba_3 * 100).toFixed(1)}%</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">未找到数据</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 