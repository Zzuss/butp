"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Plus, Edit, Trash2, UserCheck, UserX, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import AdminLayout from '@/components/admin/AdminLayout'

interface AdminUser {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'admin'
  })

  // 获取所有管理员
  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/admins')
      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
      } else {
        setMessage({ type: 'error', text: '获取管理员列表失败' })
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error)
      setMessage({ type: 'error', text: '获取管理员列表失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  // 创建新管理员
  const handleCreateAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      setMessage({ type: 'error', text: '用户名和密码不能为空' })
      return
    }

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAdmin),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '管理员创建成功' })
        setShowCreateDialog(false)
        setNewAdmin({
          username: '',
          password: '',
          email: '',
          full_name: '',
          role: 'admin'
        })
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || '创建失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '创建失败，请重试' })
    }
  }

  // 切换管理员状态
  const toggleAdminStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/admins/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: currentStatus ? '管理员已禁用' : '管理员已启用' 
        })
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || '操作失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '操作失败，请重试' })
    }
  }

  // 删除管理员
  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!confirm(`确定要删除管理员 "${username}" 吗？此操作不可恢复。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/admins/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '管理员删除成功' })
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || '删除失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败，请重试' })
    }
  }

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 角色显示名
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员'
      case 'admin':
        return '管理员'
      default:
        return role
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-3xl font-bold">管理员权限管理</h1>
          </div>
          
          <Button 
            onClick={() => setShowCreateDialog(!showCreateDialog)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {showCreateDialog ? '取消' : '添加管理员'}
          </Button>
        </div>

        {/* 创建管理员表单 */}
        {showCreateDialog && (
          <Card>
            <CardHeader>
              <CardTitle>创建新管理员</CardTitle>
              <CardDescription>
                填写以下信息创建新的管理员账户
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">用户名*</Label>
                  <Input
                    id="username"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    placeholder="输入用户名"
                  />
                </div>
                <div>
                  <Label htmlFor="password">密码*</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder="输入密码"
                  />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="输入邮箱地址"
                  />
                </div>
                <div>
                  <Label htmlFor="full_name">姓名</Label>
                  <Input
                    id="full_name"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                    placeholder="输入真实姓名"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="role">角色</Label>
                <select
                  id="role"
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                >
                  <option value="admin">管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateAdmin}>
                  创建管理员
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 管理员列表 */}
        <Card>
          <CardHeader>
            <CardTitle>管理员列表</CardTitle>
            <CardDescription>
              系统中所有管理员账户的信息和状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">加载中...</p>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无管理员账户
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-500" />
                          {admin.username}
                        </div>
                      </TableCell>
                      <TableCell>{admin.full_name || '-'}</TableCell>
                      <TableCell>{admin.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {getRoleDisplayName(admin.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                          {admin.is_active ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(admin.created_at)}</TableCell>
                      <TableCell>{formatDate(admin.last_login)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                            className={admin.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {admin.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
