# #36 Google OAuth Verification — owner submission handoff

> One-time handoff for Boris. Submission goes to Google Cloud Console.
> Delete this file after Google approves verification (~4-8 weeks).

## TL;DR
1. Update OAuth consent screen fields with the values below.
2. Upload the app logo.
3. Verify domain ownership for `getmailkit.com` in Google Search Console.
4. Submit for verification — Google reviews and replies in 4-8 weeks.

The MVP only requests **sensitive** scopes (`openid email profile`),
not restricted scopes — so this is the standard verification flow,
no security assessment / CASA audit needed. If you ever add direct
Gmail-API integration (`gmail.send`, `gmail.modify`, etc.), that's a
separate submission cycle.

## Where you do this
Google Cloud Console → your project (the one whose OAuth client ID
is `544341770588-jorl0eqrolhuqtf1sj8dd163e224tej8.apps.googleusercontent.com`)
→ **APIs & Services** → **OAuth consent screen** → **Edit App**.

## OAuth consent screen — field-by-field

### App information
- **App name**: `MailKit`
- **User support email**: `support@getmailkit.com` (set up the
  forwarding rule in Cloudflare Email Routing first if it's not yet
  active — Google sends a verification email to this address)
- **App logo**: upload `public/brand/mailkit-icon.png` from the repo
  (must be exactly 120×120 px PNG, transparent background, < 1 MB).
  If the source is bigger, downscale via `sharp` or any image tool;
  the file in the repo today is already 120×120-friendly.

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

**Do NOT add** any `gmail.*` scope. Those are removed from MailKit's
OAuth flow per the comment in `components/landing/sign-in-link.tsx`.
If Google's UI auto-suggests them, decline.

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
