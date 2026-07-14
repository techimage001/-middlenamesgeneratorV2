# Deploy middlenamesgenerator.com via GitHub -> Hostinger

## One-time setup (10 minutes)

### 1. Create the GitHub repo
- github.com -> New repository -> name: `middlenamesgenerator`
- Set it to **Private** -> Create (no README, the repo is complete already)

### 2. Push this folder
From this folder on your PC (Git Bash or terminal):
    git remote add origin git@github.com:YOURUSERNAME/middlenamesgenerator.git
    git push -u origin main
(HTTPS URL works too if you don't use SSH keys with GitHub.)

### 3. Connect Hostinger
- hPanel -> Websites -> middlenamesgenerator.com -> Advanced -> **GIT**
- If the repo is private: copy the SSH key Hostinger shows and add it in
  GitHub -> repo -> Settings -> Deploy keys -> Add key (read-only is fine)
- Repository: git@github.com:YOURUSERNAME/middlenamesgenerator.git
- Branch: main   |   Directory: (leave blank = public_html)
- Click Create, then **Deploy**. Site is live.

### 4. Auto-deploy on every push
- In the same hPanel GIT screen, copy the **Webhook URL**
- GitHub repo -> Settings -> Webhooks -> Add webhook -> paste URL,
  content type application/json, just the push event -> Add

## Weekly workflow from now on
    1. Add/edit a page (e.g. middle-names-amelia.html) + update sitemap.xml
    2. git add -A && git commit -m "Add Amelia hub page"
    3. git push        <- site updates itself within a minute

## Don't forget (same as before)
- SSL + Force HTTPS in hPanel -> Security
- Search Console: verify domain, submit sitemap.xml
- namesthatflow.com 301 redirect (see htaccess-for-namesthatflow.txt)
