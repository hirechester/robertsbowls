(() => {
  const { useEffect, useMemo, useState } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const AdminConsolePage = () => {
    const { loading, error, appSettings, bowlGames, teamById, teams, refresh } = RC.data.useLeagueData();
    const { LoadingSpinner, ErrorMessage } = (RC.ui || {});
    const Spinner = LoadingSpinner || (({ text }) => <div className="px-4 py-8 text-gray-600">{text || "Loading..."}</div>);
    const Err = ErrorMessage || (({ message }) => <div className="px-4 py-8 text-red-600">{message}</div>);

    const [seasonYear, setSeasonYear] = useState("");
    const [seasonMode, setSeasonMode] = useState("");
    const [settingsStatus, setSettingsStatus] = useState("idle");
    const [settingsError, setSettingsError] = useState("");
    const [adminCode, setAdminCode] = useState("");
    const [addForm, setAddForm] = useState({
      bowlId: "",
      sponsoredName: "",
      bowlName: "",
      date: "",
      time: "",
      city: "",
      state: "",
      homeId: "",
      awayId: "",
      cfp: false,
      weight: ""
    });
    const [addStatus, setAddStatus] = useState("idle");
    const [addError, setAddError] = useState("");
    const [gameEdits, setGameEdits] = useState({});
    const [gameStatus, setGameStatus] = useState({});
    const [gameErrors, setGameErrors] = useState({});
    const [cfbdStatus, setCfbdStatus] = useState("idle");
    const [cfbdError, setCfbdError] = useState("");
    const [cfbdUpdates, setCfbdUpdates] = useState([]);
    const [cfbdApplyStatus, setCfbdApplyStatus] = useState({});
    const [cfbdApplyErrors, setCfbdApplyErrors] = useState({});

    const normalizeId = (val) => {
      const s = String(val ?? "").trim();
      if (!s) return "";
      if (!/^\d+$/.test(s)) return s;
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const getSettingInt = (settings, key) => {
      const entry = settings && settings[key];
      const raw = entry && (entry.value_int ?? entry.value_text);
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const getSettingText = (settings, key) => {
      const entry = settings && settings[key];
      if (!entry) return "";
      const raw = entry.value_text ?? entry.value_int ?? "";
      return String(raw || "").trim();
    };

    const teamLabel = (teamId) => {
      if (!teamId || !teamById) return "";
      const team = teamById[normalizeId(teamId)];
      if (!team) return "";
      const school = String(team["School Name"] || team.School || team.Team || team.Name || "").trim();
      const nick = String(team["Team Nickname"] || team.Nickname || team.Mascot || "").trim();
      return nick ? `${school} ${nick}` : school;
    };

    const teamOptions = useMemo(() => {
      const list = Array.isArray(teams) ? teams.slice() : Object.values(teamById || {});
      return list
        .map((team) => {
          const id = normalizeId(team?.["Team ID"] ?? team?.TeamID ?? team?.ID ?? team?.Id);
          const label = teamLabel(id);
          return { id, label };
        })
        .filter((t) => t.id && t.label)
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [teams, teamById]);

    useEffect(() => {
      if (!appSettings) return;
      const year = getSettingInt(appSettings, "season_year");
      const mode = getSettingInt(appSettings, "season_mode");
      setSeasonYear(Number.isFinite(year) ? String(year) : "");
      setSeasonMode(Number.isFinite(mode) ? String(mode) : "");
    }, [appSettings]);

    const coerceBool = (val) => {
      if (typeof val === "boolean") return val;
      const s = String(val ?? "").trim().toLowerCase();
      if (!s) return null;
      if (["1", "true", "yes", "y", "t"].includes(s)) return true;
      if (["0", "false", "no", "n", "f"].includes(s)) return false;
      return null;
    };

    const normalizeCfbdPayload = (raw) => {
      const source = raw && raw.payload && typeof raw.payload === "object" ? raw.payload : raw;
      const payload = {};
      const aliases = {
        bowl_id: "bowl_id",
        bowlId: "bowl_id",
        date: "date",
        time: "time",
        city: "city",
        state: "state",
        stadium: "stadium",
        tv: "tv",
        network: "tv",
        home_id: "home_id",
        homeId: "home_id",
        away_id: "away_id",
        awayId: "away_id",
        home_pts: "home_pts",
        homePts: "home_pts",
        away_pts: "away_pts",
        awayPts: "away_pts",
        winner_id: "winner_id",
        winnerId: "winner_id",
        favorite_id: "favorite_id",
        favoriteId: "favorite_id",
        spread: "spread",
        line: "spread",
        over_under: "over_under",
        overUnder: "over_under",
        total: "over_under",
        temp_text: "temp_text",
        temp: "temp_text",
        weather: "weather",
        cfp: "cfp",
        indoor: "indoor",
        neutral: "neutral",
        excitement: "excitement",
        weight: "weight"
      };

      Object.keys(source || {}).forEach((key) => {
        const mapped = aliases[key];
        if (!mapped || mapped === "bowl_id") return;
        const val = source[key];
        if (val === undefined || val === null || String(val).trim() === "") return;
        if (mapped === "cfp" || mapped === "indoor" || mapped === "neutral") {
          const boolVal = coerceBool(val);
          if (boolVal !== null) payload[mapped] = boolVal;
          return;
        }
        payload[mapped] = val;
      });

      return payload;
    };

    const getCfbdBowlId = (raw) => {
      const source = raw && raw.payload && typeof raw.payload === "object" ? raw.payload : raw;
      return normalizeId(raw?.bowl_id ?? raw?.bowlId ?? source?.bowl_id ?? source?.bowlId);
    };

    const pendingGames = useMemo(() => {
      if (!Array.isArray(bowlGames)) return [];
      return bowlGames.filter((game) => {
        const winnerId = normalizeId(game?.["Winner ID"]);
        const homePts = String(game?.["Home Pts"] ?? "").trim();
        const awayPts = String(game?.["Away Pts"] ?? "").trim();
        const hasScores = homePts !== "" && awayPts !== "";
        return !winnerId || !hasScores;
      });
    }, [bowlGames]);

    const cfbdPendingUpdates = useMemo(() => {
      if (!Array.isArray(cfbdUpdates) || !cfbdUpdates.length) return [];
      return cfbdUpdates.filter((update) => {
        const bowlId = getCfbdBowlId(update);
        if (!bowlId) return false;
        const game = (bowlGames || []).find((g) => normalizeId(g?.["Bowl ID"]) === bowlId);
        const winnerId = normalizeId(game?.["Winner ID"]);
        return !winnerId;
      });
    }, [cfbdUpdates, bowlGames]);

    useEffect(() => {
      if (!pendingGames.length) return;
      setGameEdits((prev) => {
        const next = { ...prev };
        pendingGames.forEach((game) => {
          const id = normalizeId(game?.["Bowl ID"]);
          if (!id || next[id]) return;
          next[id] = {
            homePts: String(game?.["Home Pts"] ?? "").trim(),
            awayPts: String(game?.["Away Pts"] ?? "").trim(),
            winnerId: normalizeId(game?.["Winner ID"])
          };
        });
        return next;
      });
    }, [pendingGames]);

    const updateAppSetting = async (key, payload) => {
      const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
      const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
      if (!baseUrl || !publishableKey) throw new Error("Supabase config is missing.");
      const code = String(adminCode || "").trim();
      if (!code) throw new Error("Admin code is required.");
      const table = RC.SUPABASE_APP_SETTINGS_TABLE || "app_settings";
      const url = `${baseUrl}/rest/v1/${table}?key=eq.${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
          "x-admin-code": code
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update ${key}.`);
      }
    };

    const updateBowlGame = async (season, bowlId, payload) => {
      const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
      const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
      if (!baseUrl || !publishableKey) throw new Error("Supabase config is missing.");
      if (!season) throw new Error("Missing season year.");
      const code = String(adminCode || "").trim();
      if (!code) throw new Error("Admin code is required.");
      const table = RC.SUPABASE_BOWL_GAMES_TABLE || "bowl_games";
      const url = `${baseUrl}/rest/v1/${table}?season=eq.${encodeURIComponent(season)}&bowl_id=eq.${encodeURIComponent(bowlId)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
          "x-admin-code": code
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update bowl game.");
      }
    };

    const createBowlGame = async (payload) => {
      const baseUrl = String(RC.SUPABASE_URL || "").replace(/\/+$/, "");
      const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
      if (!baseUrl || !publishableKey) throw new Error("Supabase config is missing.");
      const code = String(adminCode || "").trim();
      if (!code) throw new Error("Admin code is required.");
      const table = RC.SUPABASE_BOWL_GAMES_TABLE || "bowl_games";
      const url = `${baseUrl}/rest/v1/${table}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
          "x-admin-code": code
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to add bowl game.");
      }
    };

    const toNull = (val) => {
      const s = String(val ?? "").trim();
      return s === "" ? null : s;
    };

    const toNumberOrNull = (val) => {
      const s = String(val ?? "").trim();
      if (!s) return null;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };

    const parseScore = (val) => {
      const s = String(val ?? "").trim();
      if (s === "") return null;
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : null;
    };

    const cfbdFieldLabels = {
      date: "Date",
      time: "Time",
      city: "City",
      state: "State",
      stadium: "Stadium",
      tv: "TV",
      home_id: "Home ID",
      away_id: "Away ID",
      home_pts: "Home Pts",
      away_pts: "Away Pts",
      winner_id: "Winner ID",
      favorite_id: "Favorite ID",
      spread: "Spread",
      over_under: "O/U",
      temp_text: "Temp",
      weather: "Weather",
      cfp: "CFP",
      indoor: "Indoor",
      neutral: "Neutral",
      excitement: "Excitement",
      weight: "Weight"
    };

    const fetchCfbdUpdates = async () => {
      setCfbdStatus("loading");
      setCfbdError("");
      setCfbdUpdates([]);

      const season = parseInt(seasonYear, 10);
      if (!Number.isFinite(season)) {
        setCfbdStatus("error");
        setCfbdError("Season year is missing or invalid.");
        return;
      }

      const baseUrl = String(RC.SUPABASE_FUNCTIONS_URL || "").replace(/\/+$/, "");
      const fnName = String(RC.CFBD_SYNC_FUNCTION || "").trim();
      const publishableKey = String(RC.SUPABASE_PUBLISHABLE_KEY || "").trim();
      if (!baseUrl || !fnName) {
        setCfbdStatus("error");
        setCfbdError("Supabase Functions URL or CFBD function name is missing in rc-config.js.");
        return;
      }
      if (!publishableKey) {
        setCfbdStatus("error");
        setCfbdError("Supabase publishable key is missing.");
        return;
      }

      try {
        const code = String(adminCode || "").trim();
        if (!code) throw new Error("Admin code is required.");
        const res = await fetch(`${baseUrl}/${fnName}`, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            "Content-Type": "application/json",
            "x-admin-code": code
          },
          body: JSON.stringify({ season })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch CFBD updates.");
        }
        const data = await res.json();
        const updates = Array.isArray(data?.updates) ? data.updates : [];
        setCfbdUpdates(updates);
        setCfbdStatus("ready");
      } catch (err) {
        setCfbdStatus("error");
        setCfbdError(err.message || "Failed to fetch CFBD updates.");
      }
    };

    const applyCfbdUpdate = async (update) => {
      const season = parseInt(seasonYear, 10);
      const bowlId = getCfbdBowlId(update);
      if (!bowlId || !Number.isFinite(season)) {
        setCfbdApplyStatus((prev) => ({ ...prev, [bowlId || "unknown"]: "error" }));
        setCfbdApplyErrors((prev) => ({ ...prev, [bowlId || "unknown"]: "Missing bowl ID or season year." }));
        return;
      }
      const payload = normalizeCfbdPayload(update);
      if (!Object.keys(payload).length) {
        setCfbdApplyStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setCfbdApplyErrors((prev) => ({ ...prev, [bowlId]: "No update fields available for this bowl." }));
        return;
      }

      setCfbdApplyStatus((prev) => ({ ...prev, [bowlId]: "saving" }));
      setCfbdApplyErrors((prev) => ({ ...prev, [bowlId]: "" }));
      try {
        await updateBowlGame(season, bowlId, payload);
        setCfbdApplyStatus((prev) => ({ ...prev, [bowlId]: "saved" }));
        if (typeof refresh === "function") refresh();
      } catch (err) {
        setCfbdApplyStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setCfbdApplyErrors((prev) => ({ ...prev, [bowlId]: err.message || "Failed to apply CFBD update." }));
      }
    };

    const applyAllCfbdUpdates = async (updates) => {
      if (!updates.length) return;
      if (!window.confirm(`Apply CFBD updates for ${updates.length} bowls?`)) return;
      for (const update of updates) {
        await applyCfbdUpdate(update);
      }
    };

    const handleSeasonSave = async () => {
      if (!window.confirm("Save season settings?")) return;
      setSettingsStatus("saving");
      setSettingsError("");
      const year = parseInt(seasonYear, 10);
      if (!Number.isFinite(year)) {
        setSettingsStatus("error");
        setSettingsError("Enter a valid season year.");
        return;
      }
      const modeValue = parseInt(seasonMode, 10);
      if (!Number.isFinite(modeValue)) {
        setSettingsStatus("error");
        setSettingsError("Select a valid season mode.");
        return;
      }
      try {
        await updateAppSetting("season_year", { value_int: year, value_text: null, value_bool: null });
        await updateAppSetting("season_mode", { value_int: modeValue, value_text: null, value_bool: null });
        setSettingsStatus("saved");
        if (typeof refresh === "function") refresh();
      } catch (err) {
        setSettingsStatus("error");
        setSettingsError(err.message || "Failed to update settings.");
      }
    };

    const handleAddChange = (field, value) => {
      setAddForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddBowl = async () => {
      if (!window.confirm("Add this bowl game?")) return;
      setAddStatus("saving");
      setAddError("");

      const season = parseInt(seasonYear, 10);
      if (!Number.isFinite(season)) {
        setAddStatus("error");
        setAddError("Season year is missing or invalid.");
        return;
      }

      const bowlId = String(addForm.bowlId || "").trim();
      const bowlName = String(addForm.bowlName || "").trim();
      const date = String(addForm.date || "").trim();
      const homeId = normalizeId(addForm.homeId);
      const awayId = normalizeId(addForm.awayId);
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      if (!bowlId || !bowlName || !date || !homeId || !awayId) {
        setAddStatus("error");
        setAddError("Bowl ID, Bowl Name, Date, Home ID, and Away ID are required.");
        return;
      }

      if (!datePattern.test(date)) {
        setAddStatus("error");
        setAddError("Date must be in YYYY-MM-DD format.");
        return;
      }

      if (homeId === awayId) {
        setAddStatus("error");
        setAddError("Home and Away teams must be different.");
        return;
      }

      try {
        await createBowlGame([{
          season,
          bowl_id: bowlId,
          sponsored_bowl_name: toNull(addForm.sponsoredName),
          bowl_name: bowlName,
          date,
          time: toNull(addForm.time),
          city: toNull(addForm.city),
          state: toNull(addForm.state),
          home_id: parseInt(homeId, 10),
          away_id: parseInt(awayId, 10),
          cfp: Boolean(addForm.cfp),
          weight: toNumberOrNull(addForm.weight)
        }]);
        setAddStatus("saved");
        setAddForm({
          bowlId: "",
          sponsoredName: "",
          bowlName: "",
          date: "",
          time: "",
          city: "",
          state: "",
          homeId: "",
          awayId: "",
          cfp: false,
          weight: ""
        });
        if (typeof refresh === "function") refresh();
      } catch (err) {
        setAddStatus("error");
        setAddError(err.message || "Failed to add bowl game.");
      }
    };

    const handleGameChange = (bowlId, field, value) => {
      setGameEdits((prev) => {
        const next = {
          ...prev,
          [bowlId]: {
            ...(prev[bowlId] || {}),
            [field]: value
          }
        };

        if (field === "homePts" || field === "awayPts") {
          const current = next[bowlId] || {};
          const homeScore = parseScore(current.homePts);
          const awayScore = parseScore(current.awayPts);
          if (homeScore !== null && awayScore !== null) {
            const game = (bowlGames || []).find((g) => normalizeId(g?.["Bowl ID"]) === bowlId);
            const homeId = normalizeId(game?.["Home ID"]);
            const awayId = normalizeId(game?.["Away ID"]);
            if (homeScore === awayScore) {
              next[bowlId].winnerId = "";
            } else {
              next[bowlId].winnerId = homeScore > awayScore ? homeId : awayId;
            }
          }
        }

        return next;
      });
    };

    const handleGameSave = async (game) => {
      const bowlId = normalizeId(game?.["Bowl ID"]);
      const season = parseInt(seasonYear, 10);
      const edits = gameEdits[bowlId] || {};
      const homeId = normalizeId(game?.["Home ID"]);
      const awayId = normalizeId(game?.["Away ID"]);
      const homeScore = parseScore(edits.homePts);
      const awayScore = parseScore(edits.awayPts);
      let winnerId = normalizeId(edits.winnerId);

      const confirmLabel = String(game?.["Sponsored Bowl Name"] || game?.["Bowl Name"] || "this bowl");
      if (!window.confirm(`Save result for ${confirmLabel}?`)) return;

      setGameStatus((prev) => ({ ...prev, [bowlId]: "saving" }));
      setGameErrors((prev) => ({ ...prev, [bowlId]: "" }));

      if (!bowlId || !Number.isFinite(season)) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Missing bowl ID or season year." }));
        return;
      }
      if (homeScore === null || awayScore === null) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Enter home and away scores." }));
        return;
      }

      if (homeScore === awayScore) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Scores cannot be tied." }));
        return;
      }

      if (!winnerId) {
        winnerId = homeScore > awayScore ? homeId : awayId;
      }

      if (winnerId !== homeId && winnerId !== awayId) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Winner must be the home or away team." }));
        return;
      }

      try {
        await updateBowlGame(season, bowlId, {
          home_pts: homeScore,
          away_pts: awayScore,
          winner_id: winnerId
        });
        setGameStatus((prev) => ({ ...prev, [bowlId]: "saved" }));
        if (typeof refresh === "function") refresh();
      } catch (err) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: err.message || "Failed to update result." }));
      }
    };

    if (loading) return <Spinner text="Loading admin console..." />;
    if (error) return <Err message={error?.message || "Failed to load league data."} />;

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-6 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Admin Console</h2>
            <p className="text-gray-600 text-sm">Hidden page for commissioner-only updates.</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">🔒</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Admin Access</h2>
                  <p className="text-xs text-slate-500">Required for all write actions on this page.</p>
                </div>
              </div>
            </div>
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Admin Code</label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter admin code"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">🗓️</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Season Controls</h2>
                  <p className="text-xs text-slate-500">Set the active season year and mode.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Season Year</label>
                <input
                  type="number"
                  min="2000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={seasonYear}
                  onChange={(e) => setSeasonYear(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Season Mode</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={seasonMode}
                  onChange={(e) => setSeasonMode(e.target.value)}
                >
                  <option value="">Select a mode</option>
                  <option value="1">1 - Preseason (picks open)</option>
                  <option value="2">2 - In Season (live results)</option>
                  <option value="3">3 - Final (season locked)</option>
                </select>
              </div>
              <div className="flex items-center gap-3 md:col-start-1 md:col-span-3">
                <button
                  onClick={handleSeasonSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm"
                >
                  Save Season Settings
                </button>
                {settingsStatus === "saving" && <span className="text-xs text-slate-500">Saving...</span>}
                {settingsStatus === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
              </div>
            </div>
            {settingsStatus === "error" && settingsError && (
              <div className="mt-3 text-xs text-red-600">{settingsError}</div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">🏈</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Pending Bowl Results</h2>
                  <p className="text-xs text-slate-500">Finalize scores and winners as games go final.</p>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                {pendingGames.length} pending
              </span>
            </div>
            {!pendingGames.length ? (
              <div className="text-sm text-slate-500">All bowl results are complete.</div>
            ) : (
              <div className="space-y-4">
                {pendingGames.map((game) => {
                  const bowlId = normalizeId(game?.["Bowl ID"]);
                  const edits = gameEdits[bowlId] || {};
                  const homeId = normalizeId(game?.["Home ID"]);
                  const awayId = normalizeId(game?.["Away ID"]);
                  const bowlName = String(game?.["Sponsored Bowl Name"] || game?.["Bowl Name"] || "").trim();
                  const date = String(game?.["Date"] || "").trim();
                  const time = String(game?.["Time"] || "").trim();
                  const status = gameStatus[bowlId] || "idle";
                  const errMsg = gameErrors[bowlId];
                  const homeScore = parseScore(edits.homePts);
                  const awayScore = parseScore(edits.awayPts);
                  const winnerLabel = (homeScore !== null && awayScore !== null && homeScore !== awayScore)
                    ? (homeScore > awayScore ? teamLabel(homeId) : teamLabel(awayId))
                    : "";

                  return (
                    <div key={bowlId} className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-md">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-base font-bold text-slate-900">{bowlName || "Bowl Game"}</div>
                          <div className="text-xs text-slate-500">{date}{date && time ? " · " : ""}{time}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            {teamLabel(awayId)} at {teamLabel(homeId)}
                          </div>
                          {winnerLabel && (
                            <div className="mt-2 text-xs font-semibold text-emerald-700">
                              Winner: {winnerLabel}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm"
                              placeholder="Away"
                              value={edits.awayPts ?? ""}
                              onChange={(e) => handleGameChange(bowlId, "awayPts", e.target.value)}
                            />
                            <span className="text-xs text-slate-500">at</span>
                            <input
                              type="number"
                              min="0"
                              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm"
                              placeholder="Home"
                              value={edits.homePts ?? ""}
                              onChange={(e) => handleGameChange(bowlId, "homePts", e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleGameSave(game)}
                              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm"
                            >
                              Save Result
                            </button>
                            {status === "saving" && <span className="text-xs text-slate-500">Saving...</span>}
                            {status === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
                          </div>
                        </div>
                      </div>
                      {status === "error" && errMsg && (
                        <div className="mt-2 text-xs text-red-600">{errMsg}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">⚡</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">CFBD Live Sync</h2>
                  <p className="text-xs text-slate-500">Pull live game data, then approve updates to the bowl_games table.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCfbdUpdates}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm"
                >
                  Fetch CFBD Updates
                </button>
                {cfbdPendingUpdates.length > 0 && (
                  <button
                    onClick={() => applyAllCfbdUpdates(cfbdPendingUpdates)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow-sm"
                  >
                    Apply All
                  </button>
                )}
              </div>
            </div>
            {cfbdStatus === "loading" && <div className="text-xs text-slate-500">Fetching updates...</div>}
            {cfbdStatus === "error" && cfbdError && (
              <div className="text-xs text-red-600">{cfbdError}</div>
            )}
            {cfbdStatus === "ready" && !cfbdUpdates.length && (
              <div className="text-sm text-slate-500">No CFBD updates returned.</div>
            )}
            {cfbdUpdates.length > 0 && (
              <div className="space-y-4">
                {(() => {
                  if (!cfbdPendingUpdates.length) {
                    return (
                      <div className="text-sm text-slate-500">
                        All CFBD updates are already completed in the database.
                      </div>
                    );
                  }

                  return cfbdPendingUpdates.map((update, index) => {
                    const bowlId = getCfbdBowlId(update) || `row-${index}`;
                    const payload = normalizeCfbdPayload(update);
                    const status = cfbdApplyStatus[bowlId] || "idle";
                    const errMsg = cfbdApplyErrors[bowlId];
                    const game = (bowlGames || []).find((g) => normalizeId(g?.["Bowl ID"]) === bowlId);
                    const bowlName = String(game?.["Sponsored Bowl Name"] || game?.["Bowl Name"] || "").trim();
                    const homeId = normalizeId(game?.["Home ID"]);
                    const awayId = normalizeId(game?.["Away ID"]);

                  return (
                    <div key={bowlId} className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-slate-50 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-base font-bold text-slate-900">
                            {bowlName || "Bowl Game"} {bowlId ? <span className="text-xs text-slate-500">({bowlId})</span> : null}
                          </div>
                          {(homeId || awayId) && (
                            <div className="text-xs text-slate-600 mt-1">
                              {teamLabel(awayId)} at {teamLabel(homeId)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => applyCfbdUpdate(update)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow-sm"
                          >
                            Apply Update
                          </button>
                          {status === "saving" && <span className="text-xs text-slate-500">Saving...</span>}
                          {status === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                        {Object.keys(payload).length ? (
                          Object.keys(payload).map((key) => {
                            const label = cfbdFieldLabels[key] || key;
                            const val = payload[key];
                            const isTeamField = key === "winner_id" || key === "favorite_id" || key === "home_id" || key === "away_id";
                            const display = isTeamField ? teamLabel(normalizeId(val)) || val : String(val);
                            return (
                              <div key={`${bowlId}-${key}`} className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-500">{label}</span>
                                <span className="text-slate-800">{display}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-500">No fields to apply.</div>
                        )}
                      </div>
                      {status === "error" && errMsg && (
                        <div className="mt-2 text-xs text-red-600">{errMsg}</div>
                      )}
                    </div>
                  );
                  });
                })()}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">➕</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add Bowl Game</h2>
                  <p className="text-xs text-slate-500">Create a new matchup for the current season.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Season Year</label>
                <input
                  type="text"
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                  value={seasonYear || ""}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bowl ID</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.bowlId}
                  onChange={(e) => handleAddChange("bowlId", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sponsored Bowl Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.sponsoredName}
                  onChange={(e) => handleAddChange("sponsoredName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bowl Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.bowlName}
                  onChange={(e) => handleAddChange("bowlName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  className="w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={addForm.date}
                  onChange={(e) => handleAddChange("date", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Time</label>
                <input
                  type="text"
                  placeholder="7:30 PM"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.time}
                  onChange={(e) => handleAddChange("time", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">City</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.city}
                  onChange={(e) => handleAddChange("city", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">State</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.state}
                  onChange={(e) => handleAddChange("state", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Home Team</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={addForm.homeId}
                  onChange={(e) => handleAddChange("homeId", e.target.value)}
                >
                  <option value="">Select home team</option>
                  {teamOptions.map((team) => (
                    <option key={`home-${team.id}`} value={team.id}>
                      {team.label} ({team.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Away Team</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={addForm.awayId}
                  onChange={(e) => handleAddChange("awayId", e.target.value)}
                >
                  <option value="">Select away team</option>
                  {teamOptions.map((team) => (
                    <option key={`away-${team.id}`} value={team.id}>
                      {team.label} ({team.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(addForm.cfp)}
                    onChange={(e) => handleAddChange("cfp", e.target.checked)}
                  />
                  CFP Game
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Weight</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addForm.weight}
                  onChange={(e) => handleAddChange("weight", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleAddBowl}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-sm"
              >
                Add Bowl Game
              </button>
              {addStatus === "saving" && <span className="text-xs text-slate-500">Saving...</span>}
              {addStatus === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
            </div>
            {addStatus === "error" && addError && (
              <div className="mt-3 text-xs text-red-600">{addError}</div>
            )}
          </div>

          
        </div>
      </div>
    );
  };

  window.RC.pages.AdminConsolePage = AdminConsolePage;
})();
