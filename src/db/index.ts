import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Drizzle client cho Supabase Postgres. Chỉ dùng khi USE_DB=true & có DATABASE_URL.
const url = process.env.DATABASE_URL;
const client = url ? postgres(url, { prepare: false }) : null;

export const db = client ? drizzle(client, { schema }) : (null as any);
export { schema };
