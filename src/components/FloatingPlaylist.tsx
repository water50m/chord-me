'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SavedSong } from '@/types';

interface FloatingPlaylistProps {
  songs: SavedSong[];
  currentId: number | null;
  onSelect: (song: SavedSong) => void;
}

export const FloatingPlaylist = ({ songs, currentId, onSelect }: FloatingPlaylistProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- CONFIG ---
  const EXPANDED_WIDTH = 288; // w-72
  const MINIMIZED_WIDTH = 48; // w-12
  
  // 🔥 เปลี่ยนมาเก็บค่า 'right' แทน 'left' เพื่อให้ยึดมุมขวาบนเป็นหลัก
  // เริ่มต้น: ห่างจากขอบขวา 0px, ห่างจากข้างบน 80px
  const [position, setPosition] = useState({ right: 0, top: 80 }); 

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  // เก็บระยะห่างระหว่างเมาส์กับ "ขอบขวา" ของกล่อง และ "ขอบบน"
  const dragOffset = useRef({ right: 0, top: 0 }); 
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. โหลดตำแหน่ง (ใช้ right/top)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPos = localStorage.getItem('playlist_position_v2'); // เปลี่ยน key หน่อยกันค่าเก่าตีกัน
      if (savedPos) {
        setPosition(JSON.parse(savedPos));
      } else {
        // ค่าเริ่มต้น: ชิดขวาเลย (right: 0)
        setPosition({ right: 0, top: 80 });
      }
    }
  }, []);

  // 2. ไม่ต้องมี Logic คำนวณ Toggle Minimize แล้ว! 
  // เพราะ CSS 'right: constant' จะทำให้มันยืดหดจากซ้ายเองอัตโนมัติ

  // 3. Logic ลาก (Drag) แบบคำนวณ 'right'
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasMoved.current = false;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // คำนวณ offset จากขอบขวาของจอ
    // ระยะห่างเมาส์ กับ ขอบขวากล่อง = rect.right - e.clientX
    dragOffset.current = {
      right: rect.right - e.clientX,
      top: e.clientY - rect.top
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    hasMoved.current = true;

    // คำนวณ top ใหม่
    let newTop = e.clientY - dragOffset.current.top;
    
    // คำนวณ right ใหม่ (สูตร: จอกว้าง - เมาส์X - offset)
    let newRight = window.innerWidth - e.clientX - dragOffset.current.right;

    // --- Boundary Check (ยอมให้ชนขอบได้เลย คือ 0) ---
    const currentWidth = isMinimized ? MINIMIZED_WIDTH : EXPANDED_WIDTH;
    const currentHeight = containerRef.current?.offsetHeight || 48;

    // ล็อคไม่ให้หลุดขอบซ้าย (Right มากสุด = จอ - width)
    const maxRight = window.innerWidth - currentWidth;
    // ล็อคไม่ให้หลุดขอบขวา (Right น้อยสุด = 0)
    newRight = Math.min(Math.max(0, newRight), maxRight);

    // ล็อคไม่ให้หลุดขอบบน/ล่าง
    const maxTop = window.innerHeight - currentHeight;
    newTop = Math.min(Math.max(0, newTop), maxTop);

    setPosition({ right: newRight, top: newTop });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (position.right !== 0 || position.top !== 80) {
        localStorage.setItem('playlist_position_v2', JSON.stringify(position));
    }
  }, [position]);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [songs, searchTerm]);

  // --- RENDER ---

  if (!isOpen) {
    return (
      <div 
        onMouseDown={handleMouseDown}
        onClick={() => {
            if (!hasMoved.current) {
                setIsOpen(true);
                setIsMinimized(false);
            }
        }}
        // ใช้ right แทน left
        style={{ right: position.right, top: position.top }}
        className="fixed w-12 h-12 bg-slate-800 hover:bg-slate-700 text-pink-400 border border-slate-600 rounded-lg shadow-2xl flex items-center justify-center z-50 cursor-move select-none transition-transform hover:scale-105"
        title="Playlist"
      >
        <span className="text-xl pointer-events-none">🎵</span>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        // ใช้ right แทน left -> นี่คือหัวใจสำคัญของการย่อไปขวาบน
        style={{ right: position.right, top: position.top }}
        className={`
            fixed bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col font-sans
            ${isMinimized ? 'w-12 h-12 rounded-lg' : 'w-72 h-[60vh] max-h-[500px] rounded-xl'}
        `}
    >
        {/* HEADER */}
        <div 
            className={`
                bg-slate-800 flex items-center h-12 select-none cursor-move shrink-0
                ${isMinimized ? 'justify-center px-0' : 'justify-between px-3 border-b border-slate-700'}
            `}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                 if (!hasMoved.current) setIsMinimized(!isMinimized);
            }}
        >
            {isMinimized ? (
                // ไอคอนตอนย่อ
                <span className="text-xl text-pink-400 pointer-events-none">🎵</span>
            ) : (
                <>
                    <div className="font-bold text-white flex items-center gap-2 text-sm pointer-events-none">
                        <span className="text-pink-400">🎵</span>
                        <span>Playlist ({songs.length})</span>
                    </div>
                    
                    <div className="flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-slate-400 hover:text-white">
                            ▼
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1 text-slate-400 hover:text-red-400">
                            ✕
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* CONTENT */}
        {!isMinimized && (
            <div className="flex-1 flex flex-col bg-slate-900/95 overflow-hidden">
                <div className="p-2 border-b border-slate-800 shrink-0">
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-pink-500 outline-none placeholder:text-slate-600"
                        placeholder="ค้นหาเพลง..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()} 
                        autoFocus
                    />
                </div>

                <div 
                    className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1"
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    {filteredSongs.length === 0 && (
                         <div className="text-center text-slate-500 text-xs py-10">ไม่พบเพลง</div>
                    )}
                    {filteredSongs.map((song) => (
                        <div 
                            key={song.id} 
                            onClick={() => onSelect(song)}
                            className={`
                                px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors
                                ${currentId === song.id 
                                    ? 'bg-pink-900/30 border border-pink-500/50 text-pink-300' 
                                    : 'hover:bg-slate-800 border border-transparent text-slate-300'}
                            `}
                        >
                            <div className="truncate text-xs font-medium w-full">
                                {song.title}
                            </div>
                            {currentId === song.id && (
                                <span className="ml-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse flex-shrink-0"></span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};