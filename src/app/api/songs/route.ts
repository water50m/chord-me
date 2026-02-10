import { NextResponse } from 'next/server';
import pool from '@/lib/neon';

// 1. ดึงข้อมูล (GET)
export async function GET() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT * FROM songs ORDER BY id DESC');
    client.release();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 2. สร้างเพลงใหม่ (POST)
export async function POST(request: Request) {
  try {
    const { title, html } = await request.json();
    const client = await pool.connect();
    const { rows } = await client.query(
      'INSERT INTO songs (title, html) VALUES ($1, $2) RETURNING *',
      [title, html]
    );
    client.release();
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 3. แก้ไขเพลง (PUT)
export async function PUT(request: Request) {
  try {
    const { id, title, html } = await request.json();
    const client = await pool.connect();
    const { rows } = await client.query(
      'UPDATE songs SET title = $1, html = $2 WHERE id = $3 RETURNING *',
      [title, html, id]
    );
    client.release();
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 4. ลบเพลง (DELETE)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const client = await pool.connect();
    await client.query('DELETE FROM songs WHERE id = $1', [id]);
    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}