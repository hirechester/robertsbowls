/* Roberts Cup - Shared league data loader (Bowl Games as Schedule)
   Goal: fetch & parse published Google Sheets CSVs once and share across pages.
   New: schedule is derived from RC.BOWL_GAMES_URL (Bowl Games tab). No more Schedule tab fetch.
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

  // Convert CSV -> array of objects (robust headers)
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
    status: "idle",
    data: null,     // { schedule, bowlGames, picks, history, teams }
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

  function confHas(confStr, token) {
    const s = String(confStr || "").toLowerCase();
    const re = new RegExp(`\\b${String(token || "").toLowerCase()}\\b`, "i");
    return re.test(s);
  }

  function normalizeScheduleFromBowlGames(row) {
    const homeTeam = getFirst(row, ["Home Team", "Home", "Team 2"]);
    const awayTeam = getFirst(row, ["Away Team", "Away", "Team 1"]);

    const homeConf = getFirst(row, ["Home Conf", "Home Conference", "HomeConf"]);
    const awayConf = getFirst(row, ["Away Conf", "Away Conference", "AwayConf"]);
    const confBlob = `${homeConf} ${awayConf}`.trim();

    const cfpRaw = getFirst(row, ["CFP?", "CFP", "CFP ?", "Playoff", "Playoff?"]);
    const cfp01 = to01(cfpRaw);

    const b1g01 = (String(confBlob).toLowerCase().includes("big ten") || confHas(confBlob, "b1g")) ? "1" : "0";
    const sec01 = confHas(confBlob, "sec") ? "1" : "0";

    return {
      "Bowl": getFirst(row, ["Bowl Name", "Bowl", "BowlName"]),
      "Date": getFirst(row, ["Date"]),
      "Time": getFirst(row, ["Time"]),
      "Network": getFirst(row, ["TV", "Network"]),
      "Winner": getFirst(row, ["Winner"]),
      "Team 1": awayTeam,
      "Team 2": homeTeam,
      "CFP": cfp01,
      "Weight": getFirst(row, ["Weight"]),
      "B1G": b1g01,
      "SEC": sec01,
      "Home Conf": homeConf,
      "Away Conf": awayConf,
      "_source": "BOWL_GAMES"
    };
  }

  async function fetchAndParseAll() {
    if (!RC.BOWL_GAMES_URL || !RC.PICKS_URL || !RC.HISTORY_URL) {
      throw new Error("One or more required data URLs are missing on RC.*");
    }

    const hasTeams = !!RC.TEAMS_URL;

    const [bowlGamesRes, picksRes, historyRes, teamsRes] = await Promise.all([
      fetch(RC.BOWL_GAMES_URL, { cache: "no-store" }),
      fetch(RC.PICKS_URL, { cache: "no-store" }),
      fetch(RC.HISTORY_URL, { cache: "no-store" }),
      hasTeams ? fetch(RC.TEAMS_URL, { cache: "no-store" }) : Promise.resolve(null)
    ]);

    const [bowlGamesText, picksText, historyText, teamsText] = await Promise.all([
      bowlGamesRes.text(),
      picksRes.text(),
      historyRes.text(),
      hasTeams && teamsRes ? teamsRes.text() : Promise.resolve("")
    ]);

    const bowlGames = RC.csvToJson(bowlGamesText).filter(r => r && Object.keys(r).length);
    const schedule = bowlGames
      .map(normalizeScheduleFromBowlGames)
      .filter(g => g.Bowl && g.Date);

    const picks = RC.csvToJson(picksText).filter(p => p && p.Name);
    const history = RC.csvToJson(historyText);

    const teams = hasTeams
      ? RC.csvToJson(teamsText).filter(t => t && (t["School Name"] || t.School || t.Team || t.Name))
      : [];

    return { schedule, bowlGames, picks, history, teams };
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
      history: cache.data?.history || null,
      teams: cache.data?.teams || null,
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
          history: data.history,
          teams: data.teams,
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
          history: cache.data.history,
          teams: cache.data.teams,
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
            history: data.history,
            teams: data.teams,
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
      history: state.history,
      teams: state.teams,
      loading: state.loading,
      error: state.error,
      refresh,
      lastUpdated: state.lastUpdated
    };
  };
})();
