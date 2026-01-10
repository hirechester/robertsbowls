/* Roberts Cup - Predictions Page (hidden menu)
   Client-only page for collecting user picks (no backend).
*/
(() => {
  const { useMemo, useState } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const TEMPLATE_CUSTOM = "custom";
  const TEMPLATE_ALPHA = "alpha";
  const TEMPLATE_SOUTH = "south";

  const BRACKET_SLOTS = {
    OPEN_5_12: "cfp-open-5-12",
    OPEN_6_11: "cfp-open-6-11",
    OPEN_7_10: "cfp-open-7-10",
    OPEN_8_9: "cfp-open-8-9",
    QF_4: "cfp-qf-4",
    QF_3: "cfp-qf-3",
    QF_2: "cfp-qf-2",
    QF_1: "cfp-qf-1",
    SF_1_4: "cfp-sf-1-4",
    SF_2_3: "cfp-sf-2-3",
    CHAMP: "cfp-champ"
  };

  const pickFirst = (row, keys) => {
    for (const k of keys) {
      const val = row && row[k];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };

  const normalizeId = (val) => {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const to01 = (val) => {
    const s = String(val || "").trim();
    if (!s) return "0";
    if (/^(1|true|yes|y)$/i.test(s)) return "1";
    return "0";
  };

  const cleanNumber = (val) => {
    const raw = String(val || "").trim();
    if (!raw) return "";
    const match = raw.match(/(\d+)/);
    return match ? match[1] : "";
  };

  const getTeamSeedRank = (team) => {
    if (!team) return "";
    const seedRaw = pickFirst(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
    const rankRaw = pickFirst(team, ["Ranking", "Rank", "AP Rank", "AP Ranking", "Rk"]);
    const seedNum = cleanNumber(seedRaw);
    const rankNum = cleanNumber(rankRaw);
    const value = seedNum || rankNum;
    return value ? `#${value}` : "";
  };

  const getTeamLatitude = (team) => {
    if (!team) return null;
    const raw = pickFirst(team, ["Latitude", "Lat", "Lat.", "Team Lat", "Team Latitude"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const getTeamMeta = (teamById, teamId, fallback) => {
    const key = teamId ? String(teamId).trim() : "";
    const team = key && teamById ? teamById[key] : null;
    const school = team ? String(team["School Name"] || team.School || team.Team || team.Name || "").trim() : "";
    const nickname = team ? String(team["Team Nickname"] || team.Nickname || team["Nick Name"] || team.Mascot || "").trim() : "";
    const logo = team ? String(team.Logo || team["Logo URL"] || team["Logo Url"] || team.LogoUrl || "").trim() : "";
    const hex = team ? String(team["Primary Hex"] || team.Hex || team.Color || team["Primary Color"] || "").trim() : "";
    const seedRank = getTeamSeedRank(team);
    const name = school || String(fallback || "").trim();
    return { name, nickname, logo, hex, seedRank, team };
  };

  const compareAlpha = (aName, bName) => {
    const a = String(aName || "").toLowerCase();
    const b = String(bName || "").toLowerCase();
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  };

  const toRgba = (hex, alpha) => {
    const raw = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return "";
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = Number.isFinite(alpha) ? alpha : 0.12;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const pickTemplateTeam = (templateKey, awayMeta, homeMeta) => {
    if (!awayMeta?.team || !homeMeta?.team) return awayMeta?.team ? "away" : (homeMeta?.team ? "home" : "");
    if (templateKey === TEMPLATE_ALPHA) {
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_SOUTH) {
      const awayLat = getTeamLatitude(awayMeta.team);
      const homeLat = getTeamLatitude(homeMeta.team);
      if (Number.isFinite(awayLat) && Number.isFinite(homeLat)) {
        return awayLat <= homeLat ? "away" : "home";
      }
      if (Number.isFinite(awayLat)) return "away";
      if (Number.isFinite(homeLat)) return "home";
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    return "";
  };

  const PredictionsPage = () => {
    const { bowlGames, teams, teamById, loading, error } = RC.data.useLeagueData();
    const [pickerName, setPickerName] = useState("");
    const [template, setTemplate] = useState(TEMPLATE_CUSTOM);
    const [picksByBowlId, setPicksByBowlId] = useState({});
    const [tiebreakerScore, setTiebreakerScore] = useState("");

    const gamesData = useMemo(() => {
      if (!Array.isArray(bowlGames)) return { cfp: [], nonCfp: [] };
      const normalized = bowlGames
        .map((row, idx) => {
          const bowlId = normalizeId(pickFirst(row, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"]));
          const homeId = normalizeId(pickFirst(row, ["Home ID", "HomeID"]));
          const awayId = normalizeId(pickFirst(row, ["Away ID", "AwayID"]));
          const name = pickFirst(row, ["Bowl Name", "Bowl", "BowlName"]);
          const isCfp = to01(pickFirst(row, ["CFP?", "CFP", "CFP ?", "Playoff", "Playoff?"])) === "1";
          const network = pickFirst(row, ["TV", "Network"]);
          return {
            idx,
            bowlId,
            name,
            date: pickFirst(row, ["Date"]),
            time: pickFirst(row, ["Time"]),
            network,
            homeId,
            awayId,
            isCfp,
            raw: row
          };
        })
        .filter((g) => g.bowlId && g.name);

      const cfp = normalized.filter((g) => g.isCfp);
      const nonCfp = normalized.filter((g) => !g.isCfp);
      return { cfp, nonCfp };
    }, [bowlGames]);

    const bracketBase = useMemo(() => {
      if (!Array.isArray(teams)) return null;
      const seeded = teams
        .map((team) => {
          const teamId = normalizeId(pickFirst(team, ["Team ID", "TeamID", "ID", "Id"]));
          const seedRaw = pickFirst(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
          const seedNum = parseInt(cleanNumber(seedRaw), 10);
          if (!teamId || !Number.isFinite(seedNum)) return null;
          return { teamId, seedNum };
        })
        .filter(Boolean)
        .sort((a, b) => a.seedNum - b.seedNum);

      if (!seeded.length) return null;
      const seedToId = {};
      seeded.forEach(({ teamId, seedNum }) => {
        if (!seedToId[seedNum]) seedToId[seedNum] = teamId;
      });

      return {
        seedToId,
        opening: [
          { slotId: BRACKET_SLOTS.OPEN_5_12, seedA: 5, seedB: 12, label: "5 vs 12" },
          { slotId: BRACKET_SLOTS.OPEN_6_11, seedA: 6, seedB: 11, label: "6 vs 11" },
          { slotId: BRACKET_SLOTS.OPEN_7_10, seedA: 7, seedB: 10, label: "7 vs 10" },
          { slotId: BRACKET_SLOTS.OPEN_8_9, seedA: 8, seedB: 9, label: "8 vs 9" }
        ],
        quarterfinals: [
          { slotId: BRACKET_SLOTS.QF_4, seed: 4, from: BRACKET_SLOTS.OPEN_5_12, label: "4 vs Winner 5/12" },
          { slotId: BRACKET_SLOTS.QF_3, seed: 3, from: BRACKET_SLOTS.OPEN_6_11, label: "3 vs Winner 6/11" },
          { slotId: BRACKET_SLOTS.QF_2, seed: 2, from: BRACKET_SLOTS.OPEN_7_10, label: "2 vs Winner 7/10" },
          { slotId: BRACKET_SLOTS.QF_1, seed: 1, from: BRACKET_SLOTS.OPEN_8_9, label: "1 vs Winner 8/9" }
        ],
        semifinals: [
          { slotId: BRACKET_SLOTS.SF_1_4, fromA: BRACKET_SLOTS.QF_4, fromB: BRACKET_SLOTS.QF_1, label: "Semifinal (1/4)" },
          { slotId: BRACKET_SLOTS.SF_2_3, fromA: BRACKET_SLOTS.QF_3, fromB: BRACKET_SLOTS.QF_2, label: "Semifinal (2/3)" }
        ],
        championship: { slotId: BRACKET_SLOTS.CHAMP, fromA: BRACKET_SLOTS.SF_1_4, fromB: BRACKET_SLOTS.SF_2_3, label: "National Championship" }
      };
    }, [teams]);

    const bracketGames = useMemo(() => {
      if (!bracketBase) return null;
      const resolveSeed = (seed) => bracketBase.seedToId[seed] || "";
      const resolveWinner = (slotId) => picksByBowlId[slotId] || "";

      const opening = bracketBase.opening.map((game) => ({
        slotId: game.slotId,
        label: game.label,
        awayId: resolveSeed(game.seedA),
        homeId: resolveSeed(game.seedB),
        awayFallback: `Seed ${game.seedA}`,
        homeFallback: `Seed ${game.seedB}`,
        allow: null
      }));

      const quarterfinals = bracketBase.quarterfinals.map((game) => {
        const awayId = resolveSeed(game.seed);
        const homeId = resolveWinner(game.from);
        const allow = awayId && homeId ? new Set([awayId, homeId]) : new Set();
        return {
          slotId: game.slotId,
          label: game.label,
          awayId,
          homeId,
          awayFallback: `Seed ${game.seed}`,
          homeFallback: "Winner of Opening Round",
          allow,
          locked: allow.size < 2
        };
      });

      const semifinals = bracketBase.semifinals.map((game) => {
        const awayId = resolveWinner(game.fromA);
        const homeId = resolveWinner(game.fromB);
        const allow = awayId && homeId ? new Set([awayId, homeId]) : new Set();
        return {
          slotId: game.slotId,
          label: game.label,
          awayId,
          homeId,
          awayFallback: "Winner of Quarterfinal",
          homeFallback: "Winner of Quarterfinal",
          allow,
          locked: allow.size < 2
        };
      });

      const champAway = resolveWinner(bracketBase.championship.fromA);
      const champHome = resolveWinner(bracketBase.championship.fromB);
      const champAllow = champAway && champHome ? new Set([champAway, champHome]) : new Set();
      const championship = {
        slotId: bracketBase.championship.slotId,
        label: bracketBase.championship.label,
        awayId: champAway,
        homeId: champHome,
        awayFallback: "Winner of Semifinal",
        homeFallback: "Winner of Semifinal",
        allow: champAllow,
        locked: champAllow.size < 2
      };

      return { opening, quarterfinals, semifinals, championship };
    }, [bracketBase, picksByBowlId]);

    const applyTemplate = (templateKey) => {
      if (!templateKey || templateKey === TEMPLATE_CUSTOM) return;
      const nextPicks = {};
      const allGames = gamesData.nonCfp;
      allGames.forEach((game) => {
        const awayMeta = getTeamMeta(teamById, game.awayId, pickFirst(game.raw, ["Team 1", "Away Team", "Away"]));
        const homeMeta = getTeamMeta(teamById, game.homeId, pickFirst(game.raw, ["Team 2", "Home Team", "Home"]));
        const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta);
        const pickId = choice === "away" ? game.awayId : (choice === "home" ? game.homeId : "");
        if (pickId) nextPicks[game.bowlId] = pickId;
      });

      if (bracketBase) {
        bracketBase.opening.forEach((game) => {
          const awayId = bracketBase.seedToId[game.seedA];
          const homeId = bracketBase.seedToId[game.seedB];
          const awayMeta = getTeamMeta(teamById, awayId, `Seed ${game.seedA}`);
          const homeMeta = getTeamMeta(teamById, homeId, `Seed ${game.seedB}`);
          const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta);
          const pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        bracketBase.quarterfinals.forEach((game) => {
          const awayId = bracketBase.seedToId[game.seed];
          const homeId = nextPicks[game.from];
          if (!awayId || !homeId) return;
          const awayMeta = getTeamMeta(teamById, awayId, `Seed ${game.seed}`);
          const homeMeta = getTeamMeta(teamById, homeId, "Winner");
          const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta);
          const pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        bracketBase.semifinals.forEach((game) => {
          const awayId = nextPicks[game.fromA];
          const homeId = nextPicks[game.fromB];
          if (!awayId || !homeId) return;
          const awayMeta = getTeamMeta(teamById, awayId, "Winner");
          const homeMeta = getTeamMeta(teamById, homeId, "Winner");
          const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta);
          const pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        const champAway = nextPicks[bracketBase.semifinals[0].slotId];
        const champHome = nextPicks[bracketBase.semifinals[1].slotId];
        if (champAway && champHome) {
          const awayMeta = getTeamMeta(teamById, champAway, "Winner");
          const homeMeta = getTeamMeta(teamById, champHome, "Winner");
          const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta);
          const pickId = choice === "away" ? champAway : (choice === "home" ? champHome : "");
          if (pickId) nextPicks[BRACKET_SLOTS.CHAMP] = pickId;
        }
      }

      setPicksByBowlId(nextPicks);
    };

    const handleTemplateChange = (value) => {
      setTemplate(value);
      applyTemplate(value);
    };

    const setPick = (bowlId, teamId) => {
      setPicksByBowlId((prev) => ({ ...prev, [bowlId]: teamId }));
      if (template !== TEMPLATE_CUSTOM) setTemplate(TEMPLATE_CUSTOM);
    };

    const renderGamePick = (game, options = {}) => {
      const slotId = game.bowlId || game.slotId;
      const selectedId = picksByBowlId[slotId] || "";
      const awayMeta = getTeamMeta(teamById, game.awayId, game.awayFallback || pickFirst(game.raw, ["Team 1", "Away Team", "Away"]));
      const homeMeta = getTeamMeta(teamById, game.homeId, game.homeFallback || pickFirst(game.raw, ["Team 2", "Home Team", "Home"]));
      const allowed = options.allowedIds || null;

      const renderTeamButton = (meta, teamId, alignRight) => {
        const isSelected = selectedId && selectedId === teamId;
        const isAllowed = !allowed || allowed.has(teamId);
        const borderColor = isSelected && meta.hex ? meta.hex : "";
        const highlight = isSelected ? toRgba(borderColor, 0.12) : "";
        return (
          <button
            type="button"
            onClick={() => setPick(slotId, teamId)}
            disabled={!teamId || !isAllowed}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all text-center w-full ${
              isSelected
                ? "bg-slate-50 shadow-md"
                : "bg-white hover:bg-slate-50"
            } ${!teamId || !isAllowed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={borderColor ? { borderColor, backgroundColor: highlight || undefined } : undefined}
          >
            {meta.logo ? (
              <img src={meta.logo} alt={meta.name} className="w-16 h-16 object-contain drop-shadow" loading="lazy" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">Logo</div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-bold text-slate-900">
                {meta.seedRank ? `${meta.seedRank} ${meta.name || "TBD"}` : (meta.name || "TBD")}
              </div>
              <div className="text-xs text-slate-500">{meta.nickname || " "}</div>
            </div>
          </button>
        );
      };

      return (
        <div key={slotId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-center">
            <div className="text-sm font-bold text-slate-800">{game.name || game.label}</div>
            {game.date && (
              <div className="text-[11px] font-semibold text-gray-500">
                {[game.date, game.time, game.network].filter(Boolean).join(" • ")}
              </div>
            )}
          </div>
          <div className="p-4 flex items-center justify-center gap-3">
            <div className="flex-1">{renderTeamButton(awayMeta, game.awayId, true)}</div>
            <div className="flex-1">{renderTeamButton(homeMeta, game.homeId, false)}</div>
          </div>
        </div>
      );
    };

    if (loading) return <RC.ui.LoadingSpinner text="Loading predictions data..." />;
    if (error) return <RC.ui.ErrorMessage message={error.message || "Failed to load data."} />;

    const champName = bracketGames?.championship?.label || "National Championship";

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="pt-8 pb-8 px-4">
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-3xl text-blue-900 font-bold mb-1">Predictions</h2>
              <p className="text-gray-600 text-sm">Pick the Winners</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  value={pickerName}
                  onChange={(e) => setPickerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full md:w-60 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full md:w-64 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={TEMPLATE_CUSTOM}>Templates</option>
                  <option value={TEMPLATE_ALPHA}>Alphabetical Order</option>
                  <option value={TEMPLATE_SOUTH}>Southern Most Team</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPicksByBowlId({});
                    setTiebreakerScore("");
                    setTemplate(TEMPLATE_CUSTOM);
                  }}
                  className="w-full md:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Clear Selections
                </button>
              </div>
            </div>
          </div>

          {bracketGames && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-slate-900">CFP Playoff Bracket</h2>
                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">12-Team Bracket</div>
              </div>
              <div className="grid gap-4">
                <div className="text-sm font-bold text-slate-700">Opening Round</div>
                {bracketGames.opening.map((game) => renderGamePick(game))}
              </div>
              <div className="mt-6 grid gap-4">
                <div className="text-sm font-bold text-slate-700">Quarterfinals</div>
                {bracketGames.quarterfinals.map((game) => (
                  <div key={game.slotId}>
                    {game.locked && (
                      <div className="text-xs text-slate-500 mb-2">Pick the opening round winner to unlock this matchup.</div>
                    )}
                    {renderGamePick(game, { allowedIds: game.allow })}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4">
                <div className="text-sm font-bold text-slate-700">Semifinals</div>
                {bracketGames.semifinals.map((game) => (
                  <div key={game.slotId}>
                    {game.locked && (
                      <div className="text-xs text-slate-500 mb-2">Pick both quarterfinal winners to unlock this matchup.</div>
                    )}
                    {renderGamePick(game, { allowedIds: game.allow })}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                {bracketGames.championship.locked && (
                  <div className="text-xs text-slate-500 mb-2">Pick both semifinal winners to unlock the title matchup.</div>
                )}
                {renderGamePick(bracketGames.championship, { allowedIds: bracketGames.championship.allow })}
                <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800">Tiebreaker Score</div>
                  <div className="text-xs text-slate-500 mb-3">{champName}</div>
                  <input
                    type="number"
                    min="0"
                    value={tiebreakerScore}
                    onChange={(e) => setTiebreakerScore(e.target.value)}
                    placeholder="Enter total points"
                    className="w-full md:w-64 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">All Other Bowls</h2>
            <div className="grid gap-4">
              {gamesData.nonCfp.map((game) => renderGamePick(game))}
            </div>
          </section>

        </div>
      </div>
    );
  };

  RC.pages.PredictionsPage = PredictionsPage;
})();
