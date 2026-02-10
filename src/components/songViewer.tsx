'use client';
import React, { useState, useEffect, useRef } from 'react';
import { parseRawHtml, LineData } from '@/utils/lyricsParser';
import { SongLine } from './songLine';
import { SongSidebar } from './songSidebar';
import { AutoScrollController } from './AutoScrollController';
import { SavedSong } from '@/types';

export default function SongViewer() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inputHtml, setInputHtml] = useState('');
  const [parsedData, setParsedData] = useState<LineData[]>([]);
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        // 1. ดึงข้อมูลจาก API (Neon)
        const res = await fetch('/api/songs');

        if (res.ok) {
          const data = await res.json();
          setSavedSongs(data); // อัปเดต State ด้วยข้อมูลจาก DB

          // 2. ถ้ามีเพลง ให้โหลดเพลงแรกมาแสดงทันที
          if (data.length > 0) {
            const firstSong = data[0];
            setInputHtml(firstSong.html);
            setCurrentId(firstSong.id);
            try {
              setParsedData(parseRawHtml(firstSong.html));
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load songs', error);
      }
    };

    fetchSongs();

    // 3. Logic ปิด Sidebar บนมือถือ
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    // *** ลบส่วน localStorage ออกไปเลยครับ ***
  }, []);

  const updateLocalStorage = (songs: SavedSong[]) => {
    setSavedSongs(songs);
    localStorage.setItem('my_song_collection', JSON.stringify(songs));
  };

  const handleNew = () => {
    setInputHtml('');
    setParsedData([]);
    setCurrentId(null);
  };
  
  // --- NEW: ฟังก์ชันนำเข้าและบันทึกอัตโนมัติ ---
  const handleImportSong = async (htmlContent: string) => {
    // 1. Extract Title (เหมือนเดิม)
    const cleanHtml = htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    let title = 'เพลงนำเข้า';
    // ... logic หา title ...
    const h1 = tempDiv.querySelector('h1');
    if (h1) title = h1.innerText.replace(/คอร์ดเพลง/gi, '').trim();

    // 2. ยิง API บันทึกเลย
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, html: htmlContent }),
      });

      if (res.ok) {
        const newSong = await res.json();
        setSavedSongs(prev => [newSong, ...prev]);

        // โหลดเข้า Editor
        setInputHtml(newSong.html);
        setCurrentId(newSong.id);
        try { setParsedData(parseRawHtml(newSong.html)); } catch (e) { }

        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }
    } catch (error) {
      alert('นำเข้าล้มเหลว');
    }
  };
  // ------------------------------------------

  // ... (ฟังก์ชันอื่นๆ: handleConvert, handleSave, handleSelectSong, etc. เหมือนเดิม) ...
  const handleConvert = (htmlToParse: string = inputHtml) => {
    try {
      const data = parseRawHtml(htmlToParse);
      setParsedData(data);
    } catch (error) { console.error(error); alert("Error parsing HTML"); }
  };
  const handleSave = async () => {
    if (!inputHtml.trim()) return alert('กรุณาใส่ HTML ก่อนบันทึก');

    // 1. Extract Title (เหมือนเดิม)
    const cleanHtml = inputHtml.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    let title = 'Untitled Song';
    const h1 = tempDiv.querySelector('h1');
    if (h1) title = h1.innerText.replace(/คอร์ดเพลง/gi, '').trim();
    else { const p = tempDiv.querySelector('p'); if (p) title = p.innerText.substring(0, 50); }

    const songData = { title, html: inputHtml };

    try {
      if (currentId) {
        // --- UPDATE (PUT) ---
        const res = await fetch('/api/songs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...songData, id: currentId }),
        });

        if (res.ok) {
          alert('บันทึกการแก้ไขเรียบร้อย');
          // Update State หน้าจอ
          setSavedSongs(prev => prev.map(s => s.id === currentId ? { ...s, ...songData } : s));
        }
      } else {
        // --- CREATE (POST) ---
        const res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songData),
        });

        if (res.ok) {
          const newSong = await res.json();
          alert('บันทึกเพลงใหม่เรียบร้อย');
          setCurrentId(newSong.id);
          setSavedSongs(prev => [newSong, ...prev]);
        }
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
      console.error(error);
    }
  };
  const handleSelectSong = (song: SavedSong) => {
    setInputHtml(song.html);
    setCurrentId(song.id);
    handleConvert(song.html);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบ?')) {
      try {
        const res = await fetch(`/api/songs?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setSavedSongs(prev => prev.filter(s => s.id !== id));
          if (currentId === id) handleNew();
        }
      } catch (error) {
        alert('ลบไม่สำเร็จ');
      }
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex overflow-hidden font-sans relative">
      <SongSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        savedSongs={savedSongs}
        currentId={currentId}
        inputHtml={inputHtml}
        setInputHtml={setInputHtml}
        onNew={handleNew}
        onPreview={() => handleConvert()}
        onSave={handleSave}
        onSelect={handleSelectSong}
        onDelete={handleDelete}
        onUpdatePlaylist={updateLocalStorage}

        // ส่งฟังก์ชันใหม่ไปให้ Sidebar
        onImport={handleImportSong}
      />

      {/* ... (ส่วน Main Content เหมือนเดิม) ... */}
      <main className="flex-1 h-full bg-white relative flex flex-col overflow-hidden">
        <div className="h-14 border-b border-slate-200 flex items-center px-4 bg-white sticky top-0 z-10 shadow-sm shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-4 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-lg font-bold text-slate-800 truncate">
            {savedSongs.find(s => s.id === currentId)?.title || 'ตัวอย่างผลลัพธ์ (Preview)'}
          </h2>
        </div>
        <div ref={scrollContainerRef} className="flex-1 p-4 md:p-6 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto custom-scrollbar scroll-smooth">
          {parsedData.length > 0 ? (
            <div className="flex flex-col gap-1 lg:flex-wrap lg:content-start lg:h-full lg:gap-x-8 lg:gap-y-0">
              {parsedData.map((line, idx) => (<SongLine key={idx} line={line} />))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl">👈</div>
              <p>เปิด Sidebar เพื่อค้นหาหรือใส่โค้ด HTML</p>
            </div>
          )}
        </div>
        {parsedData.length > 0 && <AutoScrollController scrollContainerRef={scrollContainerRef} />}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      </main>
    </div>
  );
}