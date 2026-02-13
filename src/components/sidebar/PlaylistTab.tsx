'use client';
import React, { useRef, useState } from 'react';
import { SavedSong } from '@/types';

interface PlaylistTabProps {
  savedSongs: SavedSong[];
  currentId: number | null;
  onSelect: (song: SavedSong) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onUpdatePlaylist: (songs: SavedSong[]) => void;
  onAddCue: (type: 'talk' | 'break' | 'note') => void;
}

export const PlaylistTab = ({
  savedSongs,
  currentId,
  onSelect,
  onDelete,
  onUpdatePlaylist,
  onAddCue,
}: PlaylistTabProps) => {
  // --- Drag & Drop Logic ---
  const dragItem = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number, position: 'top' | 'bottom' } | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragItem.current === null || dragItem.current === index) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const hoverPosition = e.clientY < midY ? 'top' : 'bottom';
    
    setDropTarget((prev) => {
      if (prev?.index === index && prev?.position === hoverPosition) return prev;
      return { index, position: hoverPosition };
    });
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    if (dragItem.current === null || dropTarget === null) {
      setDropTarget(null);
      dragItem.current = null;
      return;
    }

    const sourceIndex = dragItem.current;
    let targetIndex = dropTarget.index;

    // ปรับ index กรณีลากลงล่าง
    if (dropTarget.position === 'bottom') targetIndex += 1;

    // กรณีวางที่เดิม
    if (sourceIndex === targetIndex || sourceIndex === targetIndex - 1) {
      setDropTarget(null);
      dragItem.current = null;
      return;
    }

    // สลับตำแหน่งใน Array
    const _savedSongs = [...savedSongs];
    const [movedItem] = _savedSongs.splice(sourceIndex, 1);
    
    // ถ้าลากจากบนลงล่าง Index จะเปลี่ยนไป 1
    if (sourceIndex < targetIndex) targetIndex -= 1;
    
    _savedSongs.splice(targetIndex, 0, movedItem);
    
    onUpdatePlaylist(_savedSongs);
    setDropTarget(null);
    dragItem.current = null;
  };

  // --- Helper Icons ---
  const getIcon = (type?: string) => {
    switch (type) {
      case 'talk': return '🎤';
      case 'break': return '☕';
      case 'note': return '📝';
      default: return '⋮⋮';
    }
  };

  return (
    <div className="flex flex-col h-full relative pb-10">
      
      {/* 1. Action Buttons (Talk / Break / Note) */}
      <div className="flex gap-2 mb-4 px-1">
        <button 
          onClick={() => onAddCue('talk')} 
          className="flex-1 py-1.5 text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
        >
          🎤 Talk
        </button>
        <button 
          onClick={() => onAddCue('break')} 
          className="flex-1 py-1.5 text-[10px] font-bold bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-600/30 transition-colors flex items-center justify-center gap-1"
        >
          ☕ Break
        </button>
        <button 
          onClick={() => onAddCue('note')} 
          className="flex-1 py-1.5 text-[10px] font-bold bg-slate-600/20 text-slate-400 border border-slate-500/30 rounded hover:bg-slate-600/30 transition-colors flex items-center justify-center gap-1"
        >
          📝 Note
        </button>
      </div>

      {/* 2. Playlist Items */}
      <div className="space-y-1">
        {savedSongs.map((song, index) => {
          const isOver = dropTarget?.index === index;
          const isTop = isOver && dropTarget?.position === 'top';
          const isBottom = isOver && dropTarget?.position === 'bottom';
          
          const isCue = song.type && song.type !== 'song';
          const isActive = currentId === song.id;

          // --- Style Logic ---
          let inlineStyle: React.CSSProperties = {};
          let containerClass = "p-3 rounded-lg cursor-grab active:cursor-grabbing border flex justify-between items-center group transition-colors mb-2";
          
          // ถ้าเป็น Cue และมีสีที่เลือกไว้
          if (isCue && song.color) {
            inlineStyle = {
              backgroundColor: `${song.color}20`, // Opacity ~12%
              borderColor: `${song.color}60`,    // Opacity ~40%
              color: song.color
            };
          } else {
            // สี Default (ไม่มี Custom Color)
            if (isActive) {
              containerClass += " bg-pink-900/20 border-pink-500 text-pink-300";
            } else {
              containerClass += " bg-slate-800 border-transparent hover:bg-slate-700 text-slate-300";
            }
          }

          // ถ้ากำลัง Drag ให้จางลง
          if (dragItem.current === index) {
            containerClass += " opacity-30";
          } else {
            containerClass += " opacity-100";
          }

          return (
            <div
              key={song.id}
              className="relative"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drop Indicator (Top) */}
              {isTop && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>}
              
              <div
                onClick={() => onSelect(song)}
                style={inlineStyle}
                className={containerClass}
              >
                <div className="truncate pr-2 flex items-center gap-2">
                   {/* Icon */}
                   <span 
                     className="text-xs select-none opacity-50 shrink-0 w-4 text-center"
                     style={{ color: isCue && song.color ? song.color : 'inherit' }}
                   >
                     {getIcon(song.type)}
                   </span>
                   
                   {/* Title */}
                   <div className="font-medium truncate text-sm">
                     {song.title}
                   </div>
                </div>

                {/* Delete Button */}
                <button 
                  onClick={(e) => onDelete(e, song.id)} 
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 px-2 transition-opacity"
                  title="ลบรายการ"
                >
                  🗑️
                </button>
              </div>

              {/* Drop Indicator (Bottom) */}
              {isBottom && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>}
            </div>
          );
        })}
        
        {/* Empty State */}
        {savedSongs.length === 0 && (
          <div className="text-center text-slate-600 text-xs mt-10 p-4 border-2 border-dashed border-slate-800 rounded-lg">
            ยังไม่มีรายการเพลง
            <br />
            ลากเพลงมาใส่ หรือกดเพิ่ม Talk/Break ด้านบน
          </div>
        )}
      </div>
    </div>
  );
};