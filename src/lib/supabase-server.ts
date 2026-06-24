import { createClient } from "@supabase/supabase-js";

// Client phía server cho truy vấn dữ liệu (RLS cho 'anon' ở GĐ1).
// Nếu có SUPABASE_SERVICE_ROLE_KEY sẽ ưu tiên dùng (bypass RLS, chỉ chạy server).
export function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}
