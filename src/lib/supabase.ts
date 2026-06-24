import { createBrowserClient } from "@supabase/ssr";

// Client phía trình duyệt (Auth). Dùng khi tích hợp đăng nhập thật.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
