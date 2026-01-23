/* Roberts Cup - Shared league data loader (Bowl Games + Teams IDs)
   Goal: fetch & parse published Google Sheets CSVs once and share across pages.

   Stage D (Step 1):
   - Bowl Games tab now contains Winner ID / Home ID / Away ID / Favorite ID (integers).
   - Teams tab contains Team ID (integer) + metadata (name, nickname, hex, logo, conference, etc).
   - We derive legacy "schedule" rows from Bowl Games using Team IDs (no string matching needed).
   - Picks tab is still name-based for now; this keeps schedule "Bowl", "Team 1/2", "Winner" as display names.

   NOTE: Pages should keep using RC.data.useLeagueData().schedule as before.
*/
(() => {
  window.RC = window.RC || {};
  const RC = window.RC;
  RC.data = RC.data || {};
  const { useState, useEffect, useCallback } = React;

  // Lightweight CSV parser (handles quotes, commas, and newlines)
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cur);
          cur = "";
        } else if (ch === '\n') {
          row.push(cur);
          cur = "";
          if (row.length && typeof row[row.length - 1] === "string") {
            row[row.length - 1] = row[row.length - 1].replace(/\r$/, "");
          }
          if (row.some(c => String(c || "").trim() !== "")) rows.push(row);
          row = [];
        } else {
          cur += ch;
        }
      }
    }

    row.push(cur);
    if (row.length && typeof row[row.length - 1] === "string") {
      row[row.length - 1] = row[row.length - 1].replace(/\r$/, "");
    }
    if (row.some(c => String(c || "").trim() !== "")) rows.push(row);

    return rows;
  }

  // Convert CSV -> array of objects (handles duplicate headers)
  RC.csvToJson = function csvToJson(csvText) {
    if (!csvText) return [];
    const rows = parseCSV(csvText);
    if (!rows.length) return [];

    const headersRaw = rows[0].map(h => String(h || "").trim());
    const headers = [];
    const seen = {};
    headersRaw.forEach((h) => {
      const key = h || "Column";
      if (!seen[key]) {
        seen[key] = 1;
        headers.push(key);
      } else {
        seen[key] += 1;
        headers.push(`${key} (${seen[key]})`);
      }
    });

    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = (r[c] !== undefined ? String(r[c]).trim() : "");
      }
      out.push(obj);
    }
    return out;
  };

  const cache = {
    status: "idle", // "idle" | "loading" | "ready" | "error"
    data: null,     // { appSettings, schedule, bowlGames, picks, picksIds, history, teams, teamById, players, picksBracket, hallOfFameByYear, peopleById, peopleByName }
    error: null,
    promise: null,
    ts: null
  };

  function getFirst(row, keys) {
    for (const k of keys) {
      const v = row && row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  function to01(val) {
    const s = String(val || "").trim();
    if (!s) return "0";
    if (/^(1|true|yes|y)$/i.test(s)) return "1";
    return "0";
  }

  function normalizeId(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    if (!/^\d+$/.test(s)) return s;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  }

  function normalizeHeaderName(name) {
    return String(name || "").replace(/^\uFEFF/, "").trim();
  }

  function getCsvHeaders(csvText) {
    const rows = parseCSV(csvText || "");
    return (rows[0] || []).map(h => normalizeHeaderName(h));
  }

  function buildTeamById(teams) {
    const map = {};
    (teams || []).forEach((t) => {
      const id = normalizeId(getFirst(t, ["Team ID", "TeamID", "ID", "Id"]));
      if (!id) return;
      map[id] = t;
    });
    return map;
  }

  function mapTeamsFromSupabase(rows) {
    return (rows || []).map((row) => ({
      "Team ID": row.team_id ?? "",
      "Ranking": row.ranking ?? "",
      "Seed": row.seed ?? "",
      "School Name": row.school_name ?? "",
      "Team Nickname": row.team_nickname ?? "",
      "Primary Hex": row.primary_hex ?? "",
      "Conference": row.conference ?? "",
      "Logo": row.logo ?? "",
      "Latitude": row.latitude ?? "",
      "Longitude": row.longitude ?? "",
      "City": row.city ?? "",
      "State": row.state ?? "",
      "Enrollment": row.enrollment ?? "",
      "Graduation Rate": row.graduation_rate ?? "",
      "Year Founded": row.year_founded ?? "",
      "_source": "SUPABASE"
    }));
  }

  async function fetchTeamsFromSupabase() {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey) return null;

    const table = RC.SUPABASE_TEAMS_TABLE || "teams";
    const url = `${baseUrl}/rest/v1/${table}?select=*`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase teams fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? mapTeamsFromSupabase(rows) : [];
  }

  async function fetchTeamsData() {
    const hasSupabase = Boolean(RC.SUPABASE_URL && RC.SUPABASE_PUBLISHABLE_KEY);
    if (!hasSupabase) {
      throw new Error("RC.SUPABASE_URL and RC.SUPABASE_PUBLISHABLE_KEY are required for Teams data.");
    }

    const supaTeams = await fetchTeamsFromSupabase();
    if (!Array.isArray(supaTeams) || !supaTeams.length) {
      throw new Error("Supabase teams returned 0 rows.");
    }
    return supaTeams;
  }

  function mapHallOfFameFromSupabase(rows) {
    return (rows || []).map((row) => ({
      "Year": row.year ?? "",
      "Player ID": row.player_id ?? "",
      "Wins": row.wins ?? "",
      "Losses": row.losses ?? "",
      "Champ Team": row.champ_team_id ?? "",
      "Champ Rank": row.champ_rank ?? "",
      "Title": row.title ? "1" : "",
      "_source": "SUPABASE"
    }));
  }

  async function fetchHallOfFameFromSupabase() {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey) return null;

    const table = RC.SUPABASE_HALL_OF_FAME_TABLE || "hall_of_fame";
    const url = `${baseUrl}/rest/v1/${table}?select=*`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase hall_of_fame fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? mapHallOfFameFromSupabase(rows) : [];
  }

  async function fetchHallOfFameData() {
    const hasSupabase = Boolean(RC.SUPABASE_URL && RC.SUPABASE_PUBLISHABLE_KEY);
    if (!hasSupabase) {
      throw new Error("RC.SUPABASE_URL and RC.SUPABASE_PUBLISHABLE_KEY are required for Hall of Fame data.");
    }

    const supaRows = await fetchHallOfFameFromSupabase();
    if (!Array.isArray(supaRows) || !supaRows.length) {
      throw new Error("Supabase hall_of_fame returned 0 rows.");
    }
    return supaRows;
  }

  function getSettingInt(settings, key) {
    const entry = settings && settings[key];
    const raw = entry && (entry.value_int ?? entry.value_text);
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getSettingText(settings, key) {
    const entry = settings && settings[key];
    if (!entry) return "";
    const raw = entry.value_text ?? entry.value_int ?? "";
    return String(raw || "").trim();
  }

  function getSupabasePicksSeason(settings) {
    const fromSettings = getSettingInt(settings, "season_year");
    if (Number.isFinite(fromSettings)) return fromSettings;
    return null;
  }

  async function fetchPicksFromSupabase(season) {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey || !season) return null;

    const table = RC.SUPABASE_PICKS_TABLE || "picks";
    const limit = 1000;
    let offset = 0;
    const rows = [];

    while (true) {
      const url = `${baseUrl}/rest/v1/${table}?select=player_id,bowl_id,team_id&season=eq.${season}&order=player_id.asc,bowl_id.asc&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`
        }
      });
      if (!res.ok) {
        throw new Error(`Supabase picks fetch failed (${res.status})`);
      }
      const chunk = await res.json();
      if (!Array.isArray(chunk) || !chunk.length) break;
      rows.push(...chunk);
      if (chunk.length < limit) break;
      offset += limit;
    }

    return rows;
  }

  async function fetchPicksMetaFromSupabase(season) {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey || !season) return null;

    const table = RC.SUPABASE_PICKS_META_TABLE || "picks_meta";
    const url = `${baseUrl}/rest/v1/${table}?select=player_id,tiebreaker_score,champ_team_id&season=eq.${season}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase picks_meta fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchPlayersFromSupabase() {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey) return null;

    const table = RC.SUPABASE_PLAYERS_TABLE || "players";
    const url = `${baseUrl}/rest/v1/${table}?select=id,first_name,last_name,family_level,state,family_unit&order=last_name.asc,first_name.asc`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase players fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchPicksBracketFromSupabase(season) {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey || !season) return null;

    const table = RC.SUPABASE_PICKS_BRACKET_TABLE || "picks_bracket";
    const url = `${baseUrl}/rest/v1/${table}?select=season,round,slot,bowl_id,advances_to&season=eq.${season}&order=round.asc,slot.asc`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase picks_bracket fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  function mapBowlGamesFromSupabase(rows) {
    return (rows || []).map((row) => ({
      "Bowl ID": row.bowl_id ?? "",
      "Sponsored Bowl Name": row.sponsored_bowl_name ?? "",
      "Bowl Name": row.bowl_name ?? "",
      "Date": row.date ?? "",
      "Time": row.time ?? "",
      "City": row.city ?? "",
      "State": row.state ?? "",
      "Stadium": row.stadium ?? "",
      "Bowl Latitude": row.bowl_latitude ?? "",
      "Bowl Longitude": row.bowl_longitude ?? "",
      "TV": row.tv ?? "",
      "Winner ID": row.winner_id ?? "",
      "Home ID": row.home_id ?? "",
      "Away ID": row.away_id ?? "",
      "Home Pts": row.home_pts ?? "",
      "Away Pts": row.away_pts ?? "",
      "Favorite ID": row.favorite_id ?? "",
      "Spread": row.spread ?? "",
      "O/U": row.over_under ?? "",
      "Temp": row.temp_text ?? "",
      "Weather": row.weather ?? "",
      "CFP": row.cfp ?? "",
      "Indoor": row.indoor ?? "",
      "Neutral": row.neutral ?? "",
      "Excitement": row.excitement ?? "",
      "Weight": row.weight ?? "",
      "_source": "SUPABASE"
    }));
  }

  async function fetchBowlGamesFromSupabase(season) {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey || !season) return null;

    const table = RC.SUPABASE_BOWL_GAMES_TABLE || "bowl_games";
    const url = `${baseUrl}/rest/v1/${table}?select=*&season=eq.${season}&order=date.asc,time.asc`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase bowl_games fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? mapBowlGamesFromSupabase(rows) : [];
  }

  async function fetchBowlGamesData(settings) {
    const hasSupabase = Boolean(RC.SUPABASE_URL && RC.SUPABASE_PUBLISHABLE_KEY);
    const season = getSupabasePicksSeason(settings);
    if (!hasSupabase || !season) {
      throw new Error("RC.SUPABASE_* and app_settings.season_year are required for Bowl Games data.");
    }

    const supaRows = await fetchBowlGamesFromSupabase(season);
    if (!Array.isArray(supaRows) || !supaRows.length) {
      throw new Error("Supabase bowl_games returned 0 rows.");
    }
    return supaRows;
  }

  async function fetchAppSettingsFromSupabase() {
    const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
    const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if (!baseUrl || !publishableKey) return null;

    const table = RC.SUPABASE_APP_SETTINGS_TABLE || "app_settings";
    const url = `${baseUrl}/rest/v1/${table}?select=key,value_text,value_int,value_bool`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Supabase app_settings fetch failed (${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchAppSettingsData() {
    const hasSupabase = Boolean(RC.SUPABASE_URL && RC.SUPABASE_PUBLISHABLE_KEY);
    if (!hasSupabase) {
      throw new Error("RC.SUPABASE_URL and RC.SUPABASE_PUBLISHABLE_KEY are required for app settings.");
    }

    const rows = await fetchAppSettingsFromSupabase();
    const settings = {};
    (rows || []).forEach((row) => {
      const key = String(row?.key || "").trim();
      if (!key) return;
      settings[key] = {
        value_text: row?.value_text ?? null,
        value_int: row?.value_int ?? null,
        value_bool: row?.value_bool ?? null
      };
    });
    return settings;
  }

  function buildPeopleIndex(picksIds, playerDisplayById) {
    const byId = {};
    const byName = {};

    Object.keys(playerDisplayById || {}).forEach((id) => {
      const name = String(playerDisplayById[id] || "").trim();
      if (!name) return;
      if (!byId[id]) byId[id] = name;
      const key = name.toLowerCase();
      if (!byName[key]) byName[key] = [];
      if (!byName[key].includes(name)) byName[key].push(name);
    });

    (picksIds || []).forEach((p) => {
      const name = String(p?.Name || "").trim();
      if (!name) return;
      const id = normalizeId(getFirst(p, ["Player ID", "PlayerID", "Person ID", "PersonID", "ID", "Id"]));
      if (id && !byId[id]) byId[id] = name;
      const key = name.toLowerCase();
      if (!byName[key]) byName[key] = [];
      if (!byName[key].includes(name)) byName[key].push(name);
    });
    return { byId, byName };
  }

  function buildPlayerDisplayMap(players) {
    const rows = (players || []).map((p) => {
      const id = normalizeId(p?.id);
      const first = String(p?.first_name || "").trim();
      const last = String(p?.last_name || "").trim();
      return {
        id,
        first,
        last,
        lastInitial: last ? `${last[0].toUpperCase()}.` : ""
      };
    }).filter(p => p.id && p.first);

    const firstCounts = rows.reduce((acc, row) => {
      const key = row.first.toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byId = {};
    rows.forEach((row) => {
      const key = row.first.toLowerCase();
      const needsInitial = key && firstCounts[key] > 1;
      const display = needsInitial && row.lastInitial
        ? `${row.first} ${row.lastInitial}`
        : row.first;
      byId[row.id] = display || row.first || String(row.id);
    });

    return byId;
  }

  function buildPicksIdsFromSupabase(picksRows, metaRows, playerDisplayById) {
    const byId = new Map();
    const getNameForId = (playerId) => (
      playerDisplayById[playerId] || `Player ${playerId}`
    );

    (picksRows || []).forEach((row) => {
      const playerId = normalizeId(row?.player_id);
      if (!playerId) return;
      if (!byId.has(playerId)) {
        byId.set(playerId, { Name: getNameForId(playerId), "Player ID": playerId });
      }
      const bowlId = String(row?.bowl_id || "").trim();
      if (!bowlId) return;
      const teamId = normalizeId(row?.team_id);
      if (!teamId) return;
      byId.get(playerId)[bowlId] = teamId;
    });

    (metaRows || []).forEach((row) => {
      const playerId = normalizeId(row?.player_id);
      if (!playerId) return;
      if (!byId.has(playerId)) {
        byId.set(playerId, { Name: getNameForId(playerId), "Player ID": playerId });
      }
      const tiebreaker = row?.tiebreaker_score ?? "";
      const champTeamId = row?.champ_team_id ?? "";
      if (tiebreaker !== "" && tiebreaker !== null && tiebreaker !== undefined) {
        byId.get(playerId)["Tiebreaker Score"] = String(tiebreaker).trim();
      }
      if (champTeamId !== "" && champTeamId !== null && champTeamId !== undefined) {
        byId.get(playerId)["MANUAL_CHAMP"] = String(champTeamId).trim();
      }
    });

    const picksIds = Array.from(byId.values());
    return picksIds;
  }

  function teamDisplayName(team) {
    if (!team) return "";
    return getFirst(team, ["School Name", "School", "Team", "Name"]);
  }

  function teamConference(team) {
    if (!team) return "";
    return getFirst(team, ["Conference", "Conf", "Conference Name", "Team Conf", "Team Conference"]);
  }

  function confFlag01(teamA, teamB, token) {
    const a = String(teamConference(teamA) || "").toLowerCase();
    const b = String(teamConference(teamB) || "").toLowerCase();
    const t = String(token || "").toLowerCase();
    if (!t) return "0";
    const has = (s) => s.includes(t);
    return (has(a) || has(b)) ? "1" : "0";
  }

  function normalizeScheduleFromBowlGames(row, teamById) {
    const homeId = normalizeId(getFirst(row, ["Home ID", "HomeID"]));
    const awayId = normalizeId(getFirst(row, ["Away ID", "AwayID"]));
    const winnerId = normalizeId(getFirst(row, ["Winner ID", "WinnerID"]));
    const favoriteId = normalizeId(getFirst(row, ["Favorite ID", "FavoriteID"]));
    const spread = getFirst(row, ["Spread", "Line", "Vegas Spread"]);
    const total = getFirst(row, ["Total", "O/U", "Over/Under", "OU", "O-U", "Vegas Total"]);

    const homeTeam = homeId ? teamById[homeId] : null;
    const awayTeam = awayId ? teamById[awayId] : null;
    const winnerTeam = winnerId ? teamById[winnerId] : null;

    // Fallback to strings if any ID is missing (keeps the app resilient mid-migration)
    const homeName = homeTeam ? teamDisplayName(homeTeam) : (homeId ? homeId : getFirst(row, ["Home Team", "Home", "Team 2"]));
    const awayName = awayTeam ? teamDisplayName(awayTeam) : (awayId ? awayId : getFirst(row, ["Away Team", "Away", "Team 1"]));
    const winnerName = winnerTeam ? teamDisplayName(winnerTeam) : (winnerId ? winnerId : "");

    const cfpRaw = getFirst(row, ["CFP?", "CFP", "CFP ?", "Playoff", "Playoff?"]);
    const cfp01 = to01(cfpRaw);

    // Derived conference flags from Teams tab (Bowl Games no longer has Home/Away Conf)
    const b1g01 = confFlag01(homeTeam, awayTeam, "big ten");
    const sec01 = confFlag01(homeTeam, awayTeam, "sec");

    return {
      "Bowl": getFirst(row, ["Bowl Name", "Bowl", "BowlName"]),
      "Bowl ID": getFirst(row, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"]),
      "Date": getFirst(row, ["Date"]),
      "Time": getFirst(row, ["Time"]),
      "Network": getFirst(row, ["TV", "Network"]),
      "Winner": winnerName,
      "Team 1": awayName,
      "Team 2": homeName,
      "CFP": cfp01,
      "Weight": getFirst(row, ["Weight"]),
      "B1G": b1g01,
      "SEC": sec01,

      // IDs kept for next step (Picks -> IDs)
      "Home ID": homeId,
      "Away ID": awayId,
      "Winner ID": winnerId,
      "Favorite ID": favoriteId,
      "Spread": spread,
      "Total": total,

      "_source": "BOWL_GAMES"
    };
  }

  async function fetchAndParseAll() {
    if (!(RC.SUPABASE_URL && RC.SUPABASE_PUBLISHABLE_KEY)) {
      throw new Error("RC.SUPABASE_* is required when Bowl Games uses Team IDs.");
    }

    const settingsPromise = fetchAppSettingsData();
    const teamsPromise = fetchTeamsData();
    const hallPromise = fetchHallOfFameData();
    const settings = await settingsPromise;
    const season = getSupabasePicksSeason(settings);
    const bowlGamesPromise = fetchBowlGamesData(settings);
    const picksRowsPromise = fetchPicksFromSupabase(season);
    const picksMetaPromise = fetchPicksMetaFromSupabase(season);
    const playersPromise = fetchPlayersFromSupabase();
    const bracketPromise = fetchPicksBracketFromSupabase(season);
    await Promise.resolve();

    const bowlGames = (await bowlGamesPromise).filter(r => r && Object.keys(r).length);
    const teamsRaw = await teamsPromise;
    const teams = (teamsRaw || []).filter(t =>
      t && (getFirst(t, ["Team ID", "TeamID", "ID", "Id"]) || getFirst(t, ["School Name", "School", "Team", "Name"]))
    );
    const teamById = buildTeamById(teams);

    const schedule = bowlGames
      .map(r => normalizeScheduleFromBowlGames(r, teamById))
      .filter(g => g.Bowl && g.Date);

    const [picksRows, picksMetaRows, players] = await Promise.all([
      picksRowsPromise,
      picksMetaPromise,
      playersPromise
    ]);
    const playerDisplayById = buildPlayerDisplayMap(players || []);
    const picksIds = buildPicksIdsFromSupabase(picksRows, picksMetaRows, playerDisplayById)
      .filter(p => p && p.Name);
    const picksBracket = (await bracketPromise) || [];
    const peopleIndex = buildPeopleIndex(picksIds, playerDisplayById);

    // Picks sheet is now ID-based:
    // - Header columns for games use Bowl ID (stable unique ID)
    // - Cell values are Team IDs
    //
    // For backward compatibility, we convert picks back into the legacy shape:
    // - keys are Bowl *names* (matching schedule[].Bowl)
    // - values are Team *display names* (matching schedule[].Winner)
    const bowlIdToBowlName = {};
    schedule.forEach(g => {
      const bid = String(g["Bowl ID"] || "").trim();
      if (bid) bowlIdToBowlName[bid] = g.Bowl;
    });

    const NON_GAME_COLS = new Set(["Name", "Tiebreaker Score", "Tiebreaker", "TB", "Notes"]);
    const picks = picksIds.map((row) => {
      const out = { Name: row.Name };
      // Preserve tiebreaker exactly (many pages read this column)
      if (row["Tiebreaker Score"] !== undefined) out["Tiebreaker Score"] = row["Tiebreaker Score"];
      if (row["Tiebreaker"] !== undefined && out["Tiebreaker Score"] === undefined) out["Tiebreaker Score"] = row["Tiebreaker"];

      Object.keys(row).forEach((k) => {
        if (NON_GAME_COLS.has(k)) return;
        const bowlId = String(k || "").trim();
        if (!bowlId) return;

        const bowlName = bowlIdToBowlName[bowlId];
        if (!bowlName) return; // ignore columns that don't match a Bowl ID in schedule

        const pickTeamId = normalizeId(row[k]);
        const team = pickTeamId ? teamById[pickTeamId] : null;
        out[bowlName] = team ? teamDisplayName(team) : "";
      });

      return out;
    });
    const history = [];

    const requiredHallHeaders = ["Year", "Player ID", "Wins", "Losses", "Champ Team", "Champ Rank", "Title"];
    let hallOfFameByYear = new Map();

    try {
      const hallRowsRaw = await hallPromise;
      const hallHeaders = (hallRowsRaw[0] ? Object.keys(hallRowsRaw[0]).map(normalizeHeaderName) : []);
      const missing = requiredHallHeaders.filter(h => !hallHeaders.includes(h));
      if (!missing.length) {
        const hallRows = hallRowsRaw
          .filter(r => r && Object.keys(r).length)
          .map((row) => {
            const normalized = {};
            Object.keys(row).forEach((k) => {
              normalized[normalizeHeaderName(k)] = row[k];
            });
            return normalized;
          });
        hallRows.forEach((row) => {
          const yearNum = parseInt(getFirst(row, ["Year"]), 10);
          if (!Number.isFinite(yearNum)) return;
          const winsRaw = parseInt(getFirst(row, ["Wins"]), 10);
          const lossesRaw = parseInt(getFirst(row, ["Losses"]), 10);
          const champRankRaw = getFirst(row, ["Champ Rank"]);
          const champRankVal = parseInt(champRankRaw, 10);
          const entry = {
            year: yearNum,
            playerRaw: getFirst(row, ["Player ID", "PlayerID", "Player Id"]),
            wins: Number.isFinite(winsRaw) ? winsRaw : 0,
            losses: Number.isFinite(lossesRaw) ? lossesRaw : 0,
            champTeamId: normalizeId(getFirst(row, ["Champ Team"])),
            champRank: Number.isFinite(champRankVal) ? champRankVal : null,
            title: to01(getFirst(row, ["Title"])) === "1"
          };
          if (!hallOfFameByYear.has(yearNum)) hallOfFameByYear.set(yearNum, []);
          hallOfFameByYear.get(yearNum).push(entry);
        });
      }
    } catch (err) {
      hallOfFameByYear = new Map();
    }

    return {
      appSettings: settings,
      schedule,
      bowlGames,
      picks,
      picksIds,
      history,
      teams,
      teamById,
      players,
      picksBracket,
      hallOfFameByYear,
      peopleById: peopleIndex.byId,
      peopleByName: peopleIndex.byName
    };
  }

  function loadOnce() {
    if (cache.data && cache.status === "ready") return Promise.resolve(cache.data);
    if (cache.promise) return cache.promise;

    cache.status = "loading";
    cache.error = null;

    cache.promise = fetchAndParseAll()
      .then((data) => {
        cache.status = "ready";
        cache.data = data;
        cache.ts = Date.now();
        return data;
      })
      .catch((err) => {
        cache.status = "error";
        cache.error = err;
        cache.data = null;
        throw err;
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }

  RC.data.useLeagueData = function useLeagueData() {
    const [state, setState] = useState(() => ({
      appSettings: cache.data?.appSettings || null,
      schedule: cache.data?.schedule || null,
      bowlGames: cache.data?.bowlGames || null,
      picks: cache.data?.picks || null,
      picksIds: cache.data?.picksIds || null,
      history: cache.data?.history || null,
      teams: cache.data?.teams || null,
      teamById: cache.data?.teamById || null,
      players: cache.data?.players || null,
      picksBracket: cache.data?.picksBracket || null,
      hallOfFameByYear: cache.data?.hallOfFameByYear || null,
      peopleById: cache.data?.peopleById || null,
      peopleByName: cache.data?.peopleByName || null,
      loading: cache.status === "loading" || cache.status === "idle",
      error: cache.error || null,
      lastUpdated: cache.ts
    }));

    const refresh = useCallback(async () => {
      cache.data = null;
      cache.error = null;
      cache.status = "idle";
      cache.ts = null;
      cache.promise = null;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await loadOnce();
        setState({
          appSettings: data.appSettings,
          schedule: data.schedule,
          bowlGames: data.bowlGames,
          picks: data.picks,
          picksIds: data.picksIds,
          history: data.history,
          teams: data.teams,
          teamById: data.teamById,
          players: data.players,
          picksBracket: data.picksBracket,
          hallOfFameByYear: data.hallOfFameByYear,
          peopleById: data.peopleById,
          peopleByName: data.peopleByName,
          loading: false,
          error: null,
          lastUpdated: cache.ts
        });
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: e, lastUpdated: cache.ts }));
      }
    }, []);

    useEffect(() => {
      let alive = true;

      if (cache.data && cache.status === "ready") {
        setState((s) => ({
          ...s,
          appSettings: cache.data.appSettings,
          schedule: cache.data.schedule,
          bowlGames: cache.data.bowlGames,
          picks: cache.data.picks,
          picksIds: cache.data.picksIds,
          history: cache.data.history,
          teams: cache.data.teams,
          teamById: cache.data.teamById,
          players: cache.data.players,
          picksBracket: cache.data.picksBracket,
          hallOfFameByYear: cache.data.hallOfFameByYear,
          peopleById: cache.data.peopleById,
          peopleByName: cache.data.peopleByName,
          loading: false,
          error: null,
          lastUpdated: cache.ts
        }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      loadOnce()
        .then((data) => {
          if (!alive) return;
          setState({
            appSettings: data.appSettings,
            schedule: data.schedule,
            bowlGames: data.bowlGames,
            picks: data.picks,
            picksIds: data.picksIds,
            history: data.history,
            teams: data.teams,
            teamById: data.teamById,
            players: data.players,
            picksBracket: data.picksBracket,
            hallOfFameByYear: data.hallOfFameByYear,
            peopleById: data.peopleById,
            peopleByName: data.peopleByName,
            loading: false,
            error: null,
            lastUpdated: cache.ts
          });
        })
        .catch((e) => {
          if (!alive) return;
          setState((s) => ({ ...s, loading: false, error: e, lastUpdated: cache.ts }));
        });

      return () => { alive = false; };
    }, []);

    return {
      appSettings: state.appSettings,
      schedule: state.schedule,
      bowlGames: state.bowlGames,
      picks: state.picks,
      picksIds: state.picksIds,
      history: state.history,
      teams: state.teams,
      teamById: state.teamById,
      players: state.players,
      picksBracket: state.picksBracket,
      hallOfFameByYear: state.hallOfFameByYear,
      peopleById: state.peopleById,
      peopleByName: state.peopleByName,
      loading: state.loading,
      error: state.error,
      refresh,
      lastUpdated: state.lastUpdated
    };
  };
})();
