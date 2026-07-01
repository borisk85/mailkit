# #36 Google OAuth Verification — owner submission handoff

> Delete this file after Google approves verification.

## Current status (2026-07-01) — SUBMITTED, awaiting Google review
Branding filled, logo uploaded, scopes trimmed, app published to
production, and submitted for **brand verification** via the new
**Google Auth Platform** UI. Nothing more to do here until Google
replies. What's still pending / true right now:

- The consent screen still shows `gpjywdybynysjqphbykq.supabase.co`
  and keeps showing it **until Google approves the brand
  verification**. On approval it flips to `to continue to MailKit`
  + the logo. This is async (Google's review queue), NOT instant —
  recreating the client / pasting into Supabase does not change it.
- Scope verification is **not required**: MailKit requests only the
  three **non-sensitive** scopes (`openid`, `userinfo.email`,
  `userinfo.profile`). The verification in flight is brand-only
  (triggered by uploading a logo), not a sensitive/restricted-scope
  security review. No CASA audit, no 4–8-week sensitive-scope cycle.
- Same-day alternative if the string must go now: a paid **Supabase
  custom domain** (`auth.getmailkit.com`) replaces it immediately,
  independent of Google verification.

## The OAuth client (recreated 2026-07-01)
The original `mailkit-web` client lost its secret, so a fresh Web
client was created in Google Cloud project **`mailkit-mvp`**:

- **Client ID**: `544341770588-r27gv9g6ba7c8i21u22is3slfp4ldu04.apps.googleusercontent.com`
- **Secret + redirect URI**: kept in the `reference-google-oauth-creds` memory.
- Client ID + Secret are pasted into Supabase → Auth → Providers → Google.
- The old `mailkit-web` (`…jorl…`) can be deleted now that Supabase
  points at the new client. Do NOT delete `mailkit-dev` (`…23ti…`,
  Desktop) — it's the local feasibility spike's `GMAIL_CLIENT_ID`.

Console lives under **Google Auth Platform** (left nav: Branding /
Data Access / Audience / Verification Center) — NOT the old
`APIs & Services → OAuth consent screen → Edit App` path.

## OAuth consent screen — field-by-field

### App information
- **App name**: `MailKit`
- **User support email**: `bkomarov85@gmail.com` (Google's dropdown
  only offers addresses linked to the account; the `support@` alias
  isn't selectable there, and gmail is valid for this field)
- **App logo**: `public/brand/mailkit-icon-120.png` — already exactly
  120×120 px (downscaled from the 256×256 source 2026-07-01), < 1 MB.
  This is the file uploaded to Branding.

### App domain
- **Application home page**: `https://getmailkit.com`
- **Application privacy policy link**: `https://getmailkit.com/en/privacy`
- **Application terms of service link**: `https://getmailkit.com/en/terms`

### Authorized domains
Add: `getmailkit.com` (just the apex; subdomains inherit).
Also add: `mailkit-ten.vercel.app` so dev preview redirects keep
working until DNS cutover.

### Developer contact information
- **Email addresses**: `bkomarov85@gmail.com` (your Google account)

## Scopes panel — what to declare

Click **Add or Remove Scopes** and pick exactly these three:

| Scope | Reason | User-facing description |
|---|---|---|
| `openid` | Required for OIDC sign-in | (auto-filled by Google) |
| `.../auth/userinfo.email` | Identify the buyer's account by email; correlate to their MailKit purchase | "See your primary Google Account email address" |
| `.../auth/userinfo.profile` | Display name + avatar in the dashboard greeting | "See your personal info, including any personal info you've made publicly available" |

**Do NOT add** any `gmail.*` scope. On 2026-07-01 the leftover
`gmail.send / modify / readonly / settings.basic / settings.sharing`
scopes (inherited from the old feasibility spike) were deleted in
Data Access, leaving only the three above. If Google's UI
auto-suggests them, decline.

### Why each scope is needed (paste into the justification field)

When Google's verification flow asks for "How will the requested
scopes be used in your app?", paste this for each:

**`openid`**:
> Used as part of the OpenID Connect base flow to identify the
> signed-in user. We do not access any Google API data with this
> scope beyond the identity assertion.

**`userinfo.email`**:
> We use the email address to identify the user's MailKit account
> across sessions. The email also lets us link an unauthenticated
> Lemon Squeezy purchase (made before sign-in) to the user's
> dashboard once they sign in for the first time. We do not
> contact this address for marketing.

**`userinfo.profile`**:
> We display the user's name and profile picture in the dashboard
> greeting ("Welcome back, {name}") so the user sees a personal
> sign of life. We do not store the profile picture beyond the
> URL Google returns; it's loaded directly from Google's CDN at
> render time.

## Demo video brief (5-10 minutes)

Google asks for a demo video that shows the OAuth consent screen
and the user-facing flow. Record this in OBS or QuickTime, upload
unlisted to YouTube, paste the link in the verification form.

**Script** (you can read from this verbatim):
1. Show the landing page at `https://getmailkit.com/en` for ~5 seconds
   so the brand and home page are clear.
2. Click **Sign in** in the top-right header.
3. Google OAuth consent screen opens. Stay on it for ~10 seconds —
   Google reviewers want to see the consent screen renders the
   "MailKit wants to access your Google Account" text with the
   three scopes. Read the scope list aloud: "It's asking for my
   email address and basic profile info."
4. Click **Allow**.
5. The browser redirects to `https://getmailkit.com/en/app` —
   the dashboard. Show the greeting "Welcome back, {your name}"
   so the reviewer sees the profile data is used as described.
6. Optional: open the **Account** card on the dashboard, show the
   email field with your address, narrate "MailKit shows my email
   here so I can confirm which Google account I signed in with."
7. End the video.

The video does NOT need to show purchase or setup — Google only
verifies what the OAuth scopes do. Keep it focused on sign-in →
dashboard.

## Privacy + Terms pre-flight

Both pages must be reachable on the public domain before Google
approves. As of today they live on `https://mailkit-ten.vercel.app/{locale}/{terms,privacy}`
and (after DNS cutover) `https://getmailkit.com/{locale}/{terms,privacy}`.

The Privacy Policy section 11 is wording-locked to the Google API
Services User Data Policy (see `lib/legal/privacy.ts` header
comment). Reviewers fuzzy-match it during verification — don't
edit that section.

## Submit + wait

After all fields are filled:
1. Bottom of the OAuth consent screen → **Save and Continue**
2. Scopes panel → confirm 3 scopes → **Save and Continue**
3. Test users: leave empty (we're going to public)
4. Summary → **Back to Dashboard**
5. **Publish App** → switch app status from Testing to Production
6. Google prompts: "Your app needs verification" → **Submit for verification**
7. Fill the verification form (Google walks you through scope
   justifications + demo video upload + domain verification proof)
8. Submit. Google replies via email within 4-8 weeks.

If they ask for changes: respond within 30 days or the submission
expires and you start over.

## After approval — delete this file

Once Google's email confirms verified status, drop this handoff:
```bash
git rm docs/TICKET_36_OAUTH_SUBMISSION.md
git commit -m "chore: remove #36 OAuth submission handoff (verified)"
```
