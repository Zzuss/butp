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
    // 将0-100的分数映射到0-radius的范围
    const normalizedValue = Math.max(0, Math.min(100, value)) / 100
    const r = normalizedValue * radius
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
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0] // 对应20, 40, 60, 80, 100分
  const gridPaths = gridLevels.map(level => {
    const points = dataEntries.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2
      const r = level * radius
      return `${center.x + r * Math.cos(angle)},${center.y + r * Math.sin(angle)}`
    })
    return `M ${points.join(' L ')} Z`
  })

  // 生成数据路径
  const dataPoints = dataEntries.map(([, value], index) => getPointCoordinates(value, index))
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
          const endPoint = getPointCoordinates(100, index) // 轴线延伸到100分位置
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