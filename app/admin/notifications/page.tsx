"use client"

import React, { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, Plus, Edit, Trash2, Bell, Save, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  image_url?: string;
  admin_accounts?: {
    username: string;
    full_name: string | null;
  };
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as const,
    priority: 1,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    image_url: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  
  // 图片上传状态
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/notifications')
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '获取通知列表失败')
      }
      const data = await response.json()
      setNotifications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取通知列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNotification = async () => {
    setError(null)
    setFormLoading(true)
    try {
      // 先上传图片（如果有的话）
      let imageUrl = formData.image_url
      if (selectedImage) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          // 如果图片上传失败，停止创建通知
          return
        }
      }
      
      const payload = {
        ...formData,
        image_url: imageUrl,
        end_date: formData.end_date || null
      }
      
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '创建通知失败')
      }

      setShowCreateForm(false)
      resetForm()
      fetchNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建通知失败')
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateNotification = async (id: string) => {
    setError(null)
    setFormLoading(true)
    try {
      // 先上传图片（如果有新选择的图片）
      let imageUrl = formData.image_url
      if (selectedImage) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          // 如果图片上传失败，停止更新通知
          return
        }
      }
      
      const payload = {
        ...formData,
        image_url: imageUrl,
        end_date: formData.end_date || null
      }
      
      const response = await fetch(`/api/admin/notifications/single?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '更新通知失败')
      }

      setEditingId(null)
      resetForm()
      fetchNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新通知失败')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setError(null)
    try {
      const response = await fetch(`/api/admin/notifications/single?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        let errorMessage = '更新通知状态失败'
        try {
          const errData = await response.json()
          errorMessage = errData.error || errorMessage
        } catch (jsonError) {
          errorMessage = `更新通知状态失败 (HTTP ${response.status})`
        }
        throw new Error(errorMessage)
      }
      fetchNotifications()
    } catch (err) {
      console.error('更新通知状态错误:', err)
      setError(err instanceof Error ? err.message : '更新通知状态失败')
    }
  }

  const handleDeleteNotification = async (id: string) => {
    setError(null)
    if (!confirm('确定要删除此通知吗？此操作不可逆。')) {
      return
    }
    try {
      const response = await fetch(`/api/admin/notifications/single?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let errorMessage = '删除通知失败'
        try {
          // 尝试解析错误响应为JSON
          const errData = await response.json()
          errorMessage = errData.error || errorMessage
        } catch (jsonError) {
          // 如果JSON解析失败，使用HTTP状态作为错误消息
          errorMessage = `删除通知失败 (HTTP ${response.status})`
        }
        throw new Error(errorMessage)
      }
      
      // 检查响应是否有内容
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        try {
          const result = await response.json()
          console.log('删除成功:', result)
        } catch (jsonError) {
          console.warn('JSON解析失败，但删除可能成功:', jsonError)
        }
      } else {
        console.log('删除成功，无JSON响应')
      }
      
      // 删除成功，刷新列表
      fetchNotifications()
    } catch (err) {
      console.error('删除通知错误:', err)
      setError(err instanceof Error ? err.message : '删除通知失败')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 1,
      start_date: new Date().toISOString().slice(0, 16),
      end_date: '',
      image_url: ''
    })
    setSelectedImage(null)
    setImagePreview('')
  }

  const startEdit = (notification: Notification) => {
    setFormData({
      title: notification.title,
      content: notification.content,
      type: notification.type,
      priority: notification.priority,
      start_date: new Date(notification.start_date).toISOString().slice(0, 16),
      end_date: notification.end_date ? new Date(notification.end_date).toISOString().slice(0, 16) : '',
      image_url: notification.image_url || ''
    })
    setSelectedImage(null)
    setImagePreview(notification.image_url || '')
    setEditingId(notification.id)
    setShowCreateForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    resetForm()
  }

  // 处理图片文件选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('只支持 JPG、PNG、GIF、WebP 格式的图片')
        return
      }
      
      // 验证文件大小 (5MB)
      if (file.size > 5242880) {
        setError('图片大小不能超过 5MB')
        return
      }
      
      setSelectedImage(file)
      
      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 上传图片
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null
    
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedImage)
      
      const response = await fetch('/api/admin/notifications/upload-image', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '图片上传失败')
      }
      
      const data = await response.json()
      return data.imageUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
      return null
    } finally {
      setImageUploading(false)
    }
  }

  // 移除图片
  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview('')
    setFormData({ ...formData, image_url: '' })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'success': return '成功'
      case 'warning': return '警告'
      case 'error': return '错误'
      default: return '信息'
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="h-8 w-8 text-purple-600" />
          系统通知管理
        </h1>
        <Button 
          onClick={() => {
            setShowCreateForm(true)
            setEditingId(null)
            resetForm()
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          创建通知
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 mb-4">
          <AlertCircle className="h-4 w-4 text-red-800" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* 创建/编辑表单 */}
      {(showCreateForm || editingId) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? '编辑通知' : '创建新通知'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">标题 *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="通知标题"
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                  disabled={formLoading}
                >
                  <option value="info">信息</option>
                  <option value="success">成功</option>
                  <option value="warning">警告</option>
                  <option value="error">错误</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">内容 *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="通知内容"
                rows={4}
                disabled={formLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">通知图片 (可选)</label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  disabled={formLoading || imageUploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  支持 JPG、PNG、GIF、WebP 格式，文件大小不超过 5MB
                </p>
                
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="图片预览"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 p-1 h-6 w-6"
                      onClick={removeImage}
                      disabled={formLoading || imageUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {imageUploading && (
                  <p className="text-sm text-blue-600">正在上传图片...</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">优先级 (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (!isNaN(value) && value >= 1 && value <= 10) {
                      setFormData({ ...formData, priority: value })
                    }
                  }}
                  placeholder="1"
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">开始时间</label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  disabled={formLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">结束时间 (可选)</label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  cancelEdit()
                }}
                disabled={formLoading}
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button
                onClick={editingId ? () => handleUpdateNotification(editingId) : handleCreateNotification}
                disabled={formLoading || imageUploading || !formData.title.trim() || !formData.content.trim() || formData.priority < 1 || formData.priority > 10}
              >
                <Save className="h-4 w-4 mr-2" />
                {formLoading || imageUploading ? '保存中...' : (editingId ? '更新' : '创建')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 通知列表 */}
      <Card>
        <CardHeader>
          <CardTitle>所有系统通知</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无系统通知</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead>创建者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate" title={notification.title}>
                        {notification.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={notification.content}>
                        {notification.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(notification.type)}>
                        {getTypeName(notification.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{notification.priority}</TableCell>
                    <TableCell>
                      <Badge variant={notification.is_active ? 'default' : 'destructive'}>
                        {notification.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(notification.start_date).toLocaleString()}</TableCell>
                    <TableCell>
                      {notification.end_date ? new Date(notification.end_date).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {notification.admin_accounts?.username || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Switch
                          checked={notification.is_active}
                          onCheckedChange={() => handleToggleActive(notification.id, notification.is_active)}
                          aria-label={`Toggle ${notification.title} active status`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(notification)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
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
    </AdminLayout>
  )
}
