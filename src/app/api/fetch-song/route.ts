import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // ดึงเฉพาะส่วนเนื้อหาหลัก (Usually inside <article> or #main)
    // จาก HTML ตัวอย่าง คอร์ดมักอยู่ใน .entry-content หรือ #post-...
    const content = await page.evaluate(() => {
      // พยายามหา container ที่ตรงที่สุด
      const article = document.querySelector('article');
      if (article) return article.innerHTML;
      
      const main = document.querySelector('#main');
      if (main) return main.innerHTML;

      return document.body.innerHTML;
    });

    return NextResponse.json({ html: content });

  } catch (error) {
    console.error('Puppeteer Fetch Error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}