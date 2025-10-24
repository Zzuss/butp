'use client'

import { useState, useEffect, useCallback } from 'react'

interface PrivacyAgreementStatus {
  needsAgreement: boolean
  currentPolicy: {
    id: number
    version: string
    title: string
    effectiveDate: string
  } | null
  lastAgreement: {
    agreedAt: string
  } | null
}

interface UsePrivacyAgreementReturn {
  needsAgreement: boolean
  loading: boolean
  error: string
  checkAgreementStatus: (userId: string) => Promise<void>
  currentPolicy: PrivacyAgreementStatus['currentPolicy']
  refetch: () => void
}

export function usePrivacyAgreement(userId?: string): UsePrivacyAgreementReturn {
  const [agreementStatus, setAgreementStatus] = useState<PrivacyAgreementStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkAgreementStatus = useCallback(async (userIdParam: string) => {
    if (!userIdParam) {
      setError('用户ID不能为空')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/privacy-agreement?userId=${encodeURIComponent(userIdParam)}`, {
        method: 'GET'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAgreementStatus(data.data)
      } else {
        setError(data.error || '检查隐私条款状态失败')
        setAgreementStatus(null)
      }
    } catch (error) {
      console.error('检查隐私条款状态失败:', error)
      setError('网络错误，请重试')
      setAgreementStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    if (userId) {
      checkAgreementStatus(userId)
    }
  }, [userId, checkAgreementStatus])

  // 自动检查状态
  useEffect(() => {
    if (userId) {
      checkAgreementStatus(userId)
    }
  }, [userId, checkAgreementStatus])

  return {
    needsAgreement: agreementStatus?.needsAgreement || false,
    loading,
    error,
    checkAgreementStatus,
    currentPolicy: agreementStatus?.currentPolicy || null,
    refetch
  }
}

export default usePrivacyAgreement
