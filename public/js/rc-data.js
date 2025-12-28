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
    data: null,     // { schedule, bowlGames, picks, picksIds, history, teams, teamById }
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
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
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

    const homeTeam = homeId ? teamById[homeId] : null;
    const awayTeam = awayId ? teamById[awayId] : null;
    const winnerTeam = winnerId ? teamById[winnerId] : null;

    // Fallback to strings if any ID is missing (keeps the app resilient mid-migration)
    const homeName = homeTeam ? teamDisplayName(homeTeam) : getFirst(row, ["Home Team", "Home", "Team 2"]);
    const awayName = awayTeam ? teamDisplayName(awayTeam) : getFirst(row, ["Away Team", "Away", "Team 1"]);
    const winnerName = winnerTeam ? teamDisplayName(winnerTeam) : getFirst(row, ["Winner"]);

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

      "_source": "BOWL_GAMES"
    };
  }

  async function fetchAndParseAll() {
    if (!RC.BOWL_GAMES_URL || !RC.PICKS_URL || !RC.HISTORY_URL) {
      throw new Error("One or more required data URLs are missing on RC.*");
    }
    if (!RC.TEAMS_URL) {
      throw new Error("RC.TEAMS_URL is required when Bowl Games uses Team IDs.");
    }

    const [bowlGamesRes, picksRes, historyRes, teamsRes] = await Promise.all([
      fetch(RC.BOWL_GAMES_URL, { cache: "no-store" }),
      fetch(RC.PICKS_URL, { cache: "no-store" }),
      fetch(RC.HISTORY_URL, { cache: "no-store" }),
      fetch(RC.TEAMS_URL, { cache: "no-store" })
    ]);

    const [bowlGamesText, picksText, historyText, teamsText] = await Promise.all([
      bowlGamesRes.text(),
      picksRes.text(),
      historyRes.text(),
      teamsRes.text()
    ]);

    const bowlGames = RC.csvToJson(bowlGamesText).filter(r => r && Object.keys(r).length);
    const teams = RC.csvToJson(teamsText).filter(t =>
      t && (getFirst(t, ["Team ID", "TeamID", "ID", "Id"]) || getFirst(t, ["School Name", "School", "Team", "Name"]))
    );
    const teamById = buildTeamById(teams);

    const schedule = bowlGames
      .map(r => normalizeScheduleFromBowlGames(r, teamById))
      .filter(g => g.Bowl && g.Date);

    
    const picksIds = RC.csvToJson(picksText).filter(p => p && p.Name);

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
    const history = RC.csvToJson(historyText);

    return { schedule, bowlGames, picks, picksIds, history, teams, teamById };
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
      schedule: cache.data?.schedule || null,
      bowlGames: cache.data?.bowlGames || null,
      picks: cache.data?.picks || null,
      picksIds: cache.data?.picksIds || null,
      history: cache.data?.history || null,
      teams: cache.data?.teams || null,
      teamById: cache.data?.teamById || null,
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
          schedule: data.schedule,
          bowlGames: data.bowlGames,
          picks: data.picks,
          picksIds: data.picksIds,
          history: data.history,
          teams: data.teams,
          teamById: data.teamById,
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
          schedule: cache.data.schedule,
          bowlGames: cache.data.bowlGames,
          picks: cache.data.picks,
          picksIds: cache.data.picksIds,
          history: cache.data.history,
          teams: cache.data.teams,
          teamById: cache.data.teamById,
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
            schedule: data.schedule,
            bowlGames: data.bowlGames,
            picks: data.picks,
          picksIds: data.picksIds,
            history: data.history,
            teams: data.teams,
            teamById: data.teamById,
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
      schedule: state.schedule,
      bowlGames: state.bowlGames,
      picks: state.picks,
      picksIds: state.picksIds,
      history: state.history,
      teams: state.teams,
      teamById: state.teamById,
      loading: state.loading,
      error: state.error,
      refresh,
      lastUpdated: state.lastUpdated
    };
  };
})();
