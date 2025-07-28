"use client"

import { useEffect, useRef } from 'react'

interface RadarChartProps {
  data: number[]
  labels: string[]
  className?: string
}

export function RadarChart({ data, labels, className = "" }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布大小 - 大幅增加为标签留出充足空间
    const size = 450 // 大幅增加画布大小
    canvas.width = size
    canvas.height = size
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 80 // 大幅增加边距，为标签留出充足空间

    // 清除画布
    ctx.clearRect(0, 0, size, size)

    // 绘制网格
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      const r = (radius * i) / 5
      ctx.beginPath()
      for (let j = 0; j < data.length; j++) {
        const angle = (j * 2 * Math.PI) / data.length - Math.PI / 2
        const x = centerX + r * Math.cos(angle)
        const y = centerY + r * Math.sin(angle)
        if (j === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.stroke()
    }

    // 绘制轴线
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()
  }

    // 绘制数据
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      const normalizedValue = Math.min(data[i] / 100, 1)
      const r = radius * normalizedValue
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 绘制数据点
    ctx.fillStyle = '#3b82f6'
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      const normalizedValue = Math.min(data[i] / 100, 1)
      const r = radius * normalizedValue
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI) // 稍微增大数据点
      ctx.fill()
    }

    // 绘制标签
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 12px Arial' // 调整字体大小和粗细
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < labels.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      // 增加标签偏移距离，确保文字不被截断
      const labelRadius = radius + 50
      const x = centerX + labelRadius * Math.cos(angle)
      const y = centerY + labelRadius * Math.sin(angle)
      
      // 根据角度调整文字对齐方式，避免文字重叠
      if (angle >= -Math.PI/6 && angle <= Math.PI/6) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
      } else if (angle > Math.PI/6 && angle <= 5*Math.PI/6) {
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
      } else if (angle > 5*Math.PI/6 || angle < -5*Math.PI/6) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
      } else {
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
      }
      
      ctx.fillText(labels[i], x, y)
    }

    // 绘制数值
    ctx.fillStyle = '#3b82f6'
    ctx.font = 'bold 13px Arial' // 增大字体
    ctx.textAlign = 'center'
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      const normalizedValue = Math.min(data[i] / 100, 1)
      const r = radius * normalizedValue
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      
      // 在数据点旁边显示数值
      const offsetX = 20 * Math.cos(angle) // 增大偏移
      const offsetY = 20 * Math.sin(angle)
      ctx.fillText(data[i].toString(), x + offsetX, y + offsetY)
    }
  }, [data, labels])

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="relative overflow-visible">
        <canvas ref={canvasRef} className="max-w-full h-auto" />
      </div>
    </div>
  )
} 