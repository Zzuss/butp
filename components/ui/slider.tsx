"use client"

import { useState, useRef, useEffect } from 'react'

interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  className?: string
}

export function Slider({ value, min, max, step, onChange, className = "" }: SliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentValue(value)
  }, [value])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    updateValueFromEvent(e)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValueFromEvent(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    onChange(currentValue)
  }

  const updateValueFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const percentage = Math.max(0, Math.min(1, x / width))
    const newValue = Math.round((min + (max - min) * percentage) / step) * step
    const clampedValue = Math.max(min, Math.min(max, newValue))
    
    setCurrentValue(clampedValue)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const percentage = ((currentValue - min) / (max - min)) * 100

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* 当前数值显示 */}
      <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
        {currentValue}
      </div>
      
      {/* 滑动条 */}
      <div
        ref={sliderRef}
        className="relative w-full h-6 bg-gray-200 rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* 滑动条轨道 */}
        <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
        
        {/* 滑动条填充 */}
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        ></div>
        
        {/* 滑动条手柄 */}
        <div 
          className="absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${percentage}% - 8px)` }}
        ></div>
      </div>
      
      {/* 刻度标签 */}
      <div className="flex justify-between w-full text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
