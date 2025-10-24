'use client'

import React, { ReactNode, useState } from 'react'
import usePrivacyAgreement from '@/hooks/usePrivacyAgreement'
import PrivacyAgreementModal from './PrivacyAgreementModal'

interface PrivacyAgreementWrapperProps {
  children: ReactNode
  userId: string
  enabled?: boolean
  onAgreementComplete?: () => void
}

export default function PrivacyAgreementWrapper({
  children,
  userId,
  enabled = true,
  onAgreementComplete
}: PrivacyAgreementWrapperProps) {
  const { needsAgreement, loading, error, refetch } = usePrivacyAgreement(userId)
  const [showModal, setShowModal] = useState(false)

  // 当需要同意时显示模态框
  React.useEffect(() => {
    if (enabled && needsAgreement && !loading && !error) {
      setShowModal(true)
    } else {
      setShowModal(false)
    }
  }, [needsAgreement, loading, error, enabled])

  const handleAgree = () => {
    setShowModal(false)
    refetch() // 重新检查状态
    if (onAgreementComplete) {
      onAgreementComplete()
    }
  }

  const handleModalClose = () => {
    // 用户拒绝同意隐私条款，这里可以重定向到登出页面或显示警告
    setShowModal(false)
    window.location.href = '/logout' // 或其他处理方式
  }

  // 如果正在加载或有错误，显示原始内容
  if (!enabled || loading || error) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <PrivacyAgreementModal
        userId={userId}
        isOpen={showModal}
        onAgree={handleAgree}
        onClose={handleModalClose}
      />
    </>
  )
}
