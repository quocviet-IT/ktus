import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/sidebar";

export const metadata: Metadata = {
  title: "KTUS — Theo dõi RC",
  description: "Hệ thống quản lý RC, kho & báo cáo — Kế toán US",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
