import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  try {
    // 1. ดึง HTML มา (เหมือนเดิม)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await res.text();
    
    // 2. โหลด HTML เข้า Cheerio
    const $ = cheerio.load(html);

    // --- ส่วนแกะข้อมูล (Parsing Logic) สำหรับ HTML ชุดนี้ ---

    // A. ดึงชื่อเพลง (Title)
    // จาก HTML: <h1> คอร์ดเพลง<br>มีสิทธิ์อะไร SPF </h1>
    let title = $('h1').first().clone().children().remove().end().text().trim(); 
    // ถ้าวิธีบนไม่เวิร์ค ให้ใช้วิธี Clean Text ธรรมดา
    if (!title || title === 'คอร์ดเพลง') {
        const fullTitle = $('h1').text().replace(/\n/g, ' '); // คอร์ดเพลง มีสิทธิ์อะไร SPF
        title = fullTitle.replace('คอร์ดเพลง', '').replace('SPF', '').trim(); // เหลือแค่ "มีสิทธิ์อะไร"
    }

    // B. ดึงชื่อศิลปิน (Artist)
    // จาก HTML: <a class="single-cover-header-info-desc-item__value-link"> SPF </a>
    const artist = $('.single-cover-header-info-desc-item__value-link').first().text().trim() || "Unknown Artist";

    // C. ดึงคีย์เพลง (Key)
    // จาก HTML: <div class="single-key__select-label">Key D</div>
    let key = $('.single-key__select-label').text().replace('Key', '').trim() || "-";


    // D. ดึงเนื้อหาและแปลงคอร์ด (Content)
    // เป้าหมายคือ div class="single-entry-content-cord"
    const container = $('.single-entry-content-cord');

    if (container.length > 0) {
        // ขั้นตอนที่ 1: แปลง Tag <span class="c_chord">D</span> ให้กลายเป็น Text "[D]"
        // เพื่อให้เวลาดึง .text() ออกมา คอร์ดจะฝังอยู่ในเนื้อร้องเลย
        container.find('.c_chord').each((i, el) => {
            const chordText = $(el).text().trim();
            $(el).replaceWith(`[${chordText}]`);
        });

        // ขั้นตอนที่ 2: จัดการการขึ้นบรรทัดใหม่
        // เนื้อเพลงอยู่ใน <p> หรือ <blockquote>
        // เราจะเติม \n ต่อท้ายทุก paragraph เพื่อให้แยกบรรทัดสวยๆ
        container.find('p, blockquote, div').after('\n');
        container.find('br').replaceWith('\n');

        // ขั้นตอนที่ 3: ดึง Text ทั้งหมดออกมา
        let rawContent = container.text();

        // ขั้นตอนที่ 4: Clean Up ข้อความขยะ
        const content = rawContent
            .split('\n')                  // แยกทีละบรรทัด
            .map(line => line.trim())     // ลบช่องว่างหน้าหลัง
            .filter(line => line && line !== 'HR') // กรองบรรทัดว่างและเส้นคั่นทิ้ง
            .join('\n');                  // รวมกลับด้วยการขึ้นบรรทัดใหม่

        return NextResponse.json({ 
            title, 
            artist, 
            key, 
            content 
        });
    } else {
        return NextResponse.json({ error: 'Content not found', html_preview: html.substring(0, 500) }, { status: 404 });
    }

  } catch (error) {
    console.error('Scrape Error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}