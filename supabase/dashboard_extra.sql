-- ============================================================================
-- dashboard_extra.sql
--
-- New admin RPCs backing the "الغرف" (Rooms) and "المستخدمون" (Users)
-- sections added to the admin dashboard.
--
-- Shaped to match your actual dashboard_list_categories definition:
--   • admin check is `perform _assert_is_admin();`, not `is_admin()`
--   • returns json via `json_agg(row_to_json(t))`, not `returns table(...)`
--
-- Still assumed (not confirmed against your schema — adjust if wrong):
--   • rooms(code, host_id, status, min_players, max_players, round_cursor,
--     created_at) and room_players(room_code, user_id, username, is_host),
--     matching lib/features/lobby/repositories/lobby_repository.dart.
--   • profiles(id, username, wins, games_played, total_points, avatar_url),
--     matching lib/features/profile/repositories/profile_repository.dart,
--     and that auth.users.created_at / auth.users.is_anonymous are readable
--     (needs security definer, which is included below).
--   • If `rooms.created_at` doesn't exist in your schema, drop that column.
-- ============================================================================

-- ─── Rooms ──────────────────────────────────────────────────────────────────

-- Needed because an earlier version of this file created these with
-- `returns table(...)` — Postgres won't let CREATE OR REPLACE change a
-- function's return type, only DROP + recreate.
drop function if exists dashboard_list_rooms();
drop function if exists dashboard_list_users();

create or replace function dashboard_list_rooms()
returns json
language plpgsql
security definer
as $$
begin
  perform _assert_is_admin();
  return (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        r.code,
        r.host_id,
        coalesce(p.username, '—') as host_username,
        r.status,
        (select count(*) from room_players rp where rp.room_code = r.code) as player_count,
        r.min_players,
        r.max_players,
        r.round_cursor,
        r.created_at
      from rooms r
      left join profiles p on p.id = r.host_id
      order by r.created_at desc
    ) t
  );
end;
$$;

create or replace function dashboard_delete_room(p_code varchar)
returns void
language plpgsql
security definer
as $$
begin
  perform _assert_is_admin();

  -- Mirrors LobbyRepository.endRoom — deleting the room cascades to
  -- room_players/rounds/round_answers/round_votes via FK constraints.
  delete from rooms where code = p_code;
end;
$$;

-- ─── Users ──────────────────────────────────────────────────────────────────

create or replace function dashboard_list_users()
returns json
language plpgsql
security definer
as $$
begin
  perform _assert_is_admin();
  return (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        p.id,
        p.username,
        p.wins,
        p.games_played,
        p.total_points,
        p.avatar_url,
        coalesce(au.is_anonymous, false) as is_guest,
        au.created_at
      from profiles p
      left join auth.users au on au.id = p.id
      order by au.created_at desc nulls last
    ) t
  );
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────
-- Match whatever role dashboard_list_categories is granted to (check under
-- Database → Functions → dashboard_list_categories → the function's grants,
-- or just leave this as-is — `authenticated` is the standard PostgREST role
-- for a signed-in Supabase user).

grant execute on function dashboard_list_rooms() to authenticated;
grant execute on function dashboard_delete_room(varchar) to authenticated;
grant execute on function dashboard_list_users() to authenticated;
