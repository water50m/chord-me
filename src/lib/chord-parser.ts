export interface ParsedLine {
  type: 'chord-line' | 'text-with-chords' | 'plain-text';
  content: string | { chords: string; text: string }[];
}

// 1. จัดการส่วนที่เป็น Intro / Instru (ใน blockquote)
export const parseBlockquote = (htmlContent: string) => {
  // ฟังก์ชันนี้จะส่งคืน HTML ดั้งเดิมหรือปรับแต่งเฉพาะส่วน Intro
  return `<div class="bg-gray-100 p-4 rounded-lg my-4 italic text-pink-600">${htmlContent}</div>`;
};

// 2. จัดการเนื้อเพลงที่มี chord แทรก (นอก blockquote)
export const parseLyricsLine = (lineHtml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(lineHtml, 'text/html');
  const pElement = doc.querySelector('p');
  
  if (!pElement) return null;

  const result: { chord: string; text: string }[] = [];
  let currentText = "";
  
  // วนลูปโหนดลูกเพื่อแยก text และ span.c_chord
  pElement.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      currentText += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains('c_chord')) {
        // เก็บสะสมข้อความก่อนหน้า และคอร์ดที่เจอ
        result.push({ chord: el.innerText, text: currentText });
        currentText = ""; // reset text เพื่อรอเก็บข้อความหลังคอร์ด
      }
    }
  });
  
  // เก็บข้อความส่วนสุดท้ายที่เหลือ
  result.push({ chord: "", text: currentText });

  return result;
};