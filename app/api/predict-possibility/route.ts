import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 定义特征值的类型
interface FeatureValues {
  public: number;
  political: number;
  english: number;
  math_science: number;
  basic_subject: number;
  basic_major: number;
  major: number;
  practice: number;
  innovation: number;
}

// 定义预测结果的类型
interface PredictionResult {
  probabilities: number[]; // 3个百分比 [0类概率, 1类概率, 2类概率]
  predictedClass: number;  // 最高概率的类别 (0, 1, 或 2)
  featureValues: FeatureValues;
}

export async function POST(request: NextRequest) {
  try {
    // 健康检查
    if ((request as any).nextUrl && (request as any).nextUrl.searchParams.get('health') === '1') {
      return NextResponse.json({ ok: true, runtime });
    }

    const { featureValues } = await request.json();

    // 验证输入
    if (!featureValues) {
      return NextResponse.json({ 
        error: 'featureValues is required' 
      }, { status: 400 });
    }

    // 验证九个特征值是否都存在
    const requiredFeatures = [
      'public', 'political', 'english', 'math_science', 
      'basic_subject', 'basic_major', 'major', 'practice', 'innovation'
    ];

    for (const feature of requiredFeatures) {
      if (typeof featureValues[feature] !== 'number') {
        return NextResponse.json({ 
          error: `Missing or invalid feature: ${feature}` 
        }, { status: 400 });
      }
    }

    // 基本诊断日志
    console.log('predict-possibility: received features', {
      keys: Object.keys(featureValues || {}),
      cwd: process.cwd(),
      node: process.version
    });

    // 改为调用 Python Serverless Function
    const apiBase = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    const endpoint = `${apiBase}/api/predict`

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureValues })
    })
    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ error: `Predict API failed: ${resp.status} ${text}` }, { status: 500 })
    }
    const result = await resp.json()

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in predict-possibility:', error instanceof Error ? (error.stack || error.message) : error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}