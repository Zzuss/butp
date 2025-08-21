"use client"

import React from 'react'
import { CompletePDFExport } from '@/components/pdf/CompletePDFExport'

export default function GlobalPdfButton({ className }: { className?: string }) {
  // 使用侧栏折叠样式触发图标按钮渲染，避免在右下角占用过多空间
  const combinedClass = `${className ? className + ' ' : ''}sidebar-collapsed fixed`

  return (
    <div className={combinedClass}>
      <CompletePDFExport
        pageTitle="当前页面"
        fileName={`page_export_${new Date().toISOString().split('T')[0]}.pdf`}
        className={combinedClass}
      />
    </div>
  )
}


