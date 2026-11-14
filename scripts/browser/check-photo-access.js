/* global prompt */
// Paste this definition into the published app's DevTools console, then call
// await checkPrivatePhotoAccess(). Use only the known fictional test photo.
async function checkPrivatePhotoAccess(loadSdk = () => import('/vendor/supabase.js')) {
  let stage = 'page';
  try {
    const config = window.GARANTIATRACK_CONFIG;
    if (location.origin !== 'https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site' || config?.supabaseUrl !== 'https://rtfhogdqsxlqfwvzisoo.supabase.co') throw new Error();
    if (!document.querySelector('[data-workspace="connected"], .topbar .demo-pill')) throw new Error();
    const legacyPill = document.querySelector('.topbar .demo-pill');
    if (legacyPill && legacyPill.textContent.trim() !== 'MI TALLER') throw new Error();
    stage = 'input';
    const path = prompt('Paste the fictional photo object path locally, not a signed URL.');
    if (path === null) return { result: 'CANCELLED' };
    const photoPath = path.trim();
    if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/.test(photoPath)) throw new Error();
    stage = 'session';
    const { createClient } = await loadSdk();
    const client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data?.user) throw new Error();
    stage = 'membership';
    const membership = await client.from('workshop_members').select('workshop_id')
      .eq('workshop_id', photoPath.split('/')[0]).eq('user_id', identity.data.user.id).maybeSingle();
    if (membership.error) throw new Error();
    const member = Boolean(membership.data);
    stage = 'storage';
    const bucket = client.storage.from('repair-photos');
    const download = await bucket.download(photoPath);
    const signed = await bucket.createSignedUrl(photoPath, 60);
    const denial = response => Boolean(response.error && [400, 403, 404].includes(Number(response.error.status)));
    const uncertain = [download, signed].some(response => response.error && !denial(response));
    const downloadReturnedData = Boolean(download.data);
    const signedUrlIssued = Boolean(signed.data?.signedUrl);
    const passed = member
      ? !download.error && download.data?.size > 0 && !signed.error && signedUrlIssued
      : denial(download) && denial(signed) && !downloadReturnedData && !signedUrlIssued;
    const summary = {
      context: member ? 'owner' : 'nonmember', authenticated: true,
      downloadStatus: download.error ? Number(download.error.status) || 0 : 200,
      downloadReturnedData, signingStatus: signed.error ? Number(signed.error.status) || 0 : 200,
      signedUrlIssued, result: uncertain ? 'INCONCLUSIVE' : passed ? 'PASS' : 'FAIL'
    };
    console.table([summary]);
    return summary;
  } catch {
    const summary = { result: 'STOPPED', stage };
    console.table([summary]);
    return summary;
  }
}
