export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

