'use client';
import React, { useState, useEffect, useRef } from 'react';
import { parseRawHtml, LineData } from '@/utils/lyricsParser';
import { SongLine } from './songLine';
import { SongSidebar } from './songSidebar';
import { AutoScrollController } from './AutoScrollController';
import { SavedSong } from '@/types';
import { FloatingPlaylist } from './FloatingPlaylist';
import { transposeHtml } from '@/utils/transpose';
import { KeySelector } from './KeySelector';

export default function SongViewer() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inputHtml, setInputHtml] = useState('');
  const [parsedData, setParsedData] = useState<LineData[]>([]);
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [currentKey, setCurrentKey] = useState('C');
  const [originalKey, setOriginalKey] = useState('C');
  const [displayHtml, setDisplayHtml] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await fetch('/api/songs');
        if (res.ok) {
          const data = await res.json();
          setSavedSongs(data);

          if (data.length > 0) {
            // 🔥 แก้ตรงนี้ 2: เรียกใช้ loadSongToPlayer แทนการ set เอง
            loadSongToPlayer(data[0]);
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

  const loadSongToPlayer = (song: SavedSong) => {
    setCurrentId(song.id);
    setInputHtml(song.html); // เก็บต้นฉบับ (ห้ามแก้ตัวนี้ด้วย Transpose)

    const orig = song.original_key || 'C'; // ถ้าไม่มีใน DB ให้เดาหรือ default C
    const userK = song.user_key || orig;   // ถ้า user ไม่เคยเลือก ให้ใช้ original

    setOriginalKey(orig);
    setCurrentKey(userK);

    // คำนวณ HTML ใหม่เดี๋ยวนั้นเลย
    const newHtml = transposeHtml(song.html, orig, userK);
    setDisplayHtml(newHtml);

    // Parse คอร์ดจาก HTML ที่แปลงแล้ว เพื่อเอาไปทำปุ่มกดคอร์ด
    try { setParsedData(parseRawHtml(newHtml)); } catch (e) { }
  };

  const handleKeyChange = async (newKey: string) => {
    if (!currentId) return;

    setCurrentKey(newKey);

    // 1. อัปเดตหน้าจอทันที (UX)
    const newHtml = transposeHtml(inputHtml, originalKey, newKey);
    setDisplayHtml(newHtml);
    try { setParsedData(parseRawHtml(newHtml)); } catch (e) { }

    // 2. บันทึกลง Database (เฉพาะ user_key)
    // (เราจะไม่บันทึก HTML ที่แก้แล้วทับลงไป ไม่งั้นเปลี่ยนกลับไม่ได้)
    try {
      // ต้องแก้ API PUT ให้รองรับการ update แค่ user_key
      await fetch('/api/songs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentId,
          user_key: newKey,
          // ส่งค่าเดิมไปด้วยเพื่อความชัวร์ (ขึ้นอยู่กับ API คุณเขียนยังไง)
          title: savedSongs.find(s => s.id === currentId)?.title,
          html: inputHtml
        }),
      });

      // อัปเดต State รายการเพลง
      setSavedSongs(prev => prev.map(s =>
        s.id === currentId ? { ...s, user_key: newKey } : s
      ));
    } catch (e) {
      console.error("Failed to save key preference");
    }
  };

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
  // 1. ฟังก์ชันเปลี่ยนคีย์เพื่อดูตัวอย่าง (Preview) - ไม่ยิง API
  const handleKeyPreview = (newKey: string) => {
      setCurrentKey(newKey);
      // แปลง HTML ทันที
      const newHtml = transposeHtml(inputHtml, originalKey, newKey);
      setDisplayHtml(newHtml);
      try { setParsedData(parseRawHtml(newHtml)); } catch(e) {}
  };

  // 2. ฟังก์ชันบันทึกลง DB (Save) - ยิง API
  const handleKeySave = async () => {
      if (!currentId) return;
      
      try {
          // ยิง API บันทึก user_key ลง DB
          await fetch('/api/songs', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  id: currentId, 
                  user_key: currentKey, // เอาคีย์ปัจจุบันที่เลือกอยู่ไปบันทึก
                  title: savedSongs.find(s => s.id === currentId)?.title,
                  html: inputHtml 
              }),
          });
          
          // อัปเดตข้อมูลใน State รายการเพลงหลัก
          setSavedSongs(prev => prev.map(s => 
              s.id === currentId ? { ...s, user_key: currentKey } : s
          ));
          
          alert(`บันทึกคีย์ ${currentKey} เป็นค่าเริ่มต้นเรียบร้อย`);
          setShowKeySettings(false); // ปิดหน้าต่าง
      } catch (e) {
          console.error("Failed to save key preference");
          alert("บันทึกไม่สำเร็จ");
      }
  };
  
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

    const songData = {
      title,
      html: inputHtml,
      user_key: currentKey // <--- เพิ่มบรรทัดนี้ เพื่อบันทึกคีย์ปัจจุบัน
    };

    

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
    loadSongToPlayer(song); // เรียกตัวนี้ตัวเดียวจบ มันจะจัดการ Key ให้เอง
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

          {/* 🔥 แก้ตรงนี้ 5.1: เพิ่มปุ่มแสดงคีย์ข้างๆ ชื่อเพลง */}
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 truncate">
              {savedSongs.find(s => s.id === currentId)?.title || 'Preview'}
            </h2>

            {/* ปุ่ม Key */}
            <button
              onClick={() => setShowKeySettings(true)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-pink-600 text-xs font-bold rounded border border-slate-300 transition-colors"
            >
              Key: {currentKey}
            </button>
          </div>


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
      {showKeySettings && (
        <KeySelector
          originalKey={originalKey}
          currentKey={currentKey}
          onPreview={handleKeyPreview} // ส่งฟังก์ชัน Preview
          onSave={handleKeySave}       // ส่งฟังก์ชัน Save
          onClose={() => {
            // ถ้าปิดโดยไม่เซฟ ให้คืนค่ากลับเป็นค่าที่บันทึกล่าสุด (Optional)
            // หรือจะปล่อยไว้ตามที่เลือกค้างไว้ก็ได้ แต่ปกติควรคืนค่า
            const savedKey = savedSongs.find(s => s.id === currentId)?.user_key || originalKey;
            handleKeyPreview(savedKey);
            setShowKeySettings(false);
          }}
        />
      )}
      {/* ✅ ใส่ FloatingPlaylist ตรงนี้! (วางไว้ท้ายสุดจะได้อยู่บนสุด) */}
      <FloatingPlaylist
        songs={savedSongs}          // ส่งรายการเพลงทั้งหมดไป
        currentId={currentId}       // ส่ง ID เพลงที่กำลังเล่นไป (เพื่อ Highlight)
        onSelect={handleSelectSong} // ส่งฟังก์ชันเลือกเพลงไป
      />
    </div>
  );
}