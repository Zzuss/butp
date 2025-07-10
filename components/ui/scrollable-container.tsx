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
    if (isMobile) {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : childrenArray.length - 1));
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (isMobile) {
      setCurrentIndex(prev => (prev < childrenArray.length - 1 ? prev + 1 : 0));
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };
  
  return (
    <div className="relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md" onClick={scrollLeft}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      
      {isMobile ? (
        <div className="flex justify-center items-center py-4 px-8">
          <div className="w-full max-w-[350px]">
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
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md" onClick={scrollRight}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {isMobile && (
        <div className="flex justify-center mt-2 gap-1">
          {childrenArray.map((_, index) => (
            <div 
              key={index} 
              className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-primary' : 'bg-gray-300'}`}
              onClick={() => setCurrentIndex(index)}
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