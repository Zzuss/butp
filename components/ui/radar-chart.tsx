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
  const radius = Math.min(width, height) / 2 - 20
  const dataEntries = Object.entries(data)
  const angleStep = (2 * Math.PI) / dataEntries.length

  // 计算每个点的坐标
  const getPointCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2 // 从顶部开始
    const r = (value * radius) // 假设数据在0-1范围内
    return {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle)
    }
  }

  // 计算标签位置
  const getLabelCoordinates = (index: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = radius + 15
    return {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle)
    }
  }

  // 生成网格线
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
  const gridPaths = gridLevels.map(level => {
    const points = dataEntries.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2
      const r = level * radius
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
            stroke="#e2e8f0"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}
        
        {/* 轴线 */}
        {dataEntries.map((_, index) => {
          const endPoint = getPointCoordinates(1, index)
          return (
            <line
              key={index}
              x1={center.x}
              y1={center.y}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#e2e8f0"
              strokeWidth="1"
              opacity={0.5}
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
          const shortLabel = label.length > 6 ? label.substring(0, 4) + '...' : label
          return (
            <text
              key={index}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#64748b"
              className="select-none"
            >
              {shortLabel}
            </text>
          )
        })}
      </svg>
    </div>
  )
} 