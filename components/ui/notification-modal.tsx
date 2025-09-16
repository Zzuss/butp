"use client"

import React from 'react'
import { X, Bell, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
}

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
  zIndex?: number;
}

export function NotificationModal({ notification, onClose, zIndex = 1000 }: NotificationModalProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          text: 'text-green-800',
          button: 'hover:bg-green-100'
        }
      case 'warning':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          button: 'hover:bg-yellow-100'
        }
      case 'error':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-800',
          button: 'hover:bg-red-100'
        }
      default:
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          button: 'hover:bg-blue-100'
        }
    }
  }

  const colors = getColorClasses()

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className={`w-full max-w-md mx-auto ${colors.border} ${colors.bg} shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            {getIcon()}
            <CardTitle className={`text-lg ${colors.text}`}>
              {notification.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={`${colors.button} ${colors.text} h-8 w-8 rounded-full`}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`text-sm ${colors.text} leading-relaxed whitespace-pre-wrap`}>
            {notification.content}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={onClose}
              className={`${colors.button} ${colors.text} border ${colors.border}`}
              variant="outline"
            >
              知道了
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 多通知管理组件
interface NotificationStackProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
}

export function NotificationStack({ notifications, onMarkAsRead }: NotificationStackProps) {
  if (notifications.length === 0) return null

  // 按优先级和创建时间排序，最新的优先级最高的在最前面
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority // 优先级高的在前
    }
    return 0 // 如果优先级相同，保持原有顺序（API返回的已经是按时间排序的）
  })

  const currentNotification = sortedNotifications[0]

  return (
    <NotificationModal
      notification={currentNotification}
      onClose={() => onMarkAsRead(currentNotification.id)}
      zIndex={1000 + notifications.length}
    />
  )
}
