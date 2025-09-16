"use client"

import { useEffect, useRef } from 'react'

interface RadarChartProps {
  data: number[]
  labels: string[]
  className?: string
  onCornerClick?: (cornerIndex: number, label: string, value: number) => void
}

export function RadarChart({ data, labels, className = "", onCornerClick }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布大小 - 大幅增加为标签留出充足空间
    const size = 450 // 改回450
    canvas.width = size
    canvas.height = size
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 80 // 改回80

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
      // 调整数值映射比例：数值10到第二个多边形，15到第三个，20到第四个
      // 第二个多边形是半径的2/5，所以调整系数为 (2/5) / (10/100) = 4
      const normalizedValue = Math.min((data[i] / 100) * 4, 1)
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
      // 使用相同的数值映射比例
      const normalizedValue = Math.min((data[i] / 100) * 4, 1)
      const r = radius * normalizedValue
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI) // 改回4
      ctx.fill()
    }

    // 绘制标签
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 12px Arial' // 改回12px
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < labels.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      // 增加标签偏移距离，确保文字不被截断
      const labelRadius = radius + 50 // 改回50
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
    ctx.font = 'bold 13px Arial' // 改回13px
    ctx.textAlign = 'center'
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2
      // 使用相同的数值映射比例
      const normalizedValue = Math.min((data[i] / 100) * 4, 1)
      const r = radius * normalizedValue
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      
      // 在数据点旁边显示数值（保留一位小数）
      const offsetX = 20 * Math.cos(angle) // 改回20
      const offsetY = 20 * Math.sin(angle)
      ctx.fillText(data[i].toFixed(1), x + offsetX, y + offsetY)
    }
  }, [data, labels])

  // 处理Canvas点击事件
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCornerClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 获取点击坐标（相对于Canvas）
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    // 转换为相对于雷达图中心的坐标
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const relativeX = x - centerX;
    const relativeY = y - centerY;
    
    // 计算角度（注意：Canvas的Y轴向下，需要翻转）
    const angle = Math.atan2(-relativeY, relativeX);
    const normalizedAngle = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    
    // 计算距离中心的距离
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // 判断点击是否在有效区域内（距离中心一定范围内）
    const maxRadius = (canvas.width / 2 - 80) + 50; // 标签区域
    if (distance > maxRadius) return;
    
    // 计算属于哪个角
    const anglePerCorner = (2 * Math.PI) / data.length;
    const cornerIndex = Math.floor(normalizedAngle / anglePerCorner);
    
    // 检查是否在点击区域内（可以设置一个容错范围）
    const cornerAngle = cornerIndex * anglePerCorner;
    const angleDiff = Math.abs(normalizedAngle - cornerAngle);
    const tolerance = anglePerCorner / 3; // 每个角1/3的容错范围
    
    if (angleDiff <= tolerance || angleDiff >= (2 * Math.PI - tolerance)) {
      onCornerClick(cornerIndex, labels[cornerIndex], data[cornerIndex]);
    }
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="relative overflow-visible">
        <canvas 
          ref={canvasRef} 
          className="max-w-full h-auto cursor-pointer" 
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  )
} 