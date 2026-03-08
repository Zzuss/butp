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

// 更新各科平均分数据
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

    console.log('开始更新各科平均分数据...');

    // 调用各科平均分更新函数
    // 返回值类型：Array<{ success_count: number, failed_course_id: string | null, failed_major: string | null, failed_year: string | null }>
    const { data, error } = await supabase.rpc('update_subject_average');

    if (error) {
      console.error('执行各科平均分更新失败:', error);
      return NextResponse.json(
        {
          error: '执行各科平均分更新失败',
          details: error.message || String(error)
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data as any[] : [];

    const successCount =
      rows.length > 0 && typeof rows[0]?.success_count === 'number'
        ? rows[0].success_count
        : 0;

    const failedItems = rows
      .filter(row => row.failed_course_id && row.failed_major && row.failed_year)
      .map(row => ({
        courseId: row.failed_course_id as string,
        major: row.failed_major as string,
        year: row.failed_year as string,
      }));

    const failedCount = failedItems.length;

    console.log(
      `各科平均分更新完成: 成功 ${successCount} 条，失败组合 ${failedCount} 条`
    );

    return NextResponse.json({
      success: true,
      message: '各科平均分更新完成',
      statistics: {
        successCount,
        failedCount,
        failedItems,
      },
    });

  } catch (error) {
    console.error('各科平均分更新失败:', error);
    return NextResponse.json(
      {
        error: '各科平均分更新失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

