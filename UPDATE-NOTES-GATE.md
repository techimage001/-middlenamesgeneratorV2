# Middle Names Generator — V5 (the complete package)

ONE upload delivers everything below.

## 1. ZERO-BOT EMAIL COLLECTION (new)
Seven layers, tested end to end. Bots that pass every JavaScript trick
still cannot reach your list, because they cannot click a link in an
inbox they do not own.

  1 honeypot field (bot gets a fake "success")
  2 time trap (submitted in under 3 seconds = bot)
  3 JS-computed token (curl/scripts fail here)
  4 IP rate limit (3 per hour)
  5 validation: format, MX record, disposable-domain blocklist
  6 CLOUDFLARE TURNSTILE (stops headless browsers) <- see setup below
  7 EMAIL VERIFICATION: a one-click confirmation link. Nothing is
    added to your usable list until that link is clicked.

leads.php now shows VERIFIED vs PENDING counts, and the CSV export
contains verified addresses only (?csv=1&all=1 exports everything).

## 2. PREMIUM VISUAL REDESIGN
Depth, elevation and hierarchy across the site: layered shadows, a
warm gradient canvas, glassy sticky header, a gradient-topped tool
card, tactile name pills, and confident typography. Same plum/coral/
cream identity, executed properly.
The gate is now a designed moment: crest icon, perks list, the bold
free guarantee, a proper form, and a "check your inbox" state with a
live spinner while it waits for the click.
New page: verify.php (the confirmation landing page, styled to match).

## 3. TURNSTILE SETUP (optional, free, ONE file to edit)
Turnstile is Cloudflare's free bot check. It is invisible to real
visitors and stops automated browsers before they can submit the form.

  a) Go to https://dash.cloudflare.com -> Turnstile -> Add site
     (free; you do NOT need to move your hosting or DNS)
       Site name:  middlenamesgenerator
       Domain:     middlenamesgenerator.com
       Widget mode: Managed
  b) It shows you TWO keys. Copy them.
  c) Open config.php and paste them into these two lines ONLY:
       define('TURNSTILE_SITE_KEY', 'paste-the-site-key-here');
       define('TURNSTILE_SECRET',   'paste-the-secret-key-here');
  d) Commit and redeploy. That is the whole job.

The pages pick the key up from config.php automatically, so there is
nothing to edit in any HTML file.
Leave both blank and the site still works: you keep the other six
layers, including email verification.

## 4. BEFORE YOU PUSH (required)
  - config.php -> ADMIN_PASSWORD: set a long password
  - hPanel -> Emails -> create leads@middlenamesgenerator.com
    (verification emails are sent from this address by PHP mail())

## 5. AFTER DEPLOY
  - Search Console: submit sitemap.xml (47 URLs)
  - Test: use a tool 4 times -> gate appears -> enter YOUR email ->
    check inbox -> click link -> verify.php confirms -> site unlocks
  - Check /leads.php: your address shows as VERIFIED
  - Tester bypass: ?gatekey=mng-open-sesame | reset: ?gatereset=mng-open-sesame

## Also in this package (from the previous build)
  - 50 pages total (11 new name pages: Lily, Ivy, Florence, Willow,
    Mia, Grace, Arthur, Theodore, Oscar, Henry, Archie)
  - 448 contextual internal links (related-name blocks, reciprocal
    theme links, popular-list strips on tools)
  - "All Free Features" in the header nav + Home in every footer
