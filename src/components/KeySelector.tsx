'use client';
import React, { useRef, useEffect, useMemo } from 'react';

const ALL_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

interface KeySelectorProps {
  originalKey: string;
  currentKey: string;
  onPreview: (key: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const KeySelector = ({ originalKey, currentKey, onPreview, onSave, onClose }: KeySelectorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const reorderedKeys = useMemo(() => {
    const origIndex = ALL_KEYS.indexOf(originalKey);
    if (origIndex === -1) return ALL_KEYS;
    const rotateAmount = 5;
    let startNewIndex = origIndex - rotateAmount;
    if (startNewIndex < 0) startNewIndex += ALL_KEYS.length;
    const part1 = ALL_KEYS.slice(startNewIndex);
    const part2 = ALL_KEYS.slice(0, startNewIndex);
    return [...part1, ...part2];
  }, [originalKey]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        const selectedBtn = scrollRef.current?.querySelector('[data-selected="true"]');
        if (selectedBtn) {
          selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  }, []);

  return (
    // ปรับ bg-black/40 เพื่อให้พื้นหลังโปร่งแสงขึ้น มองเห็นเนื้อเพลงข้างหลัง
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-[2px] p-4" onClick={onClose}>
      
      <div 
        className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-fit max-w-[95vw] shadow-2xl flex flex-col gap-5 transition-all"
        onClick={(e) => e.stopPropagation()} // กันไม่ให้ปิดเมื่อคลิกที่ตัวกล่อง
      >
        
        <div className="flex justify-between items-start gap-8">
            <div>
                <h3 className="text-white font-bold text-xl">ตั้งค่าคีย์เพลง</h3>
                <p className="text-slate-400 text-xs mt-1">
                    Original Key: <span className="text-green-400 font-bold">{originalKey}</span>
                </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none px-2 -mt-1">
                &times;
            </button>
        </div>
        
        <div className="w-full overflow-x-auto custom-scrollbar" ref={scrollRef}>
            <div className="flex w-max gap-2 md:gap-3 p-2 mx-auto">
                {reorderedKeys.map((k) => {
                    const isOriginal = k === originalKey;
                    const isSelected = currentKey === k;

                    let btnClass = "bg-slate-800 text-slate-400 border border-slate-700"; 
                    if (isOriginal) btnClass = "bg-green-700 text-white border-green-500 shadow-lg shadow-green-900/20"; 
                    
                    if (isSelected) {
                        btnClass = isOriginal 
                            ? "bg-green-600 text-white border-pink-500 ring-2 ring-pink-500 shadow-lg shadow-pink-900/40 z-10"
                            : "bg-pink-600 text-white border-pink-500 ring-2 ring-pink-500 shadow-lg shadow-pink-900/40 z-10";
                    }

                    return (
                        <button
                          key={k}
                          data-selected={isSelected}
                          data-original={isOriginal}
                          onClick={() => onPreview(k)} // คลิกแล้วจะเรียก handleKeyPreview ในหน้าหลัก
                          className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl text-lg font-bold transition-all flex items-center justify-center relative ${isSelected ? '' : 'hover:bg-slate-700'} ${btnClass}`}
                        >
                          {k}
                          {isOriginal && !isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                          )}
                        </button>
                    );
                })}
            </div>
        </div>
        
        <div className="pt-2 flex justify-between items-center border-t border-slate-800 mt-2">
             <button 
                onClick={() => onPreview(originalKey)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
             >
                <span className="text-lg">↺</span> Reset
             </button>

             <button 
                onClick={onSave} // เรียกใช้ handleKeySave เพื่อบันทึกลง DB
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-pink-900/30 transition-all active:scale-95"
             >
                Set Default (Save)
             </button>
        </div>
      </div>
    </div>
  );
};