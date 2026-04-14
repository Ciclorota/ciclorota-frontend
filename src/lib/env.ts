function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  apiUrl: getRequiredEnv('EXPO_PUBLIC_API_URL'),
};
