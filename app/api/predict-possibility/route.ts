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

    // 调用Python脚本进行预测
    const result = await callXGBoostModel(featureValues);

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

async function callXGBoostModel(featureValues: FeatureValues): Promise<PredictionResult> {
  // 这里我们需要调用Python脚本来加载模型并进行预测
  // 由于Next.js API路由的限制，我们需要使用子进程来调用Python
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    // 创建临时文件来传递特征值
    const tempDataPath = path.join(process.cwd(), 'temp_prediction_data.json');
    const tempData = {
      featureValues: featureValues
    };
    
    fs.writeFileSync(tempDataPath, JSON.stringify(tempData));
    
    // 调用Python预测脚本
    const pythonScript = path.join(process.cwd(), 'scripts', 'predict.py');
    const pythonCmd = process.env.PYTHON_PATH || 'python';
    const scriptExists = fs.existsSync(pythonScript);
    console.log('predict-possibility: python call info', { pythonCmd, pythonScript, scriptExists });
    const pythonProcess = spawn(pythonCmd, [pythonScript, tempDataPath]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code: number) => {
      // 清理临时文件
      try {
        fs.unlinkSync(tempDataPath);
      } catch (e) {
        console.warn('Failed to delete temp file:', e);
      }
      
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${output}`));
      }
    });
    
    pythonProcess.on('error', (error: Error) => {
      console.error('Failed to start Python process:', error.message);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
} 