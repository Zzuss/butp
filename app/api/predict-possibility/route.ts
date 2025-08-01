import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

// 直接使用硬编码的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

// 使用环境变量
//const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

//if (!supabaseUrl || !supabaseKey) {
//  throw new Error('Missing Supabase environment variables');
//}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentHash = searchParams.get('studentHash');

    if (!studentHash) {
      return NextResponse.json(
        { error: '缺少studentHash参数' },
        { status: 400 }
      );
    }

    console.log('Fetching probability data for hash:', studentHash.substring(0, 16) + '...');

    // 从cohort_probability表获取概率数据
    const { data, error } = await supabase
      .from('cohort_probability')
      .select('proba_1, proba_2, proba_3, major')
      .eq('SNH', studentHash)
      .limit(1);

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: '数据库查询失败' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log('No probability data found for hash:', studentHash.substring(0, 16) + '...');
      return NextResponse.json(
        { error: '未找到概率数据' },
        { status: 404 }
      );
    }

    const probabilityData = data[0];
    
    // 转换为前端期望的格式
    const result = {
      proba_1: probabilityData.proba_1,
      proba_2: probabilityData.proba_2,
      proba_3: probabilityData.proba_3,
      major: probabilityData.major || '未知专业'
    };

    console.log('Probability data found:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { features } = await request.json();

    // 验证输入数据
    if (!features || !Array.isArray(features) || features.length !== 9) {
      return NextResponse.json(
        { error: '需要提供9个特征值' },
        { status: 400 }
      );
    }

    // 调用Python脚本进行预测
    const pythonScript = path.join(process.cwd(), 'test_model', 'predict_script.py');
    
    return new Promise<Response>((resolve) => {
      const pythonProcess = spawn('python', [pythonScript, JSON.stringify(features)]);
      
      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python脚本执行错误:', error);
          resolve(NextResponse.json(
            { error: '模型预测失败' },
            { status: 500 }
          ));
          return;
        }

        try {
          const prediction = JSON.parse(result);
          resolve(NextResponse.json(prediction));
        } catch (parseError) {
          console.error('解析Python输出失败:', parseError);
          resolve(NextResponse.json(
            { error: '解析预测结果失败' },
            { status: 500 }
          ));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('启动Python进程失败:', err);
        resolve(NextResponse.json(
          { error: '启动预测服务失败' },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 