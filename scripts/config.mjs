export function publicConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!supabaseUrl && !supabaseKey) return {supabaseUrl:'',supabaseKey:''};
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname))) throw new Error('Supabase URL must use HTTPS or local loopback.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the Supabase project origin without credentials or paths.');
  let valid = supabaseKey.startsWith('sb_publishable_');
  if (!valid) {
    try { valid = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { valid = false; }
  }
  if (!valid) throw new Error('Use a publishable key or an anon JWT. Secret and service_role keys are forbidden.');
  const config = {supabaseUrl:url.origin,supabaseKey};
  if (env.APP_PUBLIC_URL) {
    const app = new URL(env.APP_PUBLIC_URL);
    if (app.protocol !== 'https:' || app.username || app.password || app.pathname !== '/' || app.search || app.hash) throw new Error('APP_PUBLIC_URL must be a public HTTPS origin without credentials or paths.');
    if (['localhost','127.0.0.1','[::1]'].includes(app.hostname)) throw new Error('APP_PUBLIC_URL must not use loopback.');
    config.publicAppUrl = app.origin;
  }
  return config;
}
export const configScript = env => `window.GARANTIATRACK_CONFIG = ${JSON.stringify(publicConfig(env)).replaceAll('<','\\u003c')};\n`;
