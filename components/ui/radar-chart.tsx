"use client"

import React from 'react'

interface RadarChartProps {
  data: {
    [key: string]: number
  }
  width?: number
  height?: number
}

export function RadarChart({ data, width = 200, height = 200 }: RadarChartProps) {
  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) / 2 - 60 // 为标签预留更多空间
  const dataEntries = Object.entries(data)
  const angleStep = (2 * Math.PI) / dataEntries.length

  // 计算每个点的坐标
  const getPointCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2 // 从顶部开始
    const r = (value * radius * 2) // 将数据放大2倍显示
    return {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle)
    }
  }

  // 计算标签位置
  const getLabelCoordinates = (index: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = radius + 30 // 增加标签与图表的距离
    return {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle)
    }
  }

  // 生成网格线
  const gridLevels = [0.1, 0.2, 0.3, 0.4, 0.5]
  const gridPaths = gridLevels.map(level => {
    const points = dataEntries.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2
      const r = level * radius * 2 // 与数据放大保持一致
      return `${center.x + r * Math.cos(angle)},${center.y + r * Math.sin(angle)}`
    })
    return `M ${points.join(' L ')} Z`
  })

  // 生成数据路径
  const dataPoints = dataEntries.map(([_, value], index) => getPointCoordinates(value, index))
  const dataPath = `M ${dataPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z`

  return (
    <div className="flex justify-center">
      <svg width={width} height={height} className="overflow-visible">
        {/* 网格 */}
        {gridPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            opacity={0.8}
          />
        ))}
        
        {/* 轴线 */}
        {dataEntries.map((_, index) => {
          const endPoint = getPointCoordinates(0.5, index) // 调整轴线长度到0.5对应的位置
          return (
            <line
              key={index}
              x1={center.x}
              y1={center.y}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#94a3b8"
              strokeWidth="1"
              opacity={0.8}
            />
          )
        })}
        
        {/* 数据区域 */}
        <path
          d={dataPath}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* 数据点 */}
        {dataPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#3b82f6"
          />
        ))}
        
        {/* 标签 */}
        {dataEntries.map(([label], index) => {
          const labelPos = getLabelCoordinates(index)
          return (
            <text
              key={index}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#64748b"
              className="select-none"
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
} 