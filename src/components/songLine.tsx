import React from 'react';
import { LineData } from '@/utils/lyricsParser';

interface SongLineProps {
  line: LineData;
}

export const SongLine = ({ line }: SongLineProps) => {
  if (line.type === 'blockquote') {
    // 1. แยกส่วนหัวข้อ (INTRO :) กับ เนื้อหา
    const parts = (line.content as string).split(':');
    let label = '';
    let chords = line.content as string;

    if (parts.length > 1) {
      label = parts[0] + ' : ';
      chords = parts.slice(1).join(':');
    }

    // -------------------------------------------------------
    // 🔥 จุดที่แก้ไข: เลิกใช้ Logic แยกตัวอักษร A-G แบบเดิม เพราะมันจะไปตีกับ HTML Tag
    // เราจะใช้การเช็ค Tag HTML แทน
    // -------------------------------------------------------

    // 1. ถ้ามีคอร์ดติดกันแบบ <span>C</span><span>Dm</span> ให้เติมช่องว่างคั่นกลาง
    chords = chords.replace(/<\/span><span/g, '</span> <span');

    // 2. แต่งเครื่องหมาย | (Pipe) ให้สวยงาม (อันนี้ทำได้ เพราะไม่มีใน tag html)
    chords = chords.replace(/\|/g, '&nbsp;<span class="text-slate-400">|</span>&nbsp;');

    // ⚠️ 3. ลบบรรทัด replace('/') ออก! 
    // เพราะมันจะไปทำลาย tag </span> จนพังเหมือนในรูปครับ
    // ถ้าอยากให้สวยขึ้น ให้ใช้ CSS tracking-wide ที่ container ก็พอช่วยได้แล้วครับ

    const formattedContent = label + chords;

    return (
      <div className="w-full lg:w-[450px] shrink-0 mb-2">
        <div
          className="
            bg-yellow-50/80 px-3 py-2 rounded border-l-4 border-yellow-400 
            italic text-slate-700 text-sm 
            tracking-wide leading-relaxed
          "
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </div>
    );
  }

  // 2. ส่วนเนื้อเพลง
  return (
    <div className="w-full lg:w-[450px] shrink-0 mb-1 px-1">
      {/* leading-[3rem]: เว้นพื้นที่แนวตั้งให้คอร์ด */}
      <div className="block whitespace-pre-wrap leading-[3rem]">
        {(line.content as any[]).map((group: any) => {

          // 🔥 Logic: เช็คความยาวคอร์ด
          const isLongChord = group.chord && group.chord.length > 3;

          return (
            <div key={group.id} className="inline-block relative align-bottom">

              {/* --- ส่วนคอร์ด --- */}
              {group.chord && (
                <span
                  className={`
                    absolute bottom-8 left-full text-pink-600 font-bold text-base whitespace-nowrap z-10 
                    ${isLongChord ? '-translate-x-6.5' : '-translate-x-5'} /* ถ้าคอร์ดยาว ให้ขยับขวาไปอีกนิด (ประมาณ 12px) */
                  `}
                >
                  {group.chord}
                </span>
              )}

              {/* --- ส่วนเนื้อร้อง --- */}
              <span className="text-lg text-slate-900 font-medium">
                {group.text}
              </span>

            </div>
          );
        })}
      </div>
    </div>
  );
};