(() => {
  const { useEffect, useMemo, useState } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const AdminConsolePage = () => {
    const { loading, error, appSettings, bowlGames, teamById, refresh } = RC.data.useLeagueData();
    const { LoadingSpinner, ErrorMessage } = (RC.ui || {});
    const Spinner = LoadingSpinner || (({ text }) => <div className="px-4 py-8 text-gray-600">{text || "Loading..."}</div>);
    const Err = ErrorMessage || (({ message }) => <div className="px-4 py-8 text-red-600">{message}</div>);

    const [seasonYear, setSeasonYear] = useState("");
    const [seasonMode, setSeasonMode] = useState("");
    const [settingsStatus, setSettingsStatus] = useState("idle");
    const [settingsError, setSettingsError] = useState("");
    const [gameEdits, setGameEdits] = useState({});
    const [gameStatus, setGameStatus] = useState({});
    const [gameErrors, setGameErrors] = useState({});

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

    useEffect(() => {
      if (!appSettings) return;
      const year = getSettingInt(appSettings, "season_year");
      const mode = getSettingText(appSettings, "season_mode");
      setSeasonYear(Number.isFinite(year) ? String(year) : "");
      setSeasonMode(mode);
    }, [appSettings]);

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
      const table = RC.SUPABASE_APP_SETTINGS_TABLE || "app_settings";
      const url = `${baseUrl}/rest/v1/${table}?key=eq.${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
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
      const table = RC.SUPABASE_BOWL_GAMES_TABLE || "bowl_games";
      const url = `${baseUrl}/rest/v1/${table}?season=eq.${encodeURIComponent(season)}&bowl_id=eq.${encodeURIComponent(bowlId)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update bowl game.");
      }
    };

    const parseScore = (val) => {
      const s = String(val ?? "").trim();
      if (s === "") return null;
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : null;
    };

    const handleSeasonSave = async () => {
      setSettingsStatus("saving");
      setSettingsError("");
      const year = parseInt(seasonYear, 10);
      if (!Number.isFinite(year)) {
        setSettingsStatus("error");
        setSettingsError("Enter a valid season year.");
        return;
      }
      const modeText = String(seasonMode || "").trim();
      try {
        await updateAppSetting("season_year", { value_int: year, value_text: null, value_bool: null });
        await updateAppSetting("season_mode", { value_text: modeText, value_int: null, value_bool: null });
        setSettingsStatus("saved");
        if (typeof refresh === "function") refresh();
      } catch (err) {
        setSettingsStatus("error");
        setSettingsError(err.message || "Failed to update settings.");
      }
    };

    const handleGameChange = (bowlId, field, value) => {
      setGameEdits((prev) => ({
        ...prev,
        [bowlId]: {
          ...(prev[bowlId] || {}),
          [field]: value
        }
      }));
    };

    const handleGameSave = async (game) => {
      const bowlId = normalizeId(game?.["Bowl ID"]);
      const season = parseInt(seasonYear, 10);
      const edits = gameEdits[bowlId] || {};
      const homeId = normalizeId(game?.["Home ID"]);
      const awayId = normalizeId(game?.["Away ID"]);
      const homeScore = parseScore(edits.homePts);
      const awayScore = parseScore(edits.awayPts);
      const winnerId = normalizeId(edits.winnerId);

      setGameStatus((prev) => ({ ...prev, [bowlId]: "saving" }));
      setGameErrors((prev) => ({ ...prev, [bowlId]: "" }));

      if (!bowlId || !Number.isFinite(season)) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Missing bowl ID or season year." }));
        return;
      }
      if (homeScore === null || awayScore === null || !winnerId) {
        setGameStatus((prev) => ({ ...prev, [bowlId]: "error" }));
        setGameErrors((prev) => ({ ...prev, [bowlId]: "Enter home/away scores and select a winner." }));
        return;
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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-500 mt-1">Hidden page for commissioner-only updates.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Season Controls</h2>
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
                <input
                  type="text"
                  placeholder="preseason / in-season / final"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={seasonMode}
                  onChange={(e) => setSeasonMode(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSeasonSave}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
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

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Pending Bowl Results</h2>
              <span className="text-xs text-slate-500">{pendingGames.length} games need results</span>
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

                  return (
                    <div key={bowlId} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{bowlName || "Bowl Game"}</div>
                          <div className="text-xs text-slate-500">{date}{date && time ? " · " : ""}{time}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            {teamLabel(awayId)} at {teamLabel(homeId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            placeholder="Away"
                            value={edits.awayPts ?? ""}
                            onChange={(e) => handleGameChange(bowlId, "awayPts", e.target.value)}
                          />
                          <span className="text-xs text-slate-500">at</span>
                          <input
                            type="number"
                            min="0"
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            placeholder="Home"
                            value={edits.homePts ?? ""}
                            onChange={(e) => handleGameChange(bowlId, "homePts", e.target.value)}
                          />
                          <select
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            value={edits.winnerId ?? ""}
                            onChange={(e) => handleGameChange(bowlId, "winnerId", e.target.value)}
                          >
                            <option value="">Winner</option>
                            <option value={awayId}>{teamLabel(awayId) || "Away"}</option>
                            <option value={homeId}>{teamLabel(homeId) || "Home"}</option>
                          </select>
                          <button
                            onClick={() => handleGameSave(game)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                          >
                            Save Result
                          </button>
                          {status === "saving" && <span className="text-xs text-slate-500">Saving...</span>}
                          {status === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
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
        </div>
      </div>
    );
  };

  window.RC.pages.AdminConsolePage = AdminConsolePage;
})();
