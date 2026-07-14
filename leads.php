<?php
/* leads.php — private admin. Login with ADMIN_PASSWORD from config.php. */
require __DIR__ . '/config.php';
session_start();
header('X-Robots-Tag: noindex, nofollow');

if (isset($_POST['pw'])) {
    if (hash_equals(ADMIN_PASSWORD, $_POST['pw'])) $_SESSION['mng_admin'] = true;
    else $err = 'Wrong password.';
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: leads.php'); exit; }
$authed = !empty($_SESSION['mng_admin']);

if ($authed) {
    $db = mng_db();
    if (isset($_POST['delete_id'])) {
        $stmt = $db->prepare('DELETE FROM leads WHERE id = :id');
        $stmt->bindValue(':id', intval($_POST['delete_id'])); $stmt->execute();
        header('Location: leads.php'); exit;
    }
    if (isset($_GET['csv'])) {
        $only = isset($_GET['all']) ? '' : ' WHERE verified = 1';
        header('Content-Type: text/csv'); header('Content-Disposition: attachment; filename=leads-' . gmdate('Y-m-d') . '.csv');
        $out = fopen('php://output', 'w'); fputcsv($out, ['email', 'source', 'created_utc', 'verified']);
        $r = $db->query('SELECT email, source, created, verified FROM leads' . $only . ' ORDER BY id');
        while ($row = $r->fetchArray(SQLITE3_ASSOC)) fputcsv($out, $row);
        exit;
    }
    $total = $db->querySingle('SELECT COUNT(*) FROM leads WHERE verified = 1');
    $pending = $db->querySingle('SELECT COUNT(*) FROM leads WHERE verified = 0');
    $shown = $db->querySingle("SELECT COALESCE(SUM(n),0) FROM events WHERE type='shown'");
    $subs  = $db->querySingle("SELECT COALESCE(SUM(n),0) FROM events WHERE type='submitted'");
    $rate  = $shown ? round($subs / $shown * 100, 1) : 0;
    $rows = [];
    $r = $db->query('SELECT id, email, source, created, verified FROM leads ORDER BY id DESC LIMIT 500');
    while ($row = $r->fetchArray(SQLITE3_ASSOC)) $rows[] = $row;
}
?><!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Leads admin</title>
<style>
body{font-family:system-ui,sans-serif;background:#F7F6FB;color:#26243E;max-width:860px;margin:30px auto;padding:0 18px}
h1{color:#5D4E8C}.stats{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}
.stat{background:#fff;border:1px solid #E4E1F0;border-radius:14px;padding:14px 20px;min-width:130px}
.stat b{font-size:24px;color:#5D4E8C;display:block}.stat span{font-size:12px;color:#55527A}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;font-size:14px}
th{background:#5D4E8C;color:#fff;text-align:left;padding:10px 12px;font-size:12px;text-transform:uppercase}
td{padding:9px 12px;border-top:1px solid #E4E1F0}
.btn{display:inline-block;background:#5D4E8C;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-weight:700;cursor:pointer;text-decoration:none;font-size:14px}
.btn.red{background:#D96B5E;padding:5px 10px;font-size:12px}
input[type=password]{padding:11px 14px;border:1.5px solid #E4E1F0;border-radius:10px;font-size:15px;width:260px}
</style></head><body>
<?php if (!$authed): ?>
<h1>Leads admin</h1>
<form method="post"><p><input type="password" name="pw" placeholder="Admin password" autofocus>
<button class="btn" type="submit">Sign in</button></p>
<?php if (!empty($err)) echo '<p style="color:#D96B5E">' . $err . '</p>'; ?></form>
<?php else: ?>
<h1>Leads <a class="btn" style="float:right" href="?csv=1">Download verified CSV</a></h1>
<div class="stats">
  <div class="stat"><b><?= $total ?></b><span>VERIFIED emails</span></div>
  <div class="stat"><b><?= $pending ?></b><span>pending (link not clicked)</span></div>
  <div class="stat"><b><?= $shown ?></b><span>gates shown</span></div>
  <div class="stat"><b><?= $rate ?>%</b><span>submit rate</span></div>
</div>
<p style="font-size:13px;color:#55527A">Only verified emails are exported. Pending rows are people who entered an address but never clicked the confirmation link, so they never reached your list. <a href="?csv=1&all=1">Export everything anyway</a>.</p>
<table><tr><th>Email</th><th>Status</th><th>Source page</th><th>Date (UTC)</th><th></th></tr>
<?php foreach ($rows as $l): ?>
<tr><td><?= htmlspecialchars($l['email']) ?></td><td><?= ((int)$l['verified'] === 1) ? '<b style="color:#237F56">Verified</b>' : '<span style="color:#B08A3E">Pending</span>' ?></td><td><?= htmlspecialchars($l['source']) ?></td><td><?= $l['created'] ?></td>
<td><form method="post" onsubmit="return confirm('Delete this email permanently?')"><input type="hidden" name="delete_id" value="<?= $l['id'] ?>"><button class="btn red">Delete</button></form></td></tr>
<?php endforeach; ?></table>
<p><a href="?logout=1" style="color:#55527A">Sign out</a></p>
<?php endif; ?>
</body></html>
