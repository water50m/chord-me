import SongViewer from '@/components/songViewer';

export const metadata = {
  title: 'Neon Lyrics Parser',
  description: 'แปลงโค้ด HTML เนื้อเพลงเป็นคอร์ดกีตาร์แบบ Neon Style',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* เรียกใช้ Component หลัก
        ตัว Component SongViewer จะจัดการหน้าตา (UI) และช่อง Input ทั้งหมดเอง 
      */}
      <SongViewer />
    </main>
  );
}