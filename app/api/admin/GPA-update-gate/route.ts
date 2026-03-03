import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 检查管理员权限
function checkAdminPermission(request: NextRequest): { isValid: boolean, adminId?: string } {
  const adminSessionCookie = request.cookies.get('admin-session');
  if (!adminSessionCookie?.value) {
    return { isValid: false };
  }
  return { isValid: true };
}

// 更新GPA门槛值
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const permission = checkAdminPermission(request);
    if (!permission.isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      );
    }

    console.log('开始更新GPA门槛值...');

    // 调用专门的GPA门槛值更新函数
    // 返回值类型：Array<{updated_count: number, inserted_count: number}>
    const { data, error } = await supabase.rpc('update_gpa_average_thresholds');

    if (error) {
      console.error('执行GPA门槛值更新失败:', error);
      return NextResponse.json(
        { 
          error: '执行GPA门槛值更新失败', 
          details: error.message || String(error)
        },
        { status: 500 }
      );
    }

    // 解析返回值
    // data 是数组，格式：[{updated_count: number, inserted_count: number}]
    const result = Array.isArray(data) && data.length > 0 ? data[0] : { updated_count: 0, inserted_count: 0 };
    const updatedCount = result.updated_count || 0;
    const insertedCount = result.inserted_count || 0;
    const totalProcessed = updatedCount + insertedCount;

    console.log(`GPA门槛值更新完成: 更新 ${updatedCount} 条，插入 ${insertedCount} 条，总计 ${totalProcessed} 条`);

    return NextResponse.json({
      success: true,
      message: 'GPA门槛值更新完成',
      statistics: {
        updated: updatedCount,
        inserted: insertedCount,
        totalProcessed: totalProcessed
      }
    });

  } catch (error) {
    console.error('GPA门槛值更新失败:', error);
    return NextResponse.json(
      { 
        error: 'GPA门槛值更新失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

