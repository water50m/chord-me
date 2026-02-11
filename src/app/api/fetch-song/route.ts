import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// บังคับให้เป็น Dynamic route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let browser;
  try {
    // --- ตั้งค่า Browser (Logic เดิมที่เคยทำไว้เพื่อให้รันได้ทั้ง Local/Vercel) ---
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      chromium.setGraphicsMode = false;
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
        ),
        headless: true,
        ignoreHTTPSErrors: true,
      } as any);
    } else {
      const { executablePath } = require('puppeteer');
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: executablePath(),
        headless: true,
      } as any);
    }

    const page = await browser.newPage();

    // ไปที่ URL เป้าหมาย
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // --- ดึงข้อมูล (HTML + Title + Original Key) ในรอบเดียว ---
    const data = await page.evaluate(() => {
      // 1. ดึง HTML เนื้อหา
      let content = '';
      const article = document.querySelector('article');
      if (article) content = article.innerHTML;
      else {
          const main = document.querySelector('#main');
          if (main) content = main.innerHTML;
          else content = document.body.innerHTML;
      }

      // 2. ดึง Title (ชื่อเพลง)
      let title = document.title || 'Untitled';
      const h1 = document.querySelector('h1');
      if (h1) title = h1.innerText.trim();

      // 3. ดึง Original Key (จากโค้ดที่คุณส่งมา)
      let originalKey = null;
      const keyEl = document.querySelector('.single-key__select-label');
      if (keyEl && keyEl.textContent) {
        // ตัดคำว่า "Key " ออก และ trim ช่องว่าง (เช่น "Key Bb" -> "Bb")
        originalKey = keyEl.textContent.replace(/Key/gi, '').trim();
      }

      return { html: content, title, originalKey };
    });

    // ส่งข้อมูลทั้งหมดกลับไป
    return NextResponse.json(data);

  } catch (error) {
    console.error('Puppeteer Fetch Error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}