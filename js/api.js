// Single place mapping the dashboard to its Supabase RPCs. Extending the
// dashboard with a new data section means adding one function here plus a
// view module — nothing else in the app needs to know an RPC name.
App.api = {
  signIn: (email, password) => App.sb.auth.signInWithPassword({ email, password }),
  signOut: () => App.sb.auth.signOut(),
  getSession: () => App.sb.auth.getSession(),

  fetchLiveActivity: () => App.sb.rpc('dashboard_live_activity'),
  fetchGrowth: () => App.sb.rpc('dashboard_growth'),
  fetchEngagement: () => App.sb.rpc('dashboard_engagement'),

  fetchLeaderboard: () => App.sb.rpc('dashboard_leaderboard'),

  listCategories: () => App.sb.rpc('dashboard_list_categories'),
  upsertCategory: (p_id, p_name, p_parent_id) =>
    App.sb.rpc('dashboard_upsert_category', { p_id, p_name, p_parent_id }),
  deleteCategory: (p_id) => App.sb.rpc('dashboard_delete_category', { p_id }),

  listQuestions: () => App.sb.rpc('dashboard_list_questions'),
  upsertQuestion: (p_id, p_category_id, p_text, p_correct_answer) =>
    App.sb.rpc('dashboard_upsert_question', { p_id, p_category_id, p_text, p_correct_answer }),
  deleteQuestion: (p_id) => App.sb.rpc('dashboard_delete_question', { p_id }),

  // New sections — see supabase/dashboard_extra.sql, must be applied manually.
  listRooms: () => App.sb.rpc('dashboard_list_rooms'),
  deleteRoom: (p_code) => App.sb.rpc('dashboard_delete_room', { p_code }),

  listUsers: () => App.sb.rpc('dashboard_list_users'),
};
