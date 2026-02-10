'use client';
import React, { useState, useRef } from 'react';
import { SavedSong } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  savedSongs: SavedSong[];
  currentId: number | null;
  inputHtml: string;
  setInputHtml: (html: string) => void;
  onNew: () => void;
  onPreview: () => void;
  onSave: () => void;
  onSelect: (song: SavedSong) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onUpdatePlaylist: (songs: SavedSong[]) => void;
}

export const SongSidebar = ({
  isOpen,
  onClose,
  savedSongs,
  currentId,
  inputHtml,
  setInputHtml,
  onNew,
  onPreview,
  onSave,
  onSelect,
  onDelete,
  onUpdatePlaylist,
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'playlist'>('editor');
  
  // --- Drag & Drop Logic ---
  const dragItem = useRef<number | null>(null); // เก็บ index ตัวที่ถูกลาก
  const [dropTarget, setDropTarget] = useState<{ index: number, position: 'top' | 'bottom' } | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    // ทำให้ตัวที่ถูกลากจางลงเล็กน้อย
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // จำเป็นเพื่อให้ drop ได้
    
    if (dragItem.current === null || dragItem.current === index) return;

    // คำนวณตำแหน่งเมาส์เทียบกับ Element
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const hoverPosition = e.clientY < midY ? 'top' : 'bottom';

    // อัปเดต State เฉพาะเมื่อมีการเปลี่ยนแปลงจริงลดการ re-render
    setDropTarget((prev) => {
        if (prev?.index === index && prev?.position === hoverPosition) return prev;
        return { index, position: hoverPosition };
    });
  };

  const handleDragLeave = () => {
     // Optional: อาจจะใส่ logic ล้างค่าถ้าลากออกนอก list นานๆ
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    
    if (dragItem.current === null || dropTarget === null) {
      setDropTarget(null);
      return;
    }

    const sourceIndex = dragItem.current;
    let targetIndex = dropTarget.index;

    // ถ้าวางด้านล่างของเป้าหมาย ให้ขยับ index ไปอีก 1
    if (dropTarget.position === 'bottom') {
        targetIndex += 1;
    }

    // ถ้า index ไม่เปลี่ยน ไม่ต้องทำอะไร
    if (sourceIndex === targetIndex || sourceIndex === targetIndex - 1) {
        setDropTarget(null);
        dragItem.current = null;
        return;
    }

    // --- สลับตำแหน่ง ---
    const _savedSongs = [...savedSongs];
    const [movedItem] = _savedSongs.splice(sourceIndex, 1);
    
    // ปรับ targetIndex เนื่องจาก array หดลงหลังการลบ
    if (sourceIndex < targetIndex) {
        targetIndex -= 1;
    }
    
    _savedSongs.splice(targetIndex, 0, movedItem);

    onUpdatePlaylist(_savedSongs);
    setDropTarget(null);
    dragItem.current = null;
  };

  return (
    <aside 
      className={`
        fixed lg:relative z-30 h-full bg-slate-900 border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden opacity-0 lg:opacity-100'}
      `}
    >
      <div className="w-80 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 whitespace-nowrap">
            Neon Chords
          </h1>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 flex gap-2 bg-slate-900">
          <button onClick={() => setActiveTab('editor')} className={`flex-1 py-1 text-sm rounded transition-colors ${activeTab === 'editor' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>✏️ แก้ไข</button>
          <button onClick={() => setActiveTab('playlist')} className={`flex-1 py-1 text-sm rounded transition-colors ${activeTab === 'playlist' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>📂 เพลง ({savedSongs.length})</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'editor' ? (
            <div className="flex flex-col gap-3 h-full">
               <textarea
                className="flex-1 w-full bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-700 focus:border-pink-500 font-mono text-xs resize-none"
                placeholder='วาง HTML ที่นี่...'
                value={inputHtml}
                onChange={(e) => setInputHtml(e.target.value)}
              />
              <div className="flex gap-2">
                 <button onClick={onNew} className="px-3 py-2 text-xs border border-dashed border-slate-600 rounded text-slate-400 hover:text-white">New</button>
                 <button onClick={onPreview} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm">Preview</button>
              </div>
              <button onClick={onSave} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-pink-500/20">
                {currentId ? 'Save Edit' : 'Save New'}
              </button>
            </div>
          ) : (
            <div className="space-y-1 relative pb-10">
               {savedSongs.map((song, index) => {
                 // ตรวจสอบสถานะ Drop Target
                 const isOver = dropTarget?.index === index;
                 const isTop = isOver && dropTarget?.position === 'top';
                 const isBottom = isOver && dropTarget?.position === 'bottom';

                 return (
                  <div 
                    key={song.id}
                    className="relative" // เพื่อให้ position absolute ของเส้นขาวอ้างอิงจากกล่องนี้
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* --- เส้นขาว Preview (Top) --- */}
                    {isTop && (
                        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>
                    )}

                    {/* --- ตัว Item --- */}
                    <div
                        onClick={() => onSelect(song)}
                        className={`
                            p-3 rounded-lg cursor-grab active:cursor-grabbing border flex justify-between items-center group transition-colors mb-2
                            ${currentId === song.id ? 'bg-pink-900/20 border-pink-500' : 'bg-slate-800 border-transparent hover:bg-slate-700'}
                            /* ลด Opacity ตัวที่ถูกลาก */
                            ${dragItem.current === index ? 'opacity-30' : 'opacity-100'}
                        `}
                    >
                      <div className="truncate pr-2 flex items-center gap-2">
                        <span className="text-slate-600 text-xs cursor-grab select-none">⋮⋮</span>
                        <div className={`font-medium truncate text-sm ${currentId === song.id ? 'text-pink-300' : 'text-slate-300'}`}>
                            {song.title}
                        </div>
                      </div>
                      <button onClick={(e) => onDelete(e, song.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 px-2 transition-opacity">
                          🗑️
                      </button>
                    </div>

                    {/* --- เส้นขาว Preview (Bottom) --- */}
                    {isBottom && (
                         <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>
                    )}
                  </div>
                 );
               })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};