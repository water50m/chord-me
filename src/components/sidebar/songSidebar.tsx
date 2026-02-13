'use client';
import React, { useState } from 'react';
import { SavedSong } from '@/types';
import { PlaylistTab } from './PlaylistTab'; // Component แยกสำหรับ Playlist
import { CueModal } from './CueModal';       // Component แยกสำหรับ Modal เลือกสี

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
  onImport,
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'playlist' | 'search'>('playlist');

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingSong, setIsFetchingSong] = useState(false);

  // --- Migration State ---
  const [isMigrating, setIsMigrating] = useState(false);

  // --- Modal States (สำหรับเพิ่ม Talk/Break/Note) ---
  const [isCueModalOpen, setIsCueModalOpen] = useState(false);
  const [cueType, setCueType] = useState<'talk' | 'break' | 'note' | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Search Logic
  // ---------------------------------------------------------------------------
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ---------------------------------------------------------------------------
  // 2. Fetch & Import Logic
  // ---------------------------------------------------------------------------
  const handleFetchSong = async (url: string) => {
    if (confirm('ต้องการนำเข้าเพลงนี้ใช่หรือไม่?')) {
      setIsFetchingSong(true);
      try {
        const res = await fetch(`/api/fetch-song?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.html) {
          onImport({
            html: data.html,
            title: data.title,
            originalKey: data.originalKey
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

  // ---------------------------------------------------------------------------
  // 3. Cue Logic (จัดการ Modal และบันทึก)
  // ---------------------------------------------------------------------------
  
  // เปิด Modal เมื่อกดปุ่มใน PlaylistTab
  const handleOpenCueModal = (type: 'talk' | 'break' | 'note') => {
    setCueType(type);
    setIsCueModalOpen(true);
  };

  // รับค่าจาก Modal แล้วบันทึกลง DB
  const handleSubmitCue = async (title: string, color: string) => {
    // ปิด Modal ก่อน
    setIsCueModalOpen(false);

    if (!title || !cueType) return;

    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          html: `<div class="cue-item cue-${cueType}">${cueType.toUpperCase()}</div>`, // Dummy HTML
          key: 'C',
          type: cueType,  // ส่ง type (talk/break/note)
          color: color    // 🔥 ส่งสีที่เลือกไปด้วย
        }),
      });

      if (res.ok) {
        const newCue = await res.json();
        // อัปเดต Playlist โดยเอาอันใหม่ไปต่อท้าย
        onUpdatePlaylist([...savedSongs, newCue]);
      }
    } catch (error) {
      console.error(error);
      alert('เพิ่มรายการไม่สำเร็จ');
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Migration Logic (ซ่อม Key)
  // ---------------------------------------------------------------------------
  const extractKeyFromHtml = (html: string): string => {
    if (typeof window === 'undefined') return 'C';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const keyLabel = doc.querySelector('.single-key__select-label');
    if (keyLabel && keyLabel.textContent) {
      return keyLabel.textContent.replace(/Key/gi, '').trim();
    }
    const firstChordEl = doc.querySelector('.c_chord');
    if (firstChordEl && firstChordEl.textContent) {
      const chord = firstChordEl.textContent.trim();
      return chord.split('/')[0].replace(/m|maj|7|sus|add/g, '').replace(/[0-9]/g, '');
    }
    return 'C';
  };

  const migrateSongKeys = async () => {
    if (!confirm('ต้องการอัปเดต Key เพลงทั้งหมดจาก HTML ใช่หรือไม่?')) return;
    setIsMigrating(true);
    try {
      for (const song of savedSongs) {
        const detectedKey = extractKeyFromHtml(song.html);
        await fetch('/api/songs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: song.id,
            title: song.title,
            html: song.html,
            original_key: detectedKey,
            user_key: detectedKey
          }),
        });
      }
      alert('อัปเดตข้อมูลเรียบร้อยแล้ว');
      window.location.reload();
    } catch (error) {
      console.error('Migration error:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsMigrating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <aside
      className={`
        fixed lg:relative z-30 h-full bg-slate-900 border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden opacity-0 lg:opacity-100'}
      `}
    >
      <div className="w-80 flex flex-col h-full relative">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 whitespace-nowrap">
            Neon Chords
          </h1>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="px-2 py-2 flex gap-1 bg-slate-900">
          <button 
            onClick={() => setActiveTab('editor')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'editor' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            ✏️ แก้ไข
          </button>
          <button 
            onClick={() => setActiveTab('playlist')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'playlist' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📂 Playlist
          </button>
          <button 
            onClick={() => setActiveTab('search')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'search' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            🔍 ค้นหา
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">

          {/* Loading Overlay */}
          {isFetchingSong && (
            <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center text-pink-400 animate-in fade-in backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-xs font-bold">กำลังนำเข้าเพลง...</span>
            </div>
          )}

          {/* ---------------- Tab 1: Editor ---------------- */}
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

              {/* Migration Button */}
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
                  {isMigrating ? 'กำลังอัปเดต...' : '🛠️ Migrate Song Keys'}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Tab 2: Playlist (Updated) ---------------- */}
          {activeTab === 'playlist' && (
            <PlaylistTab
              savedSongs={savedSongs}
              currentId={currentId}
              onSelect={onSelect}
              onDelete={onDelete}
              onUpdatePlaylist={onUpdatePlaylist}
              onAddCue={handleOpenCueModal} // ✅ ใช้ฟังก์ชันเปิด Modal
            />
          )}

          {/* ---------------- Tab 3: Search ---------------- */}
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
        
        {/* 🔥 Modal อยู่ที่นี่ (Render ทับทุกอย่างเมื่อเปิด) */}
        <CueModal 
          isOpen={isCueModalOpen}
          onClose={() => setIsCueModalOpen(false)}
          onSubmit={handleSubmitCue}
          type={cueType}
        />
        
      </div>
    </aside>
  );
};