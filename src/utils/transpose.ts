// src/utils/transpose.ts

const SCALES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: { [key: string]: string } = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

// แปลงคอร์ดให้เป็น format มาตรฐาน (C#)
function normalizeNote(note: string) {
  return FLATS[note] || note;
}

// หาคอร์ดจาก HTML (Regex)
const CHORD_REGEX = /\b[A-G][b#]?(?:m|maj|dim|aug|sus|add)?(?:7|9|11|13)?(?:\/[A-G][b#]?)?\b/g;

// ฟังก์ชันหาคีย์ต้นฉบับ (เดาจากคอร์ดแรกที่เจอ)
export function detectKey(html: string): string {
  const match = html.match(CHORD_REGEX);
  if (match && match.length > 0) {
    // เอาตัวแรก ตัดพวก m, 7 ออก ให้เหลือแค่ตัวโน้ตหลัก (เช่น Am7 -> A)
    const root = match[0].match(/^[A-G][b#]?/); 
    return root ? normalizeNote(root[0]) : 'C';
  }
  return 'C'; // หาไม่เจอให้เป็น C
}

// ฟังก์ชันเปลี่ยนคอร์ด (transpose)
export function transposeChord(chord: string, semitones: number): string {
  // แยก Root Note ออกจากหาง (เช่น "Am7" -> root="A", suffix="m7")
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  let root = normalizeNote(match[1]);
  const suffix = match[2];

  // หาตำแหน่งเดิม
  const index = SCALES.indexOf(root);
  if (index === -1) return chord;

  // หาตำแหน่งใหม่ (วนลูป 12 ตัวโน้ต)
  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return SCALES[newIndex] + suffix;
}

// ฟังก์ชันหลัก: เปลี่ยน HTML ทั้งก้อน
export function transposeHtml(html: string, originalKey: string, targetKey: string): string {
  if (!originalKey || !targetKey || originalKey === targetKey) return html;

  const originalIndex = SCALES.indexOf(normalizeNote(originalKey));
  const targetIndex = SCALES.indexOf(normalizeNote(targetKey));
  
  if (originalIndex === -1 || targetIndex === -1) return html;

  const semitones = targetIndex - originalIndex;

  // แทนที่คอร์ดทั้งหมดใน HTML (ระวังอย่าไปแก้ชื่อ tag html)
  // เราจะใช้ callback function ใน replace เพื่อคำนวณทีละตัว
  return html.replace(CHORD_REGEX, (chord) => transposeChord(chord, semitones));
}