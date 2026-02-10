import React from 'react';
import { LineData } from '@/utils/lyricsParser';

interface SongLineProps {
  line: LineData;
}

export const SongLine = ({ line }: SongLineProps) => {
  // 1. ถ้าเป็น Intro (Blockquote) ให้ใช้ Padding น้อยๆ
  if (line.type === 'blockquote') {
    return (
      <div className="w-full lg:w-[450px] shrink-0 mb-2"> {/* mb-2 คือห่างนิดเดียว */}
        <div 
          className="bg-yellow-50/80 px-3 py-2 rounded border-l-4 border-yellow-400 italic text-slate-700 text-sm" 
          dangerouslySetInnerHTML={{ __html: line.content as string }} 
        />
      </div>
    );
  }

  // 2. ถ้าเป็นเนื้อเพลงปกติ
  return (
    <div className="w-full lg:w-[450px] shrink-0 mb-1"> {/* mb-1: ระยะห่างระหว่างบรรทัดน้อยมาก */}
       {/* items-end: ให้ฐานตัวหนังสือเท่ากัน
          leading-none: ลดระยะห่างบรรทัดของฟอนต์ให้ชิดที่สุด 
       */}
       <div className="flex flex-wrap items-end leading-none">
        {(line.content as any[]).map((group: any) => (
          <div key={group.id} className="flex flex-col items-center">
            
            {/* --- ส่วนคอร์ด (บรรทัดบน) --- */}
            {/* เช็คว่า: ถ้าในกลุ่มนี้มีคอร์ด ให้แสดงความสูง
               ถ้าไม่มีคอร์ดเลย (null/empty) ให้ความสูงเป็น 0 หรือน้อยที่สุด
            */}
            <div className={`w-full text-right ${group.chord ? 'h-5 mb-0.5' : 'h-0'}`}>
              {group.chord && (
                <span className="text-pink-600 font-bold text-base block">
                  {group.chord}
                </span>
              )}
            </div>

            {/* --- ส่วนเนื้อร้อง (บรรทัดล่าง) --- */}
            <div className="text-lg text-slate-900 font-medium whitespace-pre px-[1px]">
              {group.text}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};