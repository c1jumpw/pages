/* ============================================================
   Brand Discovery — CONFIG
   Front-end settings only. Nothing secret belongs here: the
   Resend key and database keys live in Supabase Edge Function secrets.
   ============================================================ */
window.F5_CONFIG = {
  company: 'The Fortune 5 Agency',

  // Where the "Book a call" button on the thank-you screen goes.
  // Same link the main befortune5.com call-to-action uses.
  bookingUrl: 'https://brandcraftsman.mambayk.com/book-a-call/',

  // The two backend routes (a Supabase Edge Function). While these are
  // relative paths that don't exist, the form runs in preview mode.
  endpoints: {
    submit: 'api/submit',
    upload: 'api/upload-url'
  },

  // Upload limits (the server enforces the same values).
  maxFilesPerGroup: 10,
  maxFileMB: 25,
  allowedExt: [
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic', 'tif', 'tiff',
    'pdf', 'ai', 'eps', 'psd', 'indd', 'fig', 'sketch',
    'doc', 'docx', 'ppt', 'pptx', 'key', 'pages', 'xls', 'xlsx', 'csv', 'txt', 'rtf',
    'zip', 'mp4', 'mov', 'mp3', 'wav', 'otf', 'ttf', 'woff', 'woff2'
  ]
};
