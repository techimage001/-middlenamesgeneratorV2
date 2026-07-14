<?php
/* subscribe.php — gate signups. Layers:
   1 honeypot  2 time trap  3 JS token  4 IP rate limit
   5 validation/MX/disposable  6 CLOUDFLARE TURNSTILE
   7 EMAIL VERIFICATION (the link must be clicked) */
require __DIR__ . '/config.php';
header('Content-Type: application/json');
header('X-Robots-Tag: noindex');

function out($ok, $extra = []) { echo json_encode(array_merge(['ok' => $ok], $extra)); exit; }

try {
    $db = mng_db();

    if (isset($_GET['event']) && in_array($_GET['event'], ['shown','unlocked_view'], true)) {
        mng_event($db, $_GET['event']); out(true);
    }

    /* Public site key for the gate (safe to expose; the secret never leaves the server) */
    if (isset($_GET['config'])) {
        out(true, ['turnstile' => TURNSTILE_SITE_KEY]);
    }

    /* Poll: has this email been verified yet? (gate.js checks while user waits) */
    if (isset($_GET['status'])) {
        $e = strtolower(trim($_GET['status']));
        $stmt = $db->prepare('SELECT verified FROM leads WHERE email = :e');
        $stmt->bindValue(':e', $e);
        $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        out(true, ['verified' => $row ? (int)$row['verified'] : 0]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(true);
    $raw = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    /* 1 honeypot */
    if (!empty($raw['website'])) out(true, ['sent' => true]);          /* lie to the bot */
    /* 2 time trap */
    $t = intval($raw['t'] ?? 0);
    if ($t <= 0 || (time() - $t) < 3) out(true, ['sent' => true]);
    /* 3 JS token */
    $tok = $raw['tok'] ?? '';
    if ($tok !== substr(hash('sha256', $t . '|mng-gate-2026'), 0, 12)) out(true, ['sent' => true]);
    /* 6 Turnstile (blocks headless browsers that pass 1-3) */
    if (!mng_turnstile_ok($raw['cf'] ?? '')) out(false, ['msg' => 'The human check did not complete. Please wait for the checkbox above to finish, then try again.']);

    /* 4 rate limit */
    $ip = mng_ip_hash(); $hour = gmdate('Y-m-d-H');
    $stmt = $db->prepare('INSERT INTO rate (ip_hash, hour, n) VALUES (:i, :h, 1)
        ON CONFLICT(ip_hash, hour) DO UPDATE SET n = n + 1');
    $stmt->bindValue(':i', $ip); $stmt->bindValue(':h', $hour); $stmt->execute();
    $n = $db->querySingle("SELECT n FROM rate WHERE ip_hash = '$ip' AND hour = '$hour'");
    if ($n > 3) out(true, ['sent' => true]);

    /* 5 validation */
    $email = strtolower(trim($raw['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(false, ['msg' => 'That email does not look right.']);
    $domain = substr(strrchr($email, '@'), 1);
    $disposable = ['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','sharklasers.com','trashmail.com','getnada.com','maildrop.cc','dispostable.com','fakeinbox.com','throwawaymail.com','mohmal.com'];
    if (in_array($domain, $disposable, true)) out(false, ['msg' => 'Please use a real, lasting email address.']);
    if (!checkdnsrr($domain, 'MX') && !checkdnsrr($domain, 'A')) out(false, ['msg' => 'That email domain does not exist.']);

    $source = preg_replace('/[^a-z0-9\-\.\/]/i', '', substr($raw['source'] ?? '', 0, 80));

    /* Already verified? unlock straight away (returning user, new device) */
    $stmt = $db->prepare('SELECT verified FROM leads WHERE email = :e');
    $stmt->bindValue(':e', $email);
    $ex = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    if ($ex && (int)$ex['verified'] === 1) out(true, ['unlock' => true, 'msg' => 'Welcome back, unlocked.']);

    if (!REQUIRE_VERIFICATION) {
        $stmt = $db->prepare('INSERT OR IGNORE INTO leads (email, source, created, ip_hash, verified, verified_at)
            VALUES (:e, :s, :c, :i, 1, :c)');
        $stmt->bindValue(':e', $email); $stmt->bindValue(':s', $source);
        $stmt->bindValue(':c', gmdate('Y-m-d H:i:s')); $stmt->bindValue(':i', $ip);
        $stmt->execute();
        mng_event($db, 'submitted');
        @mail(NOTIFY_EMAIL, 'New signup: ' . $email, "Email: $email\nPage: $source\n", 'From: ' . FROM_EMAIL);
        out(true, ['unlock' => true]);
    }

    /* 7 email verification: store pending + send the link */
    $token = bin2hex(random_bytes(16));
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $db->prepare('INSERT INTO leads (email, source, created, ip_hash, verified, token, token_created)
        VALUES (:e, :s, :c, :i, 0, :t, :c)
        ON CONFLICT(email) DO UPDATE SET token = :t, token_created = :c, source = :s');
    $stmt->bindValue(':e', $email); $stmt->bindValue(':s', $source);
    $stmt->bindValue(':c', $now); $stmt->bindValue(':i', $ip); $stmt->bindValue(':t', $token);
    $stmt->execute();
    mng_event($db, 'submitted');

    $link = SITE_URL . '/verify.php?t=' . $token;
    $subject = 'Confirm your email to unlock ' . SITE_NAME;
    $body = "Thanks for signing up to " . SITE_NAME . ".\n\n"
          . "Click the link below to confirm your email and unlock every tool, free:\n\n"
          . $link . "\n\n"
          . "The link works for " . VERIFY_EXPIRY_HOURS . " hours. If you did not request this, ignore this email and nothing happens.\n\n"
          . SITE_URL . "\n";
    $headers = 'From: ' . SITE_NAME . ' <' . FROM_EMAIL . ">\r\n"
             . "Reply-To: " . FROM_EMAIL . "\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail($email, $subject, $body, $headers);

    out(true, ['sent' => true, 'email' => $email]);
} catch (Throwable $e) {
    /* Fail-open on server errors, but NEVER auto-verify: ask them to retry */
    out(true, ['sent' => true]);
}
