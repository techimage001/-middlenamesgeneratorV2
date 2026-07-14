<?php
/* ============================================================
   secrets.php  —  THE ONLY FILE THAT HOLDS YOUR SECRETS
   ------------------------------------------------------------
   Where this file must live (NOT in public_html, NOT in git):

     domains/middlenamesgenerator.com/mng_private/secrets.php

   Git deploys never touch that folder, so this file survives
   every push, every redeploy, and every repo change.

   Fill in the values below, save, done. Nothing else to edit.
   ============================================================ */

return [

    /* Password for https://middlenamesgenerator.com/leads.php
       Make it long. If you leave it blank, the panel stays locked
       and nobody (including you) can log in. */
    'admin_password' => 'PUT-A-LONG-PASSWORD-HERE',

    /* Cloudflare Turnstile keys (dash.cloudflare.com -> Turnstile).
       Fill BOTH or leave BOTH blank. Blank = Turnstile off, and the
       other six anti-bot layers, including email verification, keep
       working normally. */
    'turnstile_site_key' => '',
    'turnstile_secret'   => '',

    /* Where signup notifications go, and what address the
       verification emails are sent from. */
    'notify_email' => 'info@middlenamesgenerator.com',
    'from_email'   => 'info@middlenamesgenerator.com',

];
