'use client';
import React, { useState, useEffect, useRef } from 'react';

interface AutoScrollControllerProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const AutoScrollController = ({ scrollContainerRef }: AutoScrollControllerProps) => {
  // --- State เดิม ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [isVisible, setIsVisible] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  // 🔥 1. เพิ่ม Ref สำหรับตรวจสอบการแทรกแซงของผู้ใช้ (Logic ใหม่)
  const isInterruptedRef = useRef(false);
  const interruptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Functions ปรับความเร็ว ---
  const handleDecrease = () => {
    setSpeed((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))));
  };

  const handleIncrease = () => {
    setSpeed((prev) => Math.min(3.0, parseFloat((prev + 0.1).toFixed(1))));
  };

  // 🔥 2. Effect สำหรับดักจับการสัมผัสจอ/เมาส์ เพื่อหยุดชั่วคราว
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleUserInteraction = () => {
      // ถ้ากำลังเล่นอยู่ ให้หยุด Auto Scroll ชั่วคราว
      if (isPlaying) {
        isInterruptedRef.current = true;

        // ล้าง Timer เก่า (ถ้ามีการขยับซ้ำๆ)
        if (interruptTimeoutRef.current) {
          clearTimeout(interruptTimeoutRef.current);
        }

        // ตั้งเวลาใหม่: รอ 2 วินาที (2000ms) หลังหยุดขยับ แล้วค่อยปล่อยให้ Auto Scroll ต่อ
        interruptTimeoutRef.current = setTimeout(() => {
          isInterruptedRef.current = false;
        }, 500);
      }
    };

    // ติดตั้ง Event Listener (passive: true เพื่อประสิทธิภาพการ Scroll ที่ดี)
    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('touchmove', handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('touchmove', handleUserInteraction);
      if (interruptTimeoutRef.current) clearTimeout(interruptTimeoutRef.current);
    };
  }, [scrollContainerRef, isPlaying]);

  // --- Effect หลักสำหรับการ Scroll (Loop Animation) ---
  useEffect(() => {
    const scroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;

        // 🔥 3. เช็คเพิ่ม: ถ้า isPlaying เป็นจริง และ "ต้องไม่ถูกขัดจังหวะ"
        if (isPlaying && !isInterruptedRef.current) {
            
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


  // --- ส่วน UI (คงเดิมตามที่คุณต้องการ) ---

  // 1. มุมมองตอนซ่อน (Mini Button)
  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className={`
            fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg border-2 flex items-center justify-center transition-all duration-300
            ${isPlaying 
                ? 'bg-slate-900 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-pink-400 hover:border-pink-500 hover:scale-110'
            }
        `}
        title="เปิดแผงควบคุม Auto Scroll"
      >
        {isPlaying ? (
            <div className="flex gap-1 items-end h-4">
                <div className="w-1 h-2 bg-current rounded-full animate-[bounce_1s_infinite]"></div>
                <div className="w-1 h-4 bg-current rounded-full animate-[bounce_1.2s_infinite]"></div>
                <div className="w-1 h-2 bg-current rounded-full animate-[bounce_0.8s_infinite]"></div>
            </div>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="ml-1">
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
        )}
      </button>
    );
  }

  // 2. มุมมองตอนใช้งาน (Full Bar)
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur border border-slate-700 py-3 px-2 rounded-full shadow-2xl flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 select-none w-14">
      
      {/* Play/Pause (Main Control) */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
            isPlaying 
            ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)] scale-110' 
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        title={isPlaying ? "หยุด" : "เล่น"}
      >
        {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="ml-0.5"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
        )}
      </button>

      {/* Divider */}
      <div className="w-8 h-[1px] bg-slate-700"></div>

      {/* Speed Controls (Vertical Stack) */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Increase Speed (+ อยู่บน) */}
        <button 
            onClick={handleIncrease}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-lg font-bold transition-colors active:scale-95"
            title="เพิ่มความเร็ว"
        >
            +
        </button>

        {/* Speed Display */}
        <div className="flex flex-col items-center justify-center py-1">
            <span className="text-[10px] font-mono text-pink-400 font-bold">
                {speed.toFixed(1)}x
            </span>
            {/* ซ่อน Slider แบบก้านยาวไว้เพราะในแนวตั้งจะกินที่ หรือใส่เป็นขีดเล็กๆแทนได้ */}
            <div className="w-1 h-1 bg-pink-500 rounded-full mt-1"></div>
        </div>

        {/* Decrease Speed (- อยู่ล่าง) */}
        <button 
            onClick={handleDecrease}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-lg font-bold transition-colors active:scale-95"
            title="ลดความเร็ว"
        >
            −
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-[1px] bg-slate-700"></div>

      {/* Hide Button */}
      <button 
        onClick={() => setIsVisible(false)}
        className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-slate-800 rounded-full"
        title="ซ่อนเมนู"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

    </div>
  );
};