'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testFeatureValues = {
    public: 85.5,        // 公共课程
    political: 88.0,     // 政治课程
    english: 82.5,       // 英语课程
    math_science: 78.0,  // 数学科学
    basic_subject: 90.0, // 基础学科
    basic_major: 85.0,   // 基础专业
    major: 87.5,         // 专业课程
    practice: 92.0,      // 实践课程
    innovation: 88.5     // 创新课程
  };

  const testPrediction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('测试XGBoost模型预测...');
      console.log('输入特征值:', testFeatureValues);
      
      const response = await fetch('/api/predict-possibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureValues: testFeatureValues
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('预测结果:', data);
        setResult(data);
        
        if (data.success && data.data) {
          const { probabilities, predictedClass } = data.data;
          
          // 验证概率总和是否为1
          const totalProb = probabilities.reduce((sum: number, prob: number) => sum + prob, 0);
          console.log('概率总和:', totalProb.toFixed(6));
          
          if (Math.abs(totalProb - 1.0) >= 0.001) {
            setError('概率验证失败：概率总和不为1');
          }
        }
      } else {
        const errorText = await response.text();
        console.log('API请求失败:', response.status, errorText);
        setError(`API请求失败: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('测试失败:', error);
      setError(`测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">XGBoost模型预测测试</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试特征值</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(testFeatureValues).map(([key, value]) => (
              <div key={key} className="p-3 border rounded-lg">
                <div className="text-sm font-medium text-gray-600">{key}</div>
                <div className="text-lg font-bold text-blue-600">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Button 
          onClick={testPrediction} 
          disabled={loading}
          className="px-8 py-3 text-lg"
        >
          {loading ? '测试中...' : '开始测试预测'}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600 font-medium">错误信息:</div>
            <div className="text-red-500 mt-2">{error}</div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>预测结果</CardTitle>
          </CardHeader>
          <CardContent>
            {result.success && result.data ? (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">概率分布:</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {result.data.probabilities.map((prob: number, index: number) => (
                      <div key={index} className="p-3 border rounded-lg bg-blue-50">
                        <div className="text-sm font-medium text-blue-700">类别 {index}</div>
                        <div className="text-xl font-bold text-blue-600">
                          {(prob * 100).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">预测类别:</h3>
                  <div className="text-2xl font-bold text-green-600">
                    类别 {result.data.predictedClass}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">输入特征值:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(result.data.featureValues, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-red-600">
                API返回错误: {JSON.stringify(result, null, 2)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 