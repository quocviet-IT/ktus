export default function Loading() {
  return (
    <div className="nav-progress nav-progress--route" aria-label="Đang tải trang" role="status">
      <div className="nav-progress__bar" />
      <div className="nav-progress__pill">
        <span className="nav-progress__spinner" />
      </div>
    </div>
  );
}
