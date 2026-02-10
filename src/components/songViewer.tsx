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

  // --- 1. Load Data & Open First Song ---
  useEffect(() => {
    const saved = localStorage.getItem('my_song_collection');
    if (saved) {
      const parsedSongs: SavedSong[] = JSON.parse(saved);
      setSavedSongs(parsedSongs);

      // ถ้ามีเพลงในรายการ ให้เปิดเพลงแรกทันที
      if (parsedSongs.length > 0) {
        const firstSong = parsedSongs[0];
        setInputHtml(firstSong.html);
        setCurrentId(firstSong.id);
        
        // แปลง HTML ทันที (ต้องใช้ try-catch เหมือน handleConvert)
        try {
            const data = parseRawHtml(firstSong.html);
            setParsedData(data);
        } catch (e) {
            console.error("Auto load error", e);
        }
      }
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []); // Run ครั้งเดียวตอนเปิดเว็บ

  const updateLocalStorage = (songs: SavedSong[]) => {
    setSavedSongs(songs);
    localStorage.setItem('my_song_collection', JSON.stringify(songs));
  };

  // ... (ฟังก์ชัน handleConvert, handleSave, handleSelectSong, handleDelete, handleNew เหมือนเดิม) ...
  const handleConvert = (htmlToParse: string = inputHtml) => {
    try {
      const data = parseRawHtml(htmlToParse);
      setParsedData(data);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการแปลง HTML");
    }
  };

  const handleSave = () => {
    if (!inputHtml.trim()) return alert('กรุณาใส่ HTML ก่อนบันทึก');
    
    const cleanHtml = inputHtml.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;

    let title = 'Untitled Song';
    const h1 = tempDiv.querySelector('h1');
    if (h1) {
      title = h1.innerText.replace(/คอร์ดเพลง/gi, '').replace(/\n/g, ' ').trim();
    } else {
      const firstP = tempDiv.querySelector('p'); 
      if (firstP) title = firstP.innerText.substring(0, 50) + '...';
    }

    const newSong: SavedSong = {
      id: currentId || Date.now(),
      title: title || `เพลงใหม่ ${new Date().toLocaleTimeString()}`,
      html: inputHtml,
    };

    if (currentId) {
      const updatedList = savedSongs.map(s => s.id === currentId ? newSong : s);
      updateLocalStorage(updatedList);
      alert('บันทึกทับเพลงเดิมเรียบร้อย');
    } else {
      updateLocalStorage([newSong, ...savedSongs]);
      setCurrentId(newSong.id);
      alert('บันทึกเพลงใหม่เรียบร้อย');
    }
  };

  const handleSelectSong = (song: SavedSong) => {
    setInputHtml(song.html);
    setCurrentId(song.id);
    handleConvert(song.html);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบ?')) {
      const newList = savedSongs.filter(s => s.id !== id);
      updateLocalStorage(newList);
      if (currentId === id) handleNew();
    }
  };

  const handleNew = () => {
    setInputHtml('');
    setParsedData([]);
    setCurrentId(null);
  };
  // ... (จบฟังก์ชันเดิม) ...

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
      />

      <main className="flex-1 h-full bg-white relative flex flex-col overflow-hidden">
        
        <div className="h-14 border-b border-slate-200 flex items-center px-4 bg-white sticky top-0 z-10 shadow-sm shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 mr-4 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h2 className="text-lg font-bold text-slate-800 truncate">
            {savedSongs.find(s => s.id === currentId)?.title || 'ตัวอย่างผลลัพธ์ (Preview)'}
          </h2>
        </div>

        <div 
          ref={scrollContainerRef} 
          className="flex-1 p-4 md:p-6 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto custom-scrollbar scroll-smooth"
        >
          {parsedData.length > 0 ? (
            <div className="
              flex flex-col gap-1 
              lg:flex-wrap lg:content-start lg:h-full lg:gap-x-8 lg:gap-y-0
            ">
              {parsedData.map((line, idx) => (
                <SongLine key={idx} line={line} />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 space-y-4">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl">👈</div>
               <p>เปิด Sidebar เพื่อใส่โค้ด HTML</p>
            </div>
          )}
        </div>

        {parsedData.length > 0 && (
          <AutoScrollController scrollContainerRef={scrollContainerRef} />
        )}

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
      </main>
    </div>
  );
}