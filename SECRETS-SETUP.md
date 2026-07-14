# Secrets setup (do this ONCE, five minutes)

Your passwords and keys now live on the server only, never in git.
That means this repository can be public or private and still leaks
nothing.

## Step 1: create the folder and file in Hostinger

1. hPanel -> Files -> **File Manager**
2. Navigate to:  domains / middlenamesgenerator.com /
   You should see the `public_html` folder here. Do NOT go inside it.
3. If a folder named **mng_private** does not already exist here,
   create it. (It may already exist: it is where the leads database
   is stored.)
4. Go inside `mng_private` and create a new file named exactly:
   **secrets.php**
5. Open SECRETS-TEMPLATE.php from this repo, copy everything in it,
   paste it into secrets.php, and fill in:
     - admin_password       (long, unique)
     - turnstile_site_key   (from dash.cloudflare.com -> Turnstile)
     - turnstile_secret     (same place; fill both or leave both blank)
     - notify_email / from_email
6. Save.

## Step 2: check it works

- Visit https://middlenamesgenerator.com/leads.php and log in with
  your new password.
- Use a tool 4 times, sign up with a real address, confirm the email
  arrives and the link unlocks the site.

## Why this is safer

- Git history is forever. A secret committed once stays recoverable
  even after you delete it or make the repo private.
- `mng_private` sits outside `public_html`, so the web cannot serve
  it and Git deploys never overwrite it.
- config.php in this repo now contains no secrets at all. It just
  reads them from secrets.php at runtime.

## If secrets.php is missing

Nothing breaks: the site runs, Turnstile switches off, and the leads
panel refuses all logins (fails safe rather than open).

## IMPORTANT, once this is live

Your old admin password and Turnstile secret were committed to git and
are considered exposed. Set a NEW password in secrets.php, and rotate
the Turnstile secret at dash.cloudflare.com -> Turnstile -> your widget
-> Settings -> Rotate secret key.
