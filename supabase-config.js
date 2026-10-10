// Shared Supabase project connection details for the landing site's
// self-serve poster uploader (index.html's mosaic-loader.js and admin.html's
// admin.js both read these). This is a dedicated Supabase project, separate
// from the one behind app.keyartdesigner.com, so it has its own free-tier
// storage/compute cap.
//
// The publishable key below is safe to ship in client-side code — it can
// only do what the table/storage Row Level Security policies allow (public
// read, writes only from a signed-in user). It is NOT a secret.
window.SUPABASE_URL = "https://xkpzlgcwwepxxyunrpnc.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DnTRXk_SoLB0lBT5jSnfJw_qOk2Xfpt";
