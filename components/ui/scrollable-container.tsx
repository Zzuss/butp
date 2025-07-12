"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import React from "react";

interface ScrollableContainerProps {
  children: React.ReactNode;
}

export function ScrollableContainer({ children }: ScrollableContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const childrenArray = React.Children.toArray(children);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const scrollLeft = () => {
    if (isTransitioning) return;
    
    if (isMobile) {
      setIsTransitioning(true);
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : childrenArray.length - 1));
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -358, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (isTransitioning) return;
    
    if (isMobile) {
      setIsTransitioning(true);
      setCurrentIndex(prev => (prev < childrenArray.length - 1 ? prev + 1 : 0));
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 358, behavior: 'smooth' });
    }
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (distance > minSwipeDistance) {
      // 向左滑动，显示下一个
      scrollRight();
    } else if (distance < -minSwipeDistance) {
      // 向右滑动，显示上一个
      scrollLeft();
    }
  };
  
  return (
    <div className="relative">
      <div className={`absolute left-0 z-10 ${isMobile ? '-bottom-2' : 'top-1/2 -translate-y-1/2'}`}>
        <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md" onClick={scrollLeft}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      
      {isMobile ? (
        <div 
          className="flex justify-center items-center py-4 -ml-3 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-[90%] max-w-[315px] transition-transform duration-300 ease-in-out">
            {childrenArray[currentIndex]}
          </div>
        </div>
      ) : (
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 py-4 px-8 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      )}
      
      <div className={`absolute right-0 z-10 ${isMobile ? '-bottom-2' : 'top-1/2 -translate-y-1/2'}`}>
        <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md" onClick={scrollRight}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {isMobile && (
        <div className="flex justify-center mt-4 gap-2">
          {childrenArray.map((_, index) => (
            <button
              key={index} 
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex ? 'bg-primary scale-110' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`查看第${index + 1}个项目`}
            />
          ))}
        </div>
      )}
      
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
} 