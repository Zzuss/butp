"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RefreshCw, AlertCircle } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'

export default function GPAUpdatePage() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [statistics, setStatistics] = useState<{
    updated: number
    inserted: number
    totalProcessed: number
  } | null>(null)

  // GPA门槛值更新相关状态
  const [showGateConfirmDialog, setShowGateConfirmDialog] = useState(false)
  const [gateLoading, setGateLoading] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateSuccess, setGateSuccess] = useState(false)
  const [gateStatistics, setGateStatistics] = useState<{
    updated: number
    inserted: number
    totalProcessed: number
  } | null>(null)

  const handleUpdateClick = () => {
    setShowConfirmDialog(true)
    setError(null)
    setSuccess(false)
    setStatistics(null)
  }

  const handleConfirm = async () => {
    setShowConfirmDialog(false)
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/GPA-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'GPA更新失败')
      }

      setSuccess(true)
      if (data.statistics) {
        setStatistics(data.statistics)
      }
    } catch (err) {
      console.error('GPA更新失败:', err)
      setError(err instanceof Error ? err.message : 'GPA更新失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirmDialog(false)
  }

  // GPA门槛值更新相关处理函数
  const handleGateUpdateClick = () => {
    setShowGateConfirmDialog(true)
    setGateError(null)
    setGateSuccess(false)
    setGateStatistics(null)
  }

  const handleGateConfirm = async () => {
    setShowGateConfirmDialog(false)
    setGateLoading(true)
    setGateError(null)
    setGateSuccess(false)

    try {
      const response = await fetch('/api/admin/GPA-update-gate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'GPA门槛值更新失败')
      }

      setGateSuccess(true)
      if (data.statistics) {
        setGateStatistics(data.statistics)
      }
    } catch (err) {
      console.error('GPA门槛值更新失败:', err)
      setGateError(err instanceof Error ? err.message : 'GPA门槛值更新失败，请重试')
    } finally {
      setGateLoading(false)
    }
  }

  const handleGateCancel = () => {
    setShowGateConfirmDialog(false)
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              GPA更新管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                根据新导入的学生成绩，更新数据库中的GPA数据。
              </p>
              <p className="text-sm text-muted-foreground">
                此操作将重新计算所有学生的GPA值并更新到数据库中。
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleUpdateClick}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    更新中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    更新GPA
                  </div>
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <span className="text-sm font-medium">GPA更新成功！</span>
                </div>
                {statistics && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-900 space-y-1">
                      <div className="font-medium">更新统计：</div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-blue-600">更新记录：</span>
                          <span className="font-semibold ml-1">{statistics.updated}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">新增记录：</span>
                          <span className="font-semibold ml-1">{statistics.inserted}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">总计处理：</span>
                          <span className="font-semibold ml-1">{statistics.totalProcessed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPA门槛值更新卡片 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              更新GPA门槛值
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                使用更新后的GPA，更新各年级、专业的GPA门槛值。
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleGateUpdateClick}
                disabled={gateLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {gateLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    更新中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    更新GPA门槛值
                  </div>
                )}
              </Button>
            </div>

            {gateError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{gateError}</span>
              </div>
            )}

            {gateSuccess && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <span className="text-sm font-medium">GPA门槛值更新成功！</span>
                </div>
                {gateStatistics && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-900 space-y-1">
                      <div className="font-medium">更新统计：</div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-blue-600">更新记录：</span>
                          <span className="font-semibold ml-1">{gateStatistics.updated}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">新增记录：</span>
                          <span className="font-semibold ml-1">{gateStatistics.inserted}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">总计处理：</span>
                          <span className="font-semibold ml-1">{gateStatistics.totalProcessed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GPA更新确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认更新GPA</DialogTitle>
            <DialogDescription>
              此操作将根据新导入的学生成绩重新计算并更新所有学生的GPA数据。
              <br />
              <span className="text-red-600">请确认已完成导入最新的学生成绩</span>
              <br />
              <br />
              确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              确认更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GPA门槛值更新确认对话框 */}
      <Dialog open={showGateConfirmDialog} onOpenChange={setShowGateConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认更新GPA门槛值</DialogTitle>
            <DialogDescription>
              此操作将使用更新后的GPA数据，重新计算并更新各年级、专业的GPA门槛值。
              <br />
              <span className="text-red-600">请确认已完成GPA更新</span>
              <br />
              <br />
              确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleGateCancel}
              disabled={gateLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleGateConfirm}
              disabled={gateLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              确认更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

