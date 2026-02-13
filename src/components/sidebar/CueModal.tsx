'use client';
import React, { useState, useEffect } from 'react';

interface CueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, color: string) => void;
  type: 'talk' | 'break' | 'note' | null;
}

const NEON_COLORS = [
  { name: 'Blue', hex: '#3b82f6' },   // talk default
  { name: 'Yellow', hex: '#eab308' }, // break default
  { name: 'Gray', hex: '#94a3b8' },   // note default
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Cyan', hex: '#06b6d4' },
];

export const CueModal = ({ isOpen, onClose, onSubmit, type }: CueModalProps) => {
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[0].hex);

  // Reset ค่าเมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (isOpen && type) {
      if (type === 'talk') {
        setTitle('พูดคุยช่วงแรก');
        setSelectedColor('#3b82f6');
      } else if (type === 'break') {
        setTitle('พักเบรค 15 นาที');
        setSelectedColor('#eab308');
      } else {
        setTitle('บันทึกช่วยจำ');
        setSelectedColor('#94a3b8');
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-80 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          {type === 'talk' ? '🎤' : type === 'break' ? '☕' : '📝'} เพิ่ม {type?.toUpperCase()}
        </h3>

        {/* Input Title */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1 block">หัวข้อ / รายละเอียด</label>
          <input
            autoFocus
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit(title, selectedColor);
            }}
          />
        </div>

        {/* Color Picker */}
        <div className="mb-6">
          <label className="text-xs text-slate-400 mb-2 block">เลือกสีป้ายกำกับ</label>
          <div className="flex flex-wrap gap-2">
            {NEON_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === c.hex ? 'ring-2 ring-white scale-110' : ''}`}
                style={{ backgroundColor: c.hex, boxShadow: `0 0 10px ${c.hex}66` }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onSubmit(title, selectedColor)}
            className="flex-1 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-lg hover:brightness-110"
            style={{ backgroundColor: selectedColor, boxShadow: `0 0 15px ${selectedColor}40` }}
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};