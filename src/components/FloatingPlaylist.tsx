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

    // 🔥 3. ตั้งค่าเริ่มต้น: มุมขวาบน (Right: 0, Top: 80) เสมอเมื่อ Refresh
    // ไม่มีการดึง localStorage มาทับแล้ว
    const [position, setPosition] = useState({ right: 0, top: 80 });

    const isDragging = useRef(false);
    const isTouchDragging = useRef(false); // แยก flag สำหรับ touch
    const hasMoved = useRef(false);
    const dragOffset = useRef({ right: 0, top: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            // ถ้า Playlist เปิดอยู่ และจุดที่คลิกไม่ได้อยู่ใน containerRef
            if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // และต้องเช็คว่าไม่ได้กำลังลากอยู่ (isDragging) ด้วยนะ เพื่อความชัวร์
                if (!isDragging.current && !isTouchDragging.current) {
                    setIsOpen(false); // สั่งปิด Playlist
                }
            }
        };

        // ติดตั้ง Listener
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        // ล้าง Listener เมื่อ Component ถูกทำลาย
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // --- MOUSE EVENTS (Desktop) ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        hasMoved.current = false;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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
        updatePosition(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // --- TOUCH EVENTS (Mobile) ---
    const handleTouchStart = (e: React.TouchEvent) => {
        isTouchDragging.current = true;
        hasMoved.current = false;

        const touch = e.touches[0];
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        dragOffset.current = {
            right: rect.right - touch.clientX,
            top: touch.clientY - rect.top
        };

        // ใช้ passive: false เพื่อให้เราสั่ง preventDefault() ได้
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isTouchDragging.current) return;

        // 🔥 1. ป้องกันการเลื่อนหน้าจอ (Scroll) ขึ้นลงขณะลาก
        if (e.cancelable) e.preventDefault();

        hasMoved.current = true;
        const touch = e.touches[0];
        updatePosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
        isTouchDragging.current = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    // --- LOGIC คำนวณตำแหน่ง (รวมกันทั้ง Mouse/Touch) ---
    const updatePosition = (clientX: number, clientY: number) => {
        let newTop = clientY - dragOffset.current.top;
        let newRight = window.innerWidth - clientX - dragOffset.current.right;

        const currentWidth = isMinimized || !isOpen ? MINIMIZED_WIDTH : EXPANDED_WIDTH;
        const currentHeight = containerRef.current?.offsetHeight || 48;

        // 🔥 2. ปลดล็อคขอบซ้าย: ยอมให้ค่า Right มากที่สุดเท่ากับ (ความกว้างจอ - ความกว้างปุ่ม)
        // ซึ่งจะเท่ากับตำแหน่ง Left = 0 พอดี
        const maxRight = window.innerWidth - currentWidth;

        // Boundary Check
        newRight = Math.min(Math.max(0, newRight), maxRight); // 0 คือชิดขวา, maxRight คือชิดซ้าย

        const maxTop = window.innerHeight - currentHeight;
        newTop = Math.min(Math.max(0, newTop), maxTop);

        setPosition({ right: newRight, top: newTop });
    };

    // ยังคง Save ล่าสุดลง LocalStorage ได้ (เผื่อ user อยากได้) 
    // แต่ตอนโหลด (useEffect แรก) เราลบทิ้งไปแล้ว เพื่อให้มัน Reset ทุกครั้ง
    useEffect(() => {
        localStorage.setItem('playlist_position_v2', JSON.stringify(position));
    }, [position]);

    const filteredSongs = useMemo(() => {
        return songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [songs, searchTerm]);

    // --- RENDER ---

    if (!isOpen) {
        return (
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart} // รองรับ Touch
                onClick={() => {
                    if (!hasMoved.current) {
                        setIsOpen(true);
                        setIsMinimized(false);
                    }
                }}
                style={{ right: position.right, top: position.top }}
                // 🔥 เพิ่ม touch-none: ห้าม Browser ยุ่งกับการ Scroll ในพื้นที่นี้
                className="fixed touch-none w-12 h-12 bg-slate-800 hover:bg-slate-700 text-pink-400 border border-slate-600 rounded-lg shadow-2xl flex items-center justify-center z-50 cursor-move select-none transition-transform hover:scale-105"
                title="Playlist"
            >
                <span className="text-xl pointer-events-none">🎵</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{ right: position.right, top: position.top }}
            className={`
            fixed touch-none bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col font-sans
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
                onTouchStart={handleTouchStart}
                onClick={(e) => {
                    if (!hasMoved.current) setIsMinimized(!isMinimized);
                }}
            >
                {isMinimized ? (
                    <span className="text-xl text-pink-400 pointer-events-none">🎵</span>
                ) : (
                    <>
                        <div className="font-bold text-white flex items-center gap-2 text-sm pointer-events-none">
                            <span className="text-pink-400">🎵</span>
                            <span>Playlist ({songs.length})</span>
                        </div>

                        <div className="flex gap-1" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
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


                    <div
                        className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
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