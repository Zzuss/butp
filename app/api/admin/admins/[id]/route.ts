import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 更新管理员信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    let currentAdmin
    try {
      currentAdmin = JSON.parse(adminSessionCookie.value)
    } catch (e) {
      return NextResponse.json(
        { error: '无效的session' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    
    // 获取目标管理员信息
    const { data: targetAdmin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !targetAdmin) {
      return NextResponse.json(
        { error: '管理员不存在' },
        { status: 404 }
      )
    }

    // 权限检查
    const isSuperAdmin = currentAdmin.role === 'super_admin'
    const isSelf = currentAdmin.id === id
    
    // 超级管理员可以编辑所有人，普通管理员只能编辑自己
    if (!isSuperAdmin && !isSelf) {
      return NextResponse.json(
        { error: '没有权限编辑此管理员' },
        { status: 403 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // 更新基本信息
    if (body.username !== undefined) {
      // 检查用户名是否已存在（排除自己）
      const { data: existingUser } = await supabase
        .from('admin_accounts')
        .select('id')
        .eq('username', body.username.trim())
        .neq('id', id)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 400 }
        )
      }
      
      updateData.username = body.username.trim()
    }

    if (body.email !== undefined) {
      if (body.email && body.email.trim()) {
        // 检查邮箱是否已存在（排除自己）
        const { data: existingEmail } = await supabase
          .from('admin_accounts')
          .select('id')
          .eq('email', body.email.trim())
          .neq('id', id)
          .single()

        if (existingEmail) {
          return NextResponse.json(
            { error: '邮箱已存在' },
            { status: 400 }
          )
        }
        updateData.email = body.email.trim()
      } else {
        updateData.email = null
      }
    }

    if (body.full_name !== undefined) {
      updateData.full_name = body.full_name.trim() || null
    }

    // 角色更新权限检查
    if (body.role !== undefined) {
      // 只有超级管理员可以修改角色
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: '没有权限修改角色' },
          { status: 403 }
        )
      }
      
      // 检查角色是否合法
      const validRoles = ['admin', 'super_admin']
      if (!validRoles.includes(body.role)) {
        return NextResponse.json(
          { error: '无效的角色类型' },
          { status: 400 }
        )
      }
      
      updateData.role = body.role
    }

    // 状态更新权限检查
    if (body.is_active !== undefined) {
      // 不能禁用自己
      if (isSelf && !body.is_active) {
        return NextResponse.json(
          { error: '不能禁用自己的账户' },
          { status: 400 }
        )
      }
      
      // 只有超级管理员可以修改状态
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: '没有权限修改状态' },
          { status: 403 }
        )
      }
      updateData.is_active = body.is_active
    }

    // 密码更新
    if (body.password && body.password.trim()) {
      // 使用数据库函数更新密码（加密）
      const { error: passwordError } = await supabase.rpc('update_admin_password', {
        p_admin_id: id,
        p_new_password: body.password.trim()
      })

      if (passwordError) {
        console.error('更新密码失败:', passwordError)
        return NextResponse.json(
          { error: '密码更新失败' },
          { status: 500 }
        )
      }
    }

    // 更新其他信息（排除密码，密码已单独处理）
    delete updateData.password
    
    const { data, error } = await supabase
      .from('admin_accounts')
      .update(updateData)
      .eq('id', id)
      .select('id, username, email, full_name, role, is_active, created_at, updated_at, last_login')
      .single()

    if (error) {
      console.error('更新管理员失败:', error)
      return NextResponse.json(
        { error: '更新管理员失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '管理员信息更新成功',
      data
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
  { params }: { params: Promise<{ id: string }> }
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

    let currentAdmin
    try {
      currentAdmin = JSON.parse(adminSessionCookie.value)
    } catch (e) {
      return NextResponse.json(
        { error: '无效的session' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 不能删除自己
    if (currentAdmin.id === id) {
      return NextResponse.json(
        { error: '不能删除自己的账户' },
        { status: 400 }
      )
    }

    // 只有超级管理员可以删除其他管理员
    if (currentAdmin.role !== 'super_admin') {
      return NextResponse.json(
        { error: '只有超级管理员可以删除管理员' },
        { status: 403 }
      )
    }

    // 先检查管理员是否存在
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_accounts')
      .select('id, username, role')
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
      message: `管理员 ${existingAdmin.username} 删除成功`
    })

  } catch (error) {
    console.error('删除管理员API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
