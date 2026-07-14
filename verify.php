<?php
/* verify.php — the link in the email lands here.
   Marks the lead verified, then unlocks this browser via localStorage. */
require __DIR__ . '/config.php';
header('X-Robots-Tag: noindex, nofollow');

$ok = false; $msg = 'That link is not valid.'; $email = '';
try {
    $token = preg_replace('/[^a-f0-9]/', '', $_GET['t'] ?? '');
    if (strlen($token) === 32) {
        $db = mng_db();
        $stmt = $db->prepare('SELECT id, email, verified, token_created FROM leads WHERE token = :t');
        $stmt->bindValue(':t', $token);
        $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        if ($row) {
            $age = time() - strtotime($row['token_created'] . ' UTC');
            if ($age > VERIFY_EXPIRY_HOURS * 3600) {
                $msg = 'That link has expired. Please request a new one from the site.';
            } else {
                $email = $row['email'];
                if ((int)$row['verified'] !== 1) {
                    $u = $db->prepare('UPDATE leads SET verified = 1, verified_at = :n, token = NULL WHERE id = :id');
                    $u->bindValue(':n', gmdate('Y-m-d H:i:s')); $u->bindValue(':id', $row['id']); $u->execute();
                    mng_event($db, 'verified');
                    @mail(NOTIFY_EMAIL, 'Verified signup: ' . $email,
                          "Confirmed email: $email\nWhen: " . gmdate('Y-m-d H:i:s') . " UTC\n",
                          'From: ' . FROM_EMAIL);
                }
                $ok = true;
            }
        }
    }
} catch (Throwable $e) { $msg = 'Something went wrong. Please try the link again.'; }
?><!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title><?= $ok ? 'Email confirmed' : 'Link problem' ?> | <?= htmlspecialchars(SITE_NAME) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;700;800&family=Nunito+Sans:wght@400;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css?v=9">
<link rel="icon" href="icon.svg" type="image/svg+xml">
</head><body>
<main>
<div class="wrap narrow" style="padding:70px 0 90px;">
  <div class="gate-card" style="max-width:560px;margin:0 auto;">
    <div class="gate-crest"><?= $ok ? '✓' : '✕' ?></div>
    <?php if ($ok): ?>
      <p class="gate-kicker">Email confirmed</p>
      <h3>You're in. Everything is unlocked.</h3>
      <p class="gate-sub">Thanks for confirming <strong><?= htmlspecialchars($email) ?></strong>. Every tool on the site is now yours, unlimited and free, on this device.</p>
      <a class="btn coral" id="goBtn" href="index.html">Start naming</a>
      <p class="gate-consent">You can unsubscribe from any email we send, and ask us to delete your address at any time via the <a href="contact.html">contact page</a>.</p>
    <?php else: ?>
      <p class="gate-kicker">Link problem</p>
      <h3>We couldn't confirm that link</h3>
      <p class="gate-sub"><?= htmlspecialchars($msg) ?></p>
      <a class="btn" href="index.html">Back to the generator</a>
    <?php endif; ?>
  </div>
</div>
</main>
<?php if ($ok): ?>
<script>
  try {
    localStorage.setItem("mng_unlocked", "1");
    localStorage.setItem("mng_email", <?= json_encode($email) ?>);
  } catch (e) {}
</script>
<?php endif; ?>
</body></html>
