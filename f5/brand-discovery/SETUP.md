# Brand Discovery: setup notes

A conversational, multi-page intake form for The Fortune 5 Agency.

```
browser  ──►  discovery.befortune5.com          static files on Vercel (this folder)
   │
   ├─ POST  <supabase>/functions/v1/discovery/upload-url   → signed URL, file goes straight to Storage
   └─ POST  <supabase>/functions/v1/discovery/submit       → saves answers, emails you, emails the submitter
```

## Where things are

| Path | What it is |
| --- | --- |
| `index.html`, `css/`, `js/`, `assets/` | The site. No build step. |
| `js/questions.js` | Every page and question. Edit copy and questions here. |
| `js/config.js` | Backend URLs, booking link, upload limits. |
| `supabase/schema.sql` | The table and the private file bucket. |
| `supabase/functions/discovery/` | The two backend routes (Deno / Supabase Edge Function). |
| `vercel.json` | Security headers. |

## Secrets

Set these once as **Edge Function secrets** in Supabase (Project Settings → Edge Functions → Secrets).
Supabase supplies the database keys itself, so nothing else is needed.

| Name | Example | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` | Sends both emails |
| `FROM_EMAIL` | `The Fortune 5 Agency <hello@befortune5.com>` | Must be on a domain verified in Resend |
| `NOTIFY_TO` | `you@befortune5.com` | Where new submissions land |
| `ALLOWED_ORIGINS` | `https://discovery.befortune5.com` | Sites allowed to call the API (comma separated) |
| `SITE_URL` | `https://discovery.befortune5.com` | Used for the logo in emails (optional) |
| `BOOKING_URL` | `https://brandcraftsman.mambayk.com/book-a-call/` | Button in the confirmation email (optional) |

Until `RESEND_API_KEY` is set, submissions are still saved. The row's `email_errors` column says why no email went out.

## Reading submissions

Supabase → Table Editor → `brand_discovery_submissions`. Each row has the readable answers (`summary`), the raw answers (`data`), and file paths.
Uploaded files are in the private `brand-discovery` bucket, one folder per submission. The email to you carries 7-day download links.

## Previews

On `github.io`, `vercel.app` and `localhost` the form runs in preview mode: the whole flow works, but nothing is sent.
