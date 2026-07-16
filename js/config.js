// Global namespace for the whole app. Plain <script> tags (not type="module")
// on purpose — this dashboard is meant to be opened straight from disk
// (file://), and Chrome refuses to load ES modules over file://. Every file
// below just attaches to `App` in script-tag order; see index.html/login.html
// for that order.
window.App = window.App || {};

// Same project credentials as the Flutter app (lib/core/config/supabase_config.dart).
// The publishable/anon key is safe to expose client-side — access here is
// enforced by the is_admin check inside each dashboard_* RPC in
// game/supabase/dashboard.sql, not by keeping this key secret.
App.config = {
  SUPABASE_URL: 'https://qhcykdoakroeduxlrnkt.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_AWDOlj4OT5JOA6zkreygbQ_6NiLPdJJ',
};
