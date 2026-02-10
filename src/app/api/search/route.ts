import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  let browser;
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // 🟢 กรณี Vercel (Production)
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: { width: 1280, height: 720 }, // กำหนดขนาดจอเอง แก้ error defaultViewport
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'),
        headless: true, // บังคับ true ไปเลย
        // ignoreHTTPSErrors: true,
      });
    } else {
      // 🟡 กรณี Local (Development)
      // ต้องมั่นใจว่าในเครื่องมี Google Chrome ติดตั้งอยู่
      // หรือ npm install puppeteer (ตัวเต็ม) ไว้ใน devDependencies
      
      // หา Path ของ Chrome ในเครื่อง (Windows/Mac/Linux)
      const platform = process.platform;
      let executablePath = '';

      if (platform === 'win32') {
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // Path Windows ทั่วไป
      } else if (platform === 'darwin') {
        executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // Path Mac
      } else {
        executablePath = '/usr/bin/google-chrome'; // Path Linux
      }

      // ถ้าหาไม่เจอ ให้ลองใช้ puppeteer ตัวเต็มช่วยหา (ถ้าลงไว้)
      try {
        const localPuppeteer = require('puppeteer');
        executablePath = localPuppeteer.executablePath();
      } catch (e) {
        // ถ้าไม่มี puppeteer ตัวเต็ม ให้ใช้ hardcoded path ด้านบน
        console.log('Using Hardcoded Chrome Path:', executablePath);
      }

      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: executablePath, 
        headless: true,
      });
    }
    const page = await browser.newPage();

    // ไปที่หน้าค้นหา
    await page.goto(`https://www.dochord.com/search/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
      timeout: 15000 // เพิ่ม Timeout เผื่อเน็ตช้า
    });
    // รอผลลัพธ์
    try {
        await page.waitForSelector('.gsc-webResult.gsc-result', { timeout: 5000 });
    } catch (e) {
        return NextResponse.json({ results: [] });
    }

    // ดึงข้อมูล
    const results = await page.evaluate(() => {
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

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Puppeteer Search Error:', error);
    // ส่ง error กลับไปดูว่าพังเพราะอะไร
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}