"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Shield, Plus, Edit, Trash2, Save, X, Eye, EyeOff, AlertCircle, User } from 'lucide-react'
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

interface CurrentUser {
  id: string
  role: string
  username: string
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'admin'
  })
  const [formLoading, setFormLoading] = useState(false)

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/admin-session')
      if (response.ok) {
        const data = await response.json()
        if (data.isAdmin && data.admin) {
          setCurrentUser({
            id: data.admin.id,
            role: data.admin.role,
            username: data.admin.username
          })
        }
      }
    } catch (err) {
      console.error('获取当前用户信息失败:', err)
    }
  }

  // 获取管理员列表
  const fetchAdmins = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/admins')
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '获取管理员列表失败')
      }
      const data = await response.json()
      setAdmins(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取管理员列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchAdmins()
  }, [])

  // 权限检查函数
  const canEditAdmin = (targetAdmin: AdminUser) => {
    if (!currentUser) return false
    
    // 超级管理员可以编辑所有人
    if (currentUser.role === 'super_admin') return true
    
    // 普通管理员只能编辑自己
    return currentUser.id === targetAdmin.id
  }

  const canDeleteAdmin = (targetAdmin: AdminUser) => {
    if (!currentUser) return false
    
    // 不能删除自己
    if (currentUser.id === targetAdmin.id) return false
    
    // 超级管理员可以删除其他人
    if (currentUser.role === 'super_admin') return true
    
    // 普通管理员不能删除任何人
    return false
  }

  const canToggleStatus = (targetAdmin: AdminUser) => {
    if (!currentUser) return false
    
    // 不能禁用自己
    if (currentUser.id === targetAdmin.id) return false
    
    // 超级管理员可以切换其他人状态
    if (currentUser.role === 'super_admin') return true
    
    // 普通管理员不能切换任何人状态
    return false
  }

  const canCreateSuperAdmin = () => {
    return currentUser?.role === 'super_admin'
  }

  // 创建管理员
  const handleCreateAdmin = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('用户名和密码不能为空')
      return
    }

    setFormLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '创建管理员失败')
      }

      resetForm()
      setShowCreateForm(false)
      fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建管理员失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 更新管理员信息
  const handleUpdateAdmin = async (adminId: string) => {
    if (!formData.username.trim()) {
      setError('用户名不能为空')
      return
    }

    setFormLoading(true)
    setError(null)
    try {
      const updateData: any = {
        username: formData.username,
        email: formData.email || null,
        full_name: formData.full_name || null,
        role: formData.role
      }
      
      // 如果提供了新密码，则更新密码
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '更新管理员失败')
      }

      setEditingAdmin(null)
      resetForm()
      fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新管理员失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 切换管理员状态
  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    setError(null)
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '更新状态失败')
      }
      
      fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败')
    }
  }

  // 删除管理员
  const handleDeleteAdmin = async (adminId: string, username: string) => {
    if (!confirm(`确定要删除管理员 "${username}" 吗？此操作不可逆。`)) {
      return
    }
    
    setError(null)
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '删除管理员失败')
      }
      
      fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除管理员失败')
    }
  }

  // 开始编辑
  const startEdit = (admin: AdminUser) => {
    setFormData({
      username: admin.username,
      password: '', // 编辑时密码为空，表示不修改
      email: admin.email || '',
      full_name: admin.full_name || '',
      role: admin.role
    })
    setEditingAdmin(admin.id)
    setShowCreateForm(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingAdmin(null)
    resetForm()
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      role: 'admin'
    })
    setError(null)
  }

  // 切换密码显示
  const togglePasswordVisibility = (adminId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return '超级管理员'
      case 'admin': return '管理员'
      default: return role
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-purple-600" />
          管理员权限管理
        </h1>
        <Button 
          onClick={() => {
            setShowCreateForm(true)
            setEditingAdmin(null)
            resetForm()
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加管理员
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 mb-4">
          <AlertCircle className="h-4 w-4 text-red-800" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingAdmin) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingAdmin ? '编辑管理员' : '创建新管理员'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="用户名"
                  disabled={formLoading}
                />
              </div>
              <div>
                <Label>角色</Label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  disabled={formLoading || (!canCreateSuperAdmin() && formData.role === 'super_admin')}
                >
                  <option value="admin">管理员</option>
                  {canCreateSuperAdmin() && <option value="super_admin">超级管理员</option>}
                </select>
              </div>
            </div>

            <div>
              <Label>密码 {editingAdmin ? '(留空表示不修改)' : '*'}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.form ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? "留空表示不修改密码" : "至少6个字符"}
                  disabled={formLoading}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePasswordVisibility('form')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  {showPasswords.form ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {!editingAdmin && formData.password && (
                <div className="text-xs mt-1">
                  {formData.password.length < 6 ? (
                    <span className="text-red-500">密码至少需要6个字符</span>
                  ) : formData.password.length < 8 ? (
                    <span className="text-yellow-600">密码强度一般，建议使用8位以上</span>
                  ) : (
                    <span className="text-green-600">密码强度良好</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>姓名</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="真实姓名"
                  disabled={formLoading}
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="邮箱地址"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (editingAdmin) {
                    cancelEdit()
                  } else {
                    setShowCreateForm(false)
                    resetForm()
                  }
                }}
                disabled={formLoading}
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button
                onClick={editingAdmin ? () => handleUpdateAdmin(editingAdmin) : handleCreateAdmin}
                disabled={formLoading || !formData.username.trim() || (!editingAdmin && !formData.password.trim())}
              >
                <Save className="h-4 w-4 mr-2" />
                {formLoading ? '保存中...' : (editingAdmin ? '更新' : '创建')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 管理员列表 */}
      <Card>
        <CardHeader>
          <CardTitle>所有管理员账户</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无管理员账户</div>
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
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {admin.id === currentUser?.id ? (
                        <User className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-gray-500" />
                      )}
                      {admin.username}
                      {admin.id === currentUser?.id && (
                        <span className="text-xs text-purple-600 font-normal">(您)</span>
                      )}
                    </TableCell>
                    <TableCell>{admin.full_name || '-'}</TableCell>
                    <TableCell>{admin.email || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(admin.role)}>
                        {getRoleName(admin.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.is_active ? 'default' : 'destructive'}>
                        {admin.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleString()}</TableCell>
                    <TableCell>{admin.last_login ? new Date(admin.last_login).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {canToggleStatus(admin) && (
                          <Switch
                            checked={admin.is_active}
                            onCheckedChange={() => handleToggleStatus(admin.id, admin.is_active)}
                            aria-label={`Toggle ${admin.username} active status`}
                          />
                        )}
                        {canEditAdmin(admin) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteAdmin(admin) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}