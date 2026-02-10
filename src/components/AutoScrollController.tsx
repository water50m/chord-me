'use client';
import React, { useState, useEffect, useRef } from 'react';

interface AutoScrollControllerProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const AutoScrollController = ({ scrollContainerRef }: AutoScrollControllerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5); 
  const [isVisible, setIsVisible] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  // --- Functions ปรับความเร็ว ---
  const handleDecrease = () => {
    setSpeed((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))));
  };

  const handleIncrease = () => {
    setSpeed((prev) => Math.min(3.0, parseFloat((prev + 0.1).toFixed(1))));
  };

  useEffect(() => {
    const scroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const isDesktop = window.innerWidth >= 1024;

        const scrollAmount = speed * 0.5; 
        accumulatorRef.current += scrollAmount;

        if (accumulatorRef.current >= 1) {
            const movePixels = Math.floor(accumulatorRef.current);
            
            if (isDesktop) {
                if (container.scrollLeft + container.clientWidth < container.scrollWidth) {
                    container.scrollLeft += movePixels;
                } else {
                    setIsPlaying(false);
                }
            } else {
                if (container.scrollTop + container.clientHeight < container.scrollHeight) {
                    container.scrollTop += movePixels;
                } else {
                    setIsPlaying(false);
                }
            }
            accumulatorRef.current -= movePixels;
        }
      }
      animationRef.current = requestAnimationFrame(scroll);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, speed, scrollContainerRef]);

  // --- 1. มุมมองตอนซ่อน (Mini Button) ---
  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className={`
            fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-all
            ${isPlaying 
                ? 'bg-green-900/80 text-green-400 border-green-500 animate-pulse' // ถ้าเล่นอยู่ ให้ปุ่มกระพริบสีเขียว
                : 'bg-slate-800 text-pink-400 border-slate-700 hover:scale-110 hover:border-pink-500'
            }
        `}
        title="เปิด Auto Scroll"
      >
        {isPlaying ? '▶' : '📜'}
      </button>
    );
  }

  // --- 2. มุมมองตอนใช้งาน (Full Bar) ---
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur border border-slate-700 p-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 pr-4 select-none">
      
      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            isPlaying 
            ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="ml-0.5"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
        )}
      </button>

      <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>

      {/* Speed Controls */}
      <div className="flex items-center gap-2">
        <button 
            onClick={handleDecrease}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-lg font-bold transition-colors active:scale-95"
        >
            −
        </button>

        <div className="flex flex-col items-center w-20">
            <span className="text-[10px] font-mono text-pink-400 font-bold mb-[-2px]">
                {speed.toFixed(1)}x
            </span>
            <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
            />
        </div>

        <button 
            onClick={handleIncrease}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-lg font-bold transition-colors active:scale-95"
        >
            +
        </button>
      </div>

      <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>

      {/* Hide Button (แก้ไขแล้ว: ไม่สั่งหยุดเล่น) */}
      <button 
        onClick={() => {
            // setIsPlaying(false); // <--- เอาบรรทัดนี้ออกแล้วครับ
            setIsVisible(false);
        }}
        className="text-slate-500 hover:text-white transition-colors p-1"
        title="ซ่อน"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

    </div>
  );
};