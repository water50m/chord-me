import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    // ไปที่หน้าค้นหาของ dochord
    await page.goto(`https://www.dochord.com/search/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
    });

    // รอให้ผลลัพธ์ของ Google Custom Search โหลดเสร็จ (สำคัญมากเพราะมันเป็น JS Load)
    try {
        await page.waitForSelector('.gsc-webResult.gsc-result', { timeout: 5000 });
    } catch (e) {
        // ถ้าไม่เจอผลลัพธ์ในเวลาที่กำหนด ให้ return ว่าง
        return NextResponse.json({ results: [] });
    }

    // ดึงข้อมูล
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('.gsc-webResult.gsc-result');
      return Array.from(items).map((item) => {
        const linkEl = item.querySelector('a.gs-title');
        const titleEl = item.querySelector('.gs-title'); // บางที title อยู่ใน text node
        
        const url = linkEl?.getAttribute('href') || '';
        let title = linkEl?.textContent || titleEl?.textContent || 'No Title';
        
        // ล้าง text ขยะ (เช่น "คอร์ดเพลง" หรือ "| dochord.com")
        title = title.replace(/\| dochord\.com/gi, '').trim();

        // กรองเฉพาะลิงก์ที่เป็นเพลง (มีตัวเลข ID หรือรูปแบบที่ถูกต้อง)
        // dochord มักจะเป็น /123456/ หรือ /artist/
        return { title, url };
      }).filter(item => item.url && item.url.includes('dochord.com') && !item.url.includes('/artist/'));
    });

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Puppeteer Search Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}