# CFBD Bowls Sync (Supabase Edge Function)

This Edge Function pulls live/postseason bowl data from CollegeFootballData (CFBD) and returns an update list that the Roberts Cup admin page can approve. It does **not** write to Supabase directly; the admin UI applies updates using the existing `bowl_games` patch endpoint.

## What it does
- Pulls CFBD postseason games for **FBS** only
- Merges in lines (spread/over-under), media (TV), and weather
- Returns updates keyed by `bowl_id` (CFBD game id)
- Defaults to `cfbdSeason = season - 1` (e.g., Roberts season 2026 => CFBD 2025)

## Prereqs
- CFBD API key (tier 1 is fine for weather)
- Supabase project with:
  - `bowl_games` table (existing)
  - `app_settings` table (existing)
  - Admin page uses `rc-page-admin.js`

## Secrets to set (Supabase UI)
These are stored server-side only (do **not** put them in the database or client code).

1) Open your Supabase project dashboard.
2) Go to **Edge Functions** → **Secrets**.
3) Add a secret named `CFBD_API_KEY` with your CFBD API key.
4) If your function runtime does not already expose the service role key, add another secret named
   `SUPABASE_SERVICE_ROLE_KEY` with your project’s service role key.

## Deploy the function (Supabase UI)
1) In the Supabase dashboard, open **Edge Functions**.
2) Click **Create a function**.
3) Name it `cfbd-bowls-sync`.
4) Paste the contents of `supabase/functions/cfbd-bowls-sync/index.ts` into the editor.
5) Save + Deploy.
6) Any time you change `index.ts` locally, repeat steps 4–5 to update the deployed function.

## Optional: Deploy + test with the CLI
If you later prefer the CLI, you can use these commands from the repo root.

```bash
supabase secrets set CFBD_API_KEY="<your_cfbd_api_key>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your_service_role_key>"
supabase functions deploy cfbd-bowls-sync
```

To test locally:

```bash
supabase functions serve cfbd-bowls-sync --no-verify-jwt
```

In another terminal:

```bash
curl -i \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-admin-code: <your_admin_code>" \
  -d '{"season": 2026}' \
  http://localhost:54321/functions/v1/cfbd-bowls-sync
```

## Test in the Supabase UI
1) Open **Edge Functions** → `cfbd-bowls-sync`.
2) Use the **Invoke** button.
3) Set the request body to:
   ```json
   { "season": 2026 }
   ```
4) Add header `x-admin-code: <your_admin_code>`.
5) Invoke. You should receive a JSON response with `updates`.

## Deploy + use in the admin UI
1. Deploy the function (above)
2. Confirm `public/js/rc-config.js` has:
   - `RC.SUPABASE_FUNCTIONS_URL = "https://<project-ref>.functions.supabase.co"`
   - `RC.CFBD_SYNC_FUNCTION = "cfbd-bowls-sync"`
3. Open the Admin Console page
4. Enter the admin code
5. Click **Fetch CFBD Updates**
6. Review per-bowl updates and click **Apply Update** or **Apply All**

## Season mapping
Roberts Cup season 2026 corresponds to CFBD season 2025.
If you ever need to override this, pass `cfbdSeason` in the request body:

```json
{ "season": 2026, "cfbdSeason": 2025 }
```

## Notes
- `bowl_id` is expected to match CFBD game id. If it does not, you’ll need a mapping table.
- The function requires an `x-admin-code` header, but it does **not** validate it against a secret yet.
  If you want that, we can add `ADMIN_CODE` as a secret and verify it server-side.
- Reminder for next season: if you want hourly odds updates, use Supabase **Integrations → Cron**
  with `pg_cron` + `pg_net` to call this function on a schedule. (Not needed now that the season is over.)

## Optional: Hourly Vegas odds cron (next season)
Use Supabase **Integrations → Cron** + `pg_net` to call the Edge Function hourly.

1) In Supabase, go to **Database → Extensions** and enable:
   - `pg_cron`
   - `pg_net`

2) Go to **SQL Editor** and run the following (replace placeholders):

```sql
-- 1) One-time test call (optional)
select
  net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/cfbd-bowls-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-code', '<your_admin_code>'
    ),
    body := jsonb_build_object('season', 2026, 'mode', 'odds')
  ) as request_id;

-- 2) Schedule hourly job (runs at minute 0 of every hour, UTC)
select
  cron.schedule(
    'rc_cfbd_odds_hourly',
    '0 * * * *',
    $$
    select
      net.http_post(
        url := 'https://<project-ref>.functions.supabase.co/cfbd-bowls-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-admin-code', '<your_admin_code>'
        ),
        body := jsonb_build_object('season', 2026, 'mode', 'odds')
      );
    $$
  );
```

3) If you ever need to stop it:

```sql
select cron.unschedule('rc_cfbd_odds_hourly');
```

Notes:
- Cron runs in UTC. If you want a different timing, adjust the cron string.
- Replace `season` with the current Roberts Cup season (CFBD uses `season - 1` inside the function).
