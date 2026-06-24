export default function LegendBar() {
  return (
    <div className="flex gap-5 items-center px-6 py-1.5 bg-[#F7FAF5] border-b border-line text-[12px] flex-wrap">
      <span><b className="text-brand">✎</b> Người dùng nhập tay</span>
      <span><b className="text-accent italic">ƒ</b> Tự tính / lấy từ nơi khác</span>
      <span className="text-muted">Đúng như cách file Excel đang hoạt động.</span>
    </div>
  );
}
