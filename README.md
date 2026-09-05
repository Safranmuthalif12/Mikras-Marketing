# MIKRAS Marketing

Production-ready MIKRAS Marketing website and admin control room, built with React 19, Vinext, Cloudflare Workers, D1 and R2.

## Included

- Responsive public marketing website matching the approved MIKRAS design
- Animated service cards and detailed service popups
- Animated right-to-left team carousel with profile popups
- Admin-managed members, photos, packages, company details and WhatsApp message
- Real project records with automatic client, completion and satisfaction counters
- Secure contact form with validation, consent, honeypot, origin checks, IP hashing and rate limiting
- Lead inbox with status, private follow-up notes, search, filtering and safe CSV export
- Separate admin email/password login, lockout protection, secure sessions and password change
- One-use, 30-minute forgot-password links delivered through Resend
- Private admin notes
- Optional email alert for every valid contact submission
- GitHub quality workflow for lint, tests and production build verification

## Runtime services

| Binding / variable | Purpose |
| --- | --- |
| `DB` | Cloudflare D1 database |
| `BUCKET` | Cloudflare R2 member-photo storage |
| `ADMIN_EMAILS` | Comma-separated admin login allowlist |
| `ADMIN_SETUP_TOKEN` | One-time secret used only to create the first admin account |
| `RESEND_API_KEY` | Resend delivery secret |
| `EMAIL_FROM` | Verified sender, for example `MIKRAS Marketing <notifications@mikras.lk>` |

Never commit real secret values. Configure them as encrypted Cloudflare runtime secrets/variables.

## Local verification

Requires Node.js 22.13 or later.

```bash
npm ci
npm run db:migrate:local
npm run dev
```

Open `/admin/login`. Local first-time setup also needs `ADMIN_EMAILS` and `ADMIN_SETUP_TOKEN` in the Worker runtime environment.

Run the complete verification suite:

```bash
npm run lint
npm test
```

## Cloudflare production deployment

1. Create a D1 database named `mikras-marketing-db`.
2. Create an R2 bucket named `mikras-marketing-media`.
3. Set the non-secret build values:
   - `MIKRAS_DEPLOY_TARGET=cloudflare`
   - `MIKRAS_D1_DATABASE_ID=<D1 database ID>`
   - `MIKRAS_R2_BUCKET_NAME=mikras-marketing-media`
4. Apply all database migrations before the first production request:

```bash
MIKRAS_D1_DATABASE_ID=<D1 database ID> npm run db:migrate:remote
```

5. Add these encrypted runtime secrets/variables in Cloudflare:
   - `ADMIN_EMAILS`
   - `ADMIN_SETUP_TOKEN`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
6. Build and deploy:

```bash
MIKRAS_D1_DATABASE_ID=<D1 database ID> npm run deploy
```

For Cloudflare Workers Builds, connect the GitHub `main` branch and use:

- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Build variables: the three `MIKRAS_*` values from step 3

The Worker name must remain `mikras-marketing`. After the first deployment, open `/admin/login`, enter the allowlisted admin email and one-time setup token, and create the permanent admin password. Remove or rotate `ADMIN_SETUP_TOKEN` after setup.

## Resend

For initial testing, Resend can send from `onboarding@resend.dev` only to the email associated with the Resend account. For real customer and password-recovery delivery, verify a MIKRAS-owned domain/subdomain and set `EMAIL_FROM` to that verified sender.

## Security notes

- Passwords use salted PBKDF2-SHA256 with 210,000 iterations.
- Session and password-reset tokens are random and only SHA-256 hashes are stored.
- Sessions are `HttpOnly`, `SameSite=Strict`, production `Secure`, and expire after 14 days.
- Five invalid logins lock the account for 15 minutes.
- Password reset links expire after 30 minutes and are single-use.
- Changing the password invalidates every older session.
- Admin writes enforce same-origin checks and an allowlisted authenticated session.
- R2 uploads accept only JPG, PNG, WebP or AVIF up to 5 MB.

## Database changes

When `db/schema.ts` changes:

```bash
npm run db:generate
npm run db:migrate:local
```

Review the generated SQL and apply it remotely before deploying code that depends on it.
