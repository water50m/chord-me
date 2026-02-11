// src/utils/lyricsParser.ts

export interface ChordGroup {
  id: string;
  type: 'pair';
  text: string;
  chord: string | null;
}

export interface LineData {
  type: 'blockquote' | 'lyric';
  content: string | ChordGroup[];
}

export const parseRawHtml = (html: string): LineData[] => {
  if (!html) return [];

  // --- 1. CLEANING STAGE (แก้ปัญหา Wpfcll error แบบถอนรากถอนโคน) ---
  const cleanHtml = html
    // ลบ Tag <script> ทั้งหมด
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    // ลบ onload="..." ที่มีฟังก์ชัน Wpfcll หรืออื่นๆ
    .replace(/\bon\w+="[^"]*"/gim, "") 
    // ลบ onload='...' (Single quote)
    .replace(/\bon\w+='[^']*'/gim, "")
    // ลบ iframe (บางทีมีโฆษณาติดมา)
    .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, "");

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  
  // พยายามหา Container หลัก (ถ้าไม่เจอ .preview-chord-1 ก็เอา body)
  const container = doc.querySelector('.preview-chord-1') || doc.body;
  const nodes = Array.from(container.children);

  return nodes.map((node): LineData => {
    // 2. จัดการ Blockquote
    if (node.tagName === 'BLOCKQUOTE') {
      const cleanNode = node.cloneNode(true) as Element;
      
      // ล้าง attribute อันตรายอีกรอบในระดับ Element
      const allElements = cleanNode.querySelectorAll('*');
      allElements.forEach(el => {
        // ลบทุก attribute ที่ขึ้นต้นด้วย 'on' (เช่น onload, onclick, onerror)
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
      });

      return {
        type: 'blockquote',
        content: cleanNode.innerHTML
      };
    }

    // 3. จัดการ P (เนื้อเพลง)
    if (node.tagName === 'P') {
      return {
        type: 'lyric',
        content: parseLyricLine(node)
      };
    }

    return { type: 'lyric', content: [] };
  })
  .filter((line) => {
    if (line.type === 'blockquote') return true;
    if (line.type === 'lyric' && Array.isArray(line.content)) {
      return line.content.length > 0;
    }
    return false;
  });
};

const parseLyricLine = (pElement: Element): ChordGroup[] => {
  const groups: ChordGroup[] = [];
  const childNodes = Array.from(pElement.childNodes);
  let currentText = "";

  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];

    if (node.nodeType === Node.TEXT_NODE) {
      currentText += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains('c_chord')) {
      const chord = (node as Element).textContent || "";
      groups.push({
        id: `g-${groups.length}`,
        type: 'pair',
        text: currentText,
        chord: chord
      });
      currentText = "";
    }
  }

  if (currentText) {
    groups.push({
      id: `g-${groups.length}`,
      type: 'pair',
      text: currentText,
      chord: null
    });
  }

  return groups;
};

export const detectKeyFromLines = (lines: LineData[]): string => {
  for (const line of lines) {
    
    // กรณี 1: ถ้าเป็นบรรทัดเนื้อเพลงปกติ (ที่มีคอร์ด)
    if (line.type === 'lyric' && Array.isArray(line.content)) {
      for (const group of line.content) {
        if (group.chord) {
          // เจอคอร์ดแรกปุ๊บ เอามาทำความสะอาดแล้วคืนค่าเลย
          // เช่น "Asus4" -> "A", "C#m" -> "C#"
          return group.chord.split('/')[0].replace('m', '').replace('7', '').replace('maj', '').replace('sus', '').replace(/[0-9]/g, '');
        }
      }
    }
    
    // กรณี 2: ถ้าเป็น Blockquote (เช่น Intro)
    if (line.type === 'blockquote' && typeof line.content === 'string') {
       // ใช้ Regex หาคอร์ดภาษาอังกฤษตัวแรก (A-G) ที่อาจจะมี # หรือ b ตามหลัง
       // ต้องระวังไม่ให้ไปจับโดนคำทั่วไป (logic นี้อาจจะไม่แม่นเท่ากรณี 1 แต่พอช่วยได้)
       const match = line.content.match(/\b([A-G][#b]?)(m|maj|7|sus|add)*\b/);
       if (match) {
         return match[1];
       }
    }
  }
  
  return ''; // ถ้าหาไม่เจอเลย ให้คืนค่าว่าง (เดี๋ยวไปใส่ Default C ที่หน้าบ้านเอา)
};