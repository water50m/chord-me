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

  // เพิ่ม Prop ใหม่
  onImport: (data: { html: string; title?: string; originalKey?: string }) => void;
}


interface SearchResult {
  title: string;
  url: string;
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
  onImport, // รับมา
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'playlist' | 'search'>('editor');

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingSong, setIsFetchingSong] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // --- Drag & Drop Logic (เหมือนเดิม) ---
  const dragItem = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number, position: 'top' | 'bottom' } | null>(null);

  // ... (handleDragStart, handleDragOver, handleDragEnd เหมือนเดิมเป๊ะๆ) ...
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
      return;
    }
    const sourceIndex = dragItem.current;
    let targetIndex = dropTarget.index;
    if (dropTarget.position === 'bottom') targetIndex += 1;
    if (sourceIndex === targetIndex || sourceIndex === targetIndex - 1) {
      setDropTarget(null);
      dragItem.current = null;
      return;
    }
    const _savedSongs = [...savedSongs];
    const [movedItem] = _savedSongs.splice(sourceIndex, 1);
    if (sourceIndex < targetIndex) targetIndex -= 1;
    _savedSongs.splice(targetIndex, 0, movedItem);
    onUpdatePlaylist(_savedSongs);
    setDropTarget(null);
    dragItem.current = null;
  };

  // --- Search & Import Logic ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results) setSearchResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
      alert('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  // --- LOGIC ที่แก้ไขใหม่ ---
  const handleFetchSong = async (url: string) => {
    if (confirm('ต้องการนำเข้าเพลงนี้ใช่หรือไม่?')) {
      setIsFetchingSong(true);
      try {
        // 1. เรียก API
        const res = await fetch(`/api/fetch-song?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        // data ตอนนี้ควรจะมี { html: "...", title: "...", originalKey: "A" }

        if (data.html) {
          // 🔥 แก้ตรงนี้: ส่งข้อมูลทั้งก้อนไปเลย (ไม่ใช่แค่ html)
          onImport({
            html: data.html,
            title: data.title,
            originalKey: data.originalKey // ส่ง Key ไปด้วย
          });

          setActiveTab('playlist');
        } else {
          alert('ไม่สามารถดึงเนื้อหาเพลงได้');
        }
      } catch (error) {
        console.error('Fetch song error:', error);
        alert('เกิดข้อผิดพลาดในการดึงเพลง');
      } finally {
        setIsFetchingSong(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const extractKeyFromHtml = (html: string): string => {
    if (typeof window === 'undefined') return 'C';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. ลองหาจากปุ่ม Label ก่อน (เผื่อใน HTML มีติดมา)
    const keyLabel = doc.querySelector('.single-key__select-label');
    if (keyLabel && keyLabel.textContent) {
      return keyLabel.textContent.replace(/Key/gi, '').trim();
    }

    // 2. ถ้าไม่เจอจริงๆ (ซึ่งส่วนใหญ่ใน DB จะไม่มี) ให้เอาจากคอร์ดแรก
    const firstChordEl = doc.querySelector('.c_chord');
    if (firstChordEl && firstChordEl.textContent) {
      const chord = firstChordEl.textContent.trim();
      // ลบ m, 7, maj ออกเพื่อให้เหลือแค่ Key หลัก
      return chord.split('/')[0].replace(/m|maj|7|sus|add/g, '').replace(/[0-9]/g, '');
    }

    return 'C';
  };

  const migrateSongKeys = async () => {
    if (!confirm('คุณต้องการอัปเดต Key เพลงทั้งหมดที่ยังไม่มีข้อมูลใช่หรือไม่?')) return;

    setIsMigrating(true);
    try {
      // 1. ดึงเพลงทั้งหมด (ใช้ savedSongs ที่มีอยู่แล้วได้เลย)
      for (const song of savedSongs) {
        // คำนวณคีย์จาก HTML
        const detectedKey = extractKeyFromHtml(song.html);

        // เงื่อนไข: original_key เซฟทับเสมอ, user_key เซฟเฉพาะเมื่อว่าง
        const newOriginalKey = detectedKey;


        // 2. ยิง API PUT เพื่อบันทึกลง Database
        await fetch('/api/songs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: song.id,
            title: song.title,
            html: song.html,
            original_key: newOriginalKey,
            user_key: newOriginalKey
          }),
        });
      }

      alert('อัปเดตคีย์เพลงในระบบเรียบร้อยแล้ว');
      window.location.reload(); // รีโหลดเพื่อให้ข้อมูลล่าสุดแสดงผล
    } catch (error) {
      console.error('Migration error:', error);
      alert('เกิดข้อผิดพลาดในการ Migration');
    } finally {
      setIsMigrating(false);
    }
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
        <div className="px-2 py-2 flex gap-1 bg-slate-900">
          <button onClick={() => setActiveTab('editor')} className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'editor' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            ✏️ แก้ไข
          </button>
          <button onClick={() => setActiveTab('playlist')} className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'playlist' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            📂 ({savedSongs.length})
          </button>
          <button onClick={() => setActiveTab('search')} className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'search' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            🔍 ค้นหา
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">

          {/* Loading Overlay */}
          {isFetchingSong && (
            <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center text-pink-400 animate-in fade-in backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-xs font-bold">กำลังแกะเพลงและสร้างคอร์ด...</span>
            </div>
          )}

          {/* Editor Tab */}
          {activeTab === 'editor' && (
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
              {/* ปุ่ม Migration วางไว้ล่างสุดของรายการเพลง */}
              <div className="mt-auto pt-4 border-t border-slate-800">
                <button
                  onClick={migrateSongKeys}
                  disabled={isMigrating}
                  className={`
                              w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2
                              ${isMigrating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'}
                            `}
                >
                  {isMigrating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>🛠️ Migrate Song Keys</>
                  )}
                </button>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  ดึงคีย์จาก HTML และบันทึกลงฐานข้อมูลย้อนหลัง
                </p>
              </div>
            </div>

          )}

          {/* Playlist Tab */}
          {activeTab === 'playlist' && (
            <div className="space-y-1 relative pb-10">
              {savedSongs.map((song, index) => {
                const isOver = dropTarget?.index === index;
                const isTop = isOver && dropTarget?.position === 'top';
                const isBottom = isOver && dropTarget?.position === 'bottom';

                return (
                  <div
                    key={song.id}
                    className="relative"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {isTop && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>}
                    <div
                      onClick={() => onSelect(song)}
                      className={`
                            p-3 rounded-lg cursor-grab active:cursor-grabbing border flex justify-between items-center group transition-colors mb-2
                            ${currentId === song.id ? 'bg-pink-900/20 border-pink-500' : 'bg-slate-800 border-transparent hover:bg-slate-700'}
                            ${dragItem.current === index ? 'opacity-30' : 'opacity-100'}
                        `}
                    >
                      <div className="truncate pr-2 flex items-center gap-2">
                        <span className="text-slate-600 text-xs cursor-grab select-none">⋮⋮</span>
                        <div className={`font-medium truncate text-sm ${currentId === song.id ? 'text-pink-300' : 'text-slate-300'}`}>
                          {song.title}
                        </div>
                      </div>
                      <button onClick={(e) => onDelete(e, song.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 px-2 transition-opacity">🗑️</button>
                    </div>
                    {isBottom && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 pointer-events-none rounded-full transition-all"></div>}
                  </div>

                );
              })}


            </div>

          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1 block">ชื่อเพลง หรือ ศิลปิน</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-pink-500 outline-none"
                    placeholder="เช่น จะรักหรือจะร้าย"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-3 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? '...' : '🔍'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center text-slate-500 text-xs mt-10">
                    พิมพ์ชื่อเพลงแล้วกดค้นหา
                  </div>
                )}

                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleFetchSong(result.url)}
                    className="p-3 mb-2 bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-pink-500/50 rounded-lg cursor-pointer transition-all group"
                  >
                    <div className="font-medium text-slate-200 text-sm group-hover:text-pink-300 mb-1">
                      {result.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {result.url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};