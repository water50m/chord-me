import { NextResponse } from 'next/server';
import pool from '@/lib/neon';

// 2. สร้างเพลงใหม่ (POST) - 🔥 จุดสำคัญที่ต้องแก้
export async function POST(request: Request) {
  try {
    const { title, html, key, type, color } = await request.json(); // ✅ รับ color มาด้วย
    const client = await pool.connect();
    
    // ✅ เพิ่ม color ในคำสั่ง INSERT
    const { rows } = await client.query(
      `INSERT INTO songs (title, html, original_key, user_key, type, color) 
       VALUES ($1, $2, $3, $3, $4, $5) 
       RETURNING *`,
      [title, html, key || 'C', type || 'song', color || null] // ส่งค่า color เข้าไป
    );
    
    client.release();
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 3. แก้ไขเพลง (PUT) - สำหรับตอน User กด Save Key ใหม่
// api/songs/route.ts (ส่วน PUT)
export async function PUT(request: Request) {
  try {
    const { id, title, html, original_key, user_key } = await request.json();
    const client = await pool.connect();

    const { rows } = await client.query(
      `UPDATE songs 
       SET title = $1, 
           html = $2, 
           original_key = COALESCE($3, original_key), 
           user_key = COALESCE($4, user_key) 
       WHERE id = $5 
       RETURNING *`,
      [title, html, original_key, user_key, id]
    );
    
    client.release();
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 4. ลบเพลง (DELETE) - เหมือนเดิม
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

// 1. แก้ไข GET ให้เรียงตาม order_index
export async function GET() {
  try {
    const client = await pool.connect();
    // ✅ มั่นใจว่าดึงทุก column รวมถึง color
    const { rows } = await client.query('SELECT * FROM songs ORDER BY order_index ASC, id DESC');
    client.release();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 2. เพิ่มฟังก์ชันสำหรับบันทึกลำดับเพลงใหม่ (Reorder)
export async function PATCH(request: Request) {
  try {
    const { sortedIds } = await request.json(); // รับอาเรย์ของ ID ที่เรียงแล้ว เช่น [5, 3, 8]
    const client = await pool.connect();
    
    // อัปเดต order_index ของแต่ละเพลงตามลำดับในอาเรย์
    for (let i = 0; i < sortedIds.length; i++) {
      await client.query('UPDATE songs SET order_index = $1 WHERE id = $2', [i, sortedIds[i]]);
    }
    
    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}