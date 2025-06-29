"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface ScrollableContainerProps {
  children: React.ReactNode;
}

export function ScrollableContainer({ children }: ScrollableContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
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
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 py-4 px-8 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md" onClick={scrollRight}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
} 