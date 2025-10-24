import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * 阿里云预测结果下载代理
 * 将预测结果转换为Excel文件提供下载
 */

export async function POST(request: NextRequest) {
  try {
    const { majorResult, summary } = await request.json();

    if (!majorResult || !majorResult.result) {
      return NextResponse.json({ error: '无效的预测结果数据' }, { status: 400 });
    }

    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new();

    // 主要预测结果工作表
    if (majorResult.result.results && majorResult.result.results.Predictions) {
      const predictions = majorResult.result.results.Predictions;
      const predictionsSheet = XLSX.utils.json_to_sheet(predictions);
      XLSX.utils.book_append_sheet(workbook, predictionsSheet, 'Predictions');
    }

    // 统计信息工作表
    if (majorResult.result.statistics) {
      const statistics = [{
        专业: majorResult.major,
        学生总数: majorResult.studentCount,
        处理时间: new Date().toLocaleString(),
        批次ID: summary?.batchId || '',
        ...majorResult.result.statistics
      }];
      const statsSheet = XLSX.utils.json_to_sheet(statistics);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
    }

    // 如果有其他结果表，也添加进去
    if (majorResult.result.results) {
      Object.entries(majorResult.result.results).forEach(([sheetName, data]) => {
        if (sheetName !== 'Predictions' && Array.isArray(data)) {
          const sheet = XLSX.utils.json_to_sheet(data as any[]);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        }
      });
    }

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 生成文件名
    const majorCode = majorResult.major.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `${summary?.year || ''}级_${majorCode}_预测结果_${timestamp}.xlsx`;

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('[下载代理] 错误:', error);
    return NextResponse.json({
      success: false,
      error: '文件生成失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
