<?php
/* ============================================================
   Middle Names Generator — lead collector configuration
   EDIT THE VALUES BELOW BEFORE DEPLOY, then never share them.
   ============================================================ */

/* 1. Admin password for leads.php (change this!) */
define('ADMIN_PASSWORD', 'April7051@April7051@');

/* 2. Where signup notifications are sent (create in hPanel -> Emails) */
define('NOTIFY_EMAIL', 'info@middlenamesgenerator.com');
define('FROM_EMAIL',   'info@middlenamesgenerator.com');

/* 3. Site URL (used to build verification links) */
define('SITE_URL', 'https://middlenamesgenerator.com');
define('SITE_NAME', 'Middle Names Generator');

/* 4. CLOUDFLARE TURNSTILE (free, invisible bot protection)
      Get keys: dash.cloudflare.com -> Turnstile -> Add site
      (free, no Cloudflare hosting needed, works on any domain)
      Leave BOTH blank to disable (not recommended). */
define('TURNSTILE_SITE_KEY', '');   /* public key, safe in HTML */
define('TURNSTILE_SECRET',   '');   /* secret key, server only  */

/* 5. Email verification: link must be clicked before unlock.
      This is what guarantees a zero-bot list. Keep true. */
define('REQUIRE_VERIFICATION', true);
define('VERIFY_EXPIRY_HOURS', 48);

/* ---- No edits needed below ---- */

function mng_db_path() {
    $above = dirname($_SERVER['DOCUMENT_ROOT']) . '/mng_private';
    if (is_dir($above) || @mkdir($above, 0700, true)) {
        if (is_writable($above)) return $above . '/leads-x7k2.sqlite';
    }
    $inside = __DIR__ . '/_private';
    if (!is_dir($inside)) {
        @mkdir($inside, 0700, true);
        @file_put_contents($inside . '/.htaccess', "Require all denied\nDeny from all\n");
        @file_put_contents($inside . '/index.html', '');
    }
    return $inside . '/leads-x7k2.sqlite';
}

function mng_db() {
    $db = new SQLite3(mng_db_path());
    $db->busyTimeout(3000);
    $db->exec('CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        source TEXT, created TEXT, ip_hash TEXT,
        verified INTEGER DEFAULT 0,
        token TEXT, token_created TEXT, verified_at TEXT)');
    $cols = [];
    $r = $db->query("PRAGMA table_info(leads)");
    while ($row = $r->fetchArray(SQLITE3_ASSOC)) $cols[] = $row['name'];
    foreach ([['verified','INTEGER DEFAULT 0'],['token','TEXT'],['token_created','TEXT'],['verified_at','TEXT']] as $c) {
        if (!in_array($c[0], $cols, true)) @$db->exec("ALTER TABLE leads ADD COLUMN {$c[0]} {$c[1]}");
    }
    $db->exec('CREATE TABLE IF NOT EXISTS events (
        day TEXT, type TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (day, type))');
    $db->exec('CREATE TABLE IF NOT EXISTS rate (
        ip_hash TEXT, hour TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (ip_hash, hour))');
    return $db;
}

function mng_event($db, $type) {
    $stmt = $db->prepare('INSERT INTO events (day, type, n) VALUES (:d, :t, 1)
        ON CONFLICT(day, type) DO UPDATE SET n = n + 1');
    $stmt->bindValue(':d', gmdate('Y-m-d'));
    $stmt->bindValue(':t', $type);
    $stmt->execute();
}

function mng_ip_hash() {
    return substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'mng-salt-2026'), 0, 16);
}

/* Verify a Cloudflare Turnstile token. True if disabled or valid. */
function mng_turnstile_ok($token) {
    if (TURNSTILE_SECRET === '') return true;
    if (!$token) return false;
    $post = http_build_query([
        'secret'   => TURNSTILE_SECRET,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ]);
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $post,
        'timeout' => 5,
    ]]);
    $res = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx);
    if ($res === false) return true; /* fail-open if Cloudflare unreachable */
    $json = json_decode($res, true);
    return !empty($json['success']);
}
