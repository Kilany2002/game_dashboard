// Same project credentials as the Flutter app (lib/core/config/supabase_config.dart).
// The publishable/anon key is safe to expose client-side — access here is
// enforced by the is_admin check inside each dashboard_* RPC in
// game/supabase/dashboard.sql, not by keeping this key secret.
const SUPABASE_URL = 'https://qhcykdoakroeduxlrnkt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AWDOlj4OT5JOA6zkreygbQ_6NiLPdJJ';
