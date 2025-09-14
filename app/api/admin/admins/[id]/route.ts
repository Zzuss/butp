import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 更新管理员信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查当前用户是否为管理员
    const adminSessionCookie = request.cookies.get('admin-session');
    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { id } = params
    const updateData = await request.json()

    // 添加更新时间
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('admin_accounts')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新管理员失败:', error)
      return NextResponse.json(
        { error: '更新管理员失败' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '管理员不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '管理员信息更新成功',
      data: data[0]
    })

  } catch (error) {
    console.error('更新管理员API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 删除管理员
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查当前用户是否为管理员
    const adminSessionCookie = request.cookies.get('admin-session');
    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { id } = params

    // 检查是否是当前登录的管理员
    let currentAdminId = null
    try {
      const adminSession = JSON.parse(adminSessionCookie.value)
      currentAdminId = adminSession.id
    } catch (error) {
      console.error('解析管理员session失败:', error)
    }

    if (currentAdminId === id) {
      return NextResponse.json(
        { error: '不能删除当前登录的管理员账户' },
        { status: 400 }
      )
    }

    // 先检查管理员是否存在
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_accounts')
      .select('id, username')
      .eq('id', id)
      .single()

    if (checkError || !existingAdmin) {
      return NextResponse.json(
        { error: '管理员不存在' },
        { status: 404 }
      )
    }

    // 删除管理员
    const { error } = await supabase
      .from('admin_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除管理员失败:', error)
      return NextResponse.json(
        { error: '删除管理员失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '管理员删除成功'
    })

  } catch (error) {
    console.error('删除管理员API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
