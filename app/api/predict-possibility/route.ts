import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

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