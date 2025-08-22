"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextType {
  isSidebarVisible: boolean
  hideSidebar: () => void
  showSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  // 根据路径自动控制sidebar显示
  useEffect(() => {
    // 在隐私条款页面隐藏sidebar
    if (pathname === '/privacy-agreement') {
      setIsSidebarVisible(false)
    } else {
      setIsSidebarVisible(true)
    }
  }, [pathname])

  const hideSidebar = () => setIsSidebarVisible(false)
  const showSidebar = () => setIsSidebarVisible(true)

  return (
    <SidebarContext.Provider value={{ isSidebarVisible, hideSidebar, showSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
