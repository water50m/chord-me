import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// บังคับให้เป็น Dynamic route (แก้ปัญหา Vercel ชอบ Cache)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  let browser;
  try {
    // ตรวจสอบว่าเป็น Local หรือ Vercel
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // 🚀 โหมด Vercel (Production)
      // ต้อง config chromium ให้ถูกต้องสำหรับการ์ดจอ server
      chromium.setGraphicsMode = false;

      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: { width: 1280, height: 720 }, // กำหนดเอง ไม่ต้องง้อ chromium.defaultViewport
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
        ),
        headless: true, // บังคับ true
        ignoreHTTPSErrors: true,
      } as any); // <--- ใส่ as any ปิดปาก TypeScript

    } else {
      // 💻 โหมด Local (Development)
      // ใช้ puppeteer ตัวเต็มหา Chrome ในเครื่องให้
      const { executablePath } = require('puppeteer');

      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: executablePath(), // ใช้ Chrome ในเครื่อง
        headless: true,
      } as any);
    }

    const page = await browser.newPage();

    // ตั้งค่า User Agent ให้เหมือนคนจริงๆ (กันโดนบล็อก)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ไปที่หน้าเว็บ
    await page.goto(`https://www.dochord.com/search/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    let results = [];
    try {
      // รอแค่ครั้งเดียว ถ้าไม่มาใน 5 วิ ถือว่าไม่มีข้อมูล
      await page.waitForSelector('.gsc-webResult.gsc-result', { timeout: 5000 });

      // ถ้าผ่านบรรทัดบนมาได้ แปลว่ามีข้อมูลแน่นอน ก็ดึงเลย
      results = await page.evaluate(() => {
        const items = document.querySelectorAll('.gsc-webResult.gsc-result');
        return Array.from(items).map((item) => {
          const linkEl = item.querySelector('a.gs-title');
          const titleEl = item.querySelector('.gs-title');
          const url = linkEl?.getAttribute('href') || '';
          let title = linkEl?.textContent || titleEl?.textContent || 'No Title';
          title = title.replace(/\| dochord\.com/gi, '').trim();
          return { title, url };
        }).filter(item => item.url && item.url.includes('dochord.com') && !item.url.includes('/artist/'));
      });

    } catch (e) {
      // ถ้า timeout หรือหาไม่เจอ
      console.log("No results found");
      return NextResponse.json({ results: [] });
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Puppeteer Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}