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

  // --- 1. CLEANING STAGE (แก้ปัญหา Wpfcll error) ---
  // ลบ attribute อันตรายและ tag script ออกทั้งหมด
  const cleanHtml = html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // ลบ <script>
    .replace(/\bon\w+="[^"]*"/gim, "") // ลบ onclick="...", onload="..." (Double quote)
    .replace(/\bon\w+='[^']*'/gim, ""); // ลบ onclick='...', onload='...' (Single quote)

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  
  const container = doc.querySelector('.preview-chord-1') || doc.body;
  const nodes = Array.from(container.children);

  return nodes.map((node): LineData => {
    // 2. จัดการ Blockquote
    if (node.tagName === 'BLOCKQUOTE') {
      const cleanNode = node.cloneNode(true) as Element;
      // ล้างซ้ำอีกรอบในระดับ Node เพื่อความชัวร์
      const hazardousElements = cleanNode.querySelectorAll('*');
      hazardousElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
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