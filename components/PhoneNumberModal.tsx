"use client"

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PhoneNumberModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (phoneNumber: string) => Promise<void>
  currentPhone?: string
  isRequired?: boolean
}

export default function PhoneNumberModal({
  isOpen,
  onClose,
  onSubmit,
  currentPhone = '',
  isRequired = true
}: PhoneNumberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9][0-9]{9}$/
    return phoneRegex.test(phone)
  }

  const handleSubmit = async () => {
    setError('')

    if (!phoneNumber.trim()) {
      setError('请输入手机号')
      return
    }

    if (!validatePhone(phoneNumber)) {
      setError('请输入正确的11位手机号')
      return
    }

    setLoading(true)
    try {
      await onSubmit(phoneNumber)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!isRequired) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentPhone ? '修改手机号' : '📱 完善联系方式'}
          </h2>
          {!isRequired && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          {!currentPhone && (
            <p className="text-sm text-gray-600">
              为了方便后续联系和推免相关事宜，请填写您的手机号。
            </p>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              手机号 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="请输入11位手机号"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                setPhoneNumber(value)
                setError('')
              }}
              maxLength={11}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              格式：13812345678
            </p>
          </div>
        </div>

        {/* 按钮区 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          {!isRequired && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading || !phoneNumber}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? '保存中...' : '确认提交'}
          </Button>
        </div>
      </div>
    </div>
  )
}
