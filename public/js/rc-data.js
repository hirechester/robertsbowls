/* Roberts Cup - Shared league data loader (schedule/picks/history/teams/bowlGames)
Goal: fetch & parse published Google Sheets CSVs once and share across pages.
Loaded as:  */
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
          // escaped quote
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
          // trim trailing \r from last cell if present
          if (row.length && typeof row[row.length - 1] === "string") {
            row[row.length - 1] = row[row.length - 1].replace(/\r$/, "");
          }
          // ignore fully-empty trailing lines
          if (row.some(c => String(c || "").trim() !== "")) rows.push(row);
          row = [];
        } else {
          cur += ch;
        }
      }
    }

    // last cell / row
    row.push(cur);
    if (row.length && typeof row[row.length - 1] === "string") {
      row[row.length - 1] = row[row.length - 1].replace(/\r$/, "");
    }
    if (row.some(c => String(c || "").trim() !== "")) rows.push(row);

    return rows;
  }

  // Convert CSV -> array of objects
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

  // Simple in-memory cache shared across the whole SPA session
  const cache = {
    status: "idle", // "idle" | "loading" | "ready" | "error"
    data: null,     // { schedule, picks, history, teams, bowlGames }
    error: null,
    promise: null,
    ts: null
  };

  async function fetchAndParseAll() {
    if (!RC.SCHEDULE_URL || !RC.PICKS_URL || !RC.HISTORY_URL) {
      throw new Error("One or more required data URLs are missing on RC.*");
    }

    const hasTeams = !!RC.TEAMS_URL;
    const hasBowlGames = !!RC.BOWL_GAMES_URL;

    const [scheduleRes, picksRes, historyRes, teamsRes, bowlGamesRes] = await Promise.all([
      fetch(RC.SCHEDULE_URL, { cache: "no-store" }),
      fetch(RC.PICKS_URL, { cache: "no-store" }),
      fetch(RC.HISTORY_URL, { cache: "no-store" }),
      hasTeams ? fetch(RC.TEAMS_URL, { cache: "no-store" }) : Promise.resolve(null),
      hasBowlGames ? fetch(RC.BOWL_GAMES_URL, { cache: "no-store" }) : Promise.resolve(null),
    ]);

    const [scheduleText, picksText, historyText, teamsText, bowlGamesText] = await Promise.all([
      scheduleRes.text(),
      picksRes.text(),
      historyRes.text(),
      hasTeams && teamsRes ? teamsRes.text() : Promise.resolve(""),
      hasBowlGames && bowlGamesRes ? bowlGamesRes.text() : Promise.resolve(""),
    ]);

    const schedule = RC.csvToJson(scheduleText);
    const picks = RC.csvToJson(picksText).filter(p => p && p.Name);
    const history = RC.csvToJson(historyText);

    // Teams tab is optional. If TEAMS_URL is blank, teams is []
    const teams = hasTeams
      ? RC.csvToJson(teamsText).filter(t => t && (t["School Name"] || t.School || t.Team || t.Name))
      : [];

    // Bowl Games tab is optional (new). If BOWL_GAMES_URL is blank, bowlGames is []
    const bowlGames = hasBowlGames
      ? RC.csvToJson(bowlGamesText).filter(r => r && Object.keys(r).length)
      : [];

    return { schedule, picks, history, teams, bowlGames };
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

  // Public hook: shared across all pages
  RC.data.useLeagueData = function useLeagueData() {
    const [state, setState] = useState(() => ({
      schedule: cache.data?.schedule || null,
      picks: cache.data?.picks || null,
      history: cache.data?.history || null,
      teams: cache.data?.teams || null,
      bowlGames: cache.data?.bowlGames || null,
      loading: cache.status === "loading" || cache.status === "idle",
      error: cache.error || null,
      lastUpdated: cache.ts
    }));

    const refresh = useCallback(async () => {
      // Force a refetch
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
          picks: data.picks,
          history: data.history,
          teams: data.teams,
          bowlGames: data.bowlGames,
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
          picks: cache.data.picks,
          history: cache.data.history,
          teams: cache.data.teams,
          bowlGames: cache.data.bowlGames,
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
            picks: data.picks,
            history: data.history,
            teams: data.teams,
            bowlGames: data.bowlGames,
            loading: false,
            error: null,
            lastUpdated: cache.ts
          });
        })
        .catch((e) => {
          if (!alive) return;
          setState((s) => ({ ...s, loading: false, error: e, lastUpdated: cache.ts }));
        });

      return () => {
        alive = false;
      };
    }, []);

    return {
      schedule: state.schedule,
      picks: state.picks,
      history: state.history,
      teams: state.teams,
      bowlGames: state.bowlGames,
      loading: state.loading,
      error: state.error,
      refresh,
      lastUpdated: state.lastUpdated
    };
  };
})();
