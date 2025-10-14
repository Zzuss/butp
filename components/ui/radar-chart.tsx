"use client"

import { useEffect, useRef, useState } from 'react'

interface RadarChartProps {
  data: number[]
  labels: string[]
  className?: string
  onCornerClick?: (cornerIndex: number, label: string, value: number) => void
  showBuiltInModal?: boolean
  modalTitle?: string
  modalContent?: string[]
  modalContents?: Array<{
    title: string
    content: string[]
  }>
}

export function RadarChart({ 
  data, 
  labels, 
  className = "", 
  onCornerClick,
  showBuiltInModal = false,
  modalTitle = "为数理逻辑与科学基础，建议注重以下课程",
  modalContent = ["工程数学", "高等数学A", "线性代数", "高等数学A", "近代物理"],
  modalContents = []
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedModalContent, setSelectedModalContent] = useState<{
    title: string
    content: string[]
  } | null>(null)

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
    
    // 计算距离中心的距离
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // 设置点击容错半径（以像素为单位）
    const clickToleranceRadius = 40; // 40像素的点击容错范围
    
    // 遍历所有顶点，检查点击位置是否在某个顶点附近
    for (let i = 0; i < data.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2;
      
      // 计算该顶点的位置（基于实际数据值）
      const normalizedValue = Math.min((data[i] / 100) * 4, 1);
      const radius = (canvas.width / 2 - 80) * normalizedValue;
      const vertexX = centerX + radius * Math.cos(angle);
      const vertexY = centerY + radius * Math.sin(angle);
      
      // 计算点击位置到该顶点的距离
      const distanceToVertex = Math.sqrt(
        Math.pow(x - vertexX, 2) + Math.pow(y - vertexY, 2)
      );
      
      // 如果点击位置在该顶点的容错范围内，则触发点击事件
      if (distanceToVertex <= clickToleranceRadius) {
        // 如果启用了内置模态框，显示模态框
        if (showBuiltInModal) {
          // 设置选中的模态框内容
          if (modalContents.length > 0 && modalContents[i]) {
            setSelectedModalContent(modalContents[i]);
          } else {
            // 回退到默认内容
            setSelectedModalContent({
              title: modalTitle,
              content: modalContent
            });
          }
          setShowModal(true);
        }
        
        // 如果提供了外部点击处理函数，也调用它
        if (onCornerClick) {
          onCornerClick(i, labels[i], data[i]);
        }
        
        // 找到匹配的顶点后立即返回，避免重复触发
        return;
      }
    }
    
    // 如果没有点击到任何顶点，检查是否点击在标签区域
    // 计算标签位置并检查点击是否在标签附近
    for (let i = 0; i < labels.length; i++) {
      const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2;
      const labelRadius = (canvas.width / 2 - 80) + 50; // 标签半径
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      
      // 计算点击位置到标签的距离
      const distanceToLabel = Math.sqrt(
        Math.pow(x - labelX, 2) + Math.pow(y - labelY, 2)
      );
      
      // 如果点击位置在标签的容错范围内，也触发点击事件
      if (distanceToLabel <= clickToleranceRadius) {
        // 如果启用了内置模态框，显示模态框
        if (showBuiltInModal) {
          // 设置选中的模态框内容
          if (modalContents.length > 0 && modalContents[i]) {
            setSelectedModalContent(modalContents[i]);
          } else {
            // 回退到默认内容
            setSelectedModalContent({
              title: modalTitle,
              content: modalContent
            });
          }
          setShowModal(true);
        }
        
        // 如果提供了外部点击处理函数，也调用它
        if (onCornerClick) {
          onCornerClick(i, labels[i], data[i]);
        }
        
        return;
      }
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
        
        {/* 内置模态框 */}
        {showModal && selectedModalContent && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{selectedModalContent.title}</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                >
                  ✕
                </button>
              </div>
              <ul className="list-decimal list-inside space-y-2">
                {selectedModalContent.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 