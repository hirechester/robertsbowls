/* Roberts Cup - Picks Page (Stage 16)
   Migrated to shared league data via RC.data.useLeagueData() (rc-data.js)

   Replace:
     public/js/rc-page-picks.js
   With this file (rename to rc-page-picks.js).
*/
(() => {
const { useMemo, useEffect, useRef, useState } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // --- PICKS PAGE ---
  const PicksPage = () => {
    // Shared league data (fetched once per session by rc-data.js)
    const { schedule, bowlGames, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const tableScrollRef = useRef(null);
    const mostRecentThRef = useRef(null);
    const didAutoScrollRef = useRef(false);
    const matchupScrollRef = useRef(null);
    const mostRecentMatchupRef = useRef(null);
    const didMatchupScrollRef = useRef(false);
    const [activeView, setActiveView] = useState("bigboard");


    const scheduleRows = useMemo(() => {
      if (!Array.isArray(schedule)) return [];
      return schedule.filter(g => g.Bowl && g.Date);
    }, [schedule]);

    const pickRows = useMemo(() => {
      if (!Array.isArray(picksIds)) return [];
      return picksIds.filter(p => p && p.Name);
    }, [picksIds]);



    const getTeamSchoolName = (id) => {
      const key = (id === null || id === undefined) ? "" : String(id).trim();
      if (!key) return "";

      const t = teamById && teamById[key];
      if (!t) return "";

      return (t["School Name"] || t.School || t.Team || t.Name || "").toString().trim();
    };

    const getFirstValue = (row, keys) => {
      for (let i = 0; i < keys.length; i++) {
        const val = row && row[keys[i]];
        if (val !== undefined && val !== null && String(val).trim() !== "") return val;
      }
      return "";
    };

    const normalizeId = (val) => {
      const s = String(val ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const toNumber = (val) => {
      const cleaned = String(val == null ? "" : val).replace(/[^0-9.+-]/g, "");
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? num : null;
    };

    const normalizeHex = (val, fallback) => {
      const raw = String(val || "").trim();
      const match = raw.match(/^#?([0-9a-fA-F]{6})$/);
      if (match) return `#${match[1].toUpperCase()}`;
      return fallback;
    };

    const networkLogoMap = {
      ESPN: "images/networks/espn.png",
      ESPN2: "images/networks/espn2.png",
      FOX: "images/networks/fox.png",
      CBS: "images/networks/cbs.png",
      ABC: "images/networks/abc.png",
      "HBO MAX": "images/networks/max.png",
      MAX: "images/networks/max.png",
      "THE CW NETWORK": "images/networks/cw.png",
      "THE CW": "images/networks/cw.png",
      CW: "images/networks/cw.png"
    };

    const getNetworkLogo = (network) => {
      if (!network) return "";
      const key = String(network).trim().toUpperCase();
      return networkLogoMap[key] || "";
    };

    const formatKickoffDate = (raw) => {
      const input = String(raw || "").trim();
      if (!input) return "";
      const parsed = new Date(input);
      if (!Number.isFinite(parsed.getTime())) return input;
      const day = parsed.getDate();
      const suffix = (n) => {
        if (n % 100 >= 11 && n % 100 <= 13) return "th";
        switch (n % 10) {
          case 1: return "st";
          case 2: return "nd";
          case 3: return "rd";
          default: return "th";
        }
      };
      const month = parsed.toLocaleString("en-US", { month: "long" });
      return `${month} ${day}${suffix(day)}`;
    };

    const getTeamMeta = (teamId, fallbackName) => {
      const key = (teamId === null || teamId === undefined) ? "" : String(teamId).trim();
      const t = (key && teamById) ? teamById[key] : null;
      const school = t ? String(t["School Name"] || t.School || t.Team || t.Name || "").trim() : "";
      const nickname = t ? String(t["Team Nickname"] || t.Nickname || t["Nick Name"] || t.Mascot || "").trim() : "";
      const shortName = t ? String(t["Short Name"] || t.Short || t.Abbreviation || t["Team Short"] || "").trim() : "";
      const logo = t ? String(t.Logo || t["Logo URL"] || t["Logo Url"] || t.LogoUrl || "").trim() : "";
      const hex = t ? String(t["Primary Hex"] || t.Hex || t.Color || t["Primary Color"] || "").trim() : "";
      const name = school || String(fallbackName || "").trim();
      return { name, nickname, shortName, logo, hex };
    };

    const formatGameHeader = (game) => {
      const favId = (game && (game["Favorite ID"] ?? game["FavoriteID"] ?? game["Fav ID"] ?? game["FavID"] ?? "")).toString().trim();
      const favoriteName = getTeamSchoolName(favId) || (game && (game["Favorite"] ?? game["Favorite Team"] ?? game["Fav"] ?? "")).toString().trim();
      const spreadRaw = (game && (game["Spread"] ?? game["Line"] ?? game["Vegas Spread"] ?? "")).toString().trim();
      const totalRaw = (game && (game["Total"] ?? game["O/U"] ?? game["Over/Under"] ?? game["OU"] ?? game["O-U"] ?? game["Vegas Total"] ?? "")).toString().trim();

      const left = favoriteName ? (spreadRaw ? `${favoriteName} ${spreadRaw}` : favoriteName) : "";
      const totalPart = totalRaw ? `Total: ${totalRaw}` : "";

      if (left && totalPart) return `${left} • ${totalPart}`;
      if (left) return left;
      if (totalPart) return totalPart;
      return (game && game.Bowl) ? String(game.Bowl) : "";
    };

    const getTeamLabel = (id) => {
      const key = (id === null || id === undefined) ? "" : String(id).trim();
      if (!key) return "";

      const t = teamById && teamById[key];
      if (!t) return "";

      const school = (t["School Name"] || t.School || t.Team || t.Name || "").toString().trim();

      const pickFirst = (...vals) => {
        for (const v of vals) {
          const s = (v === null || v === undefined) ? "" : String(v).trim();
          if (s) return s;
        }
        return "";
      };

      const cleanNum = (s) => {
        const raw = String(s || "").trim();
        if (!raw) return "";
        // Accept values like "#3", "3", "(3)", "Seed 3"
        const m = raw.match(/(\d+)/);
        return m ? m[1] : "";
      };

      const seedRaw = pickFirst(
        t["Seed"], t["Team Seed"], t["Seed #"], t["Seed Number"], t["Playoff Seed"], t["CFP Seed"]
      );
      const rankRaw = pickFirst(
        t["Ranking"], t["Rank"], t["AP Rank"], t["AP Ranking"], t["Rk"]
      );

      const seedNum = cleanNum(seedRaw);
      const rankNum = cleanNum(rankRaw);

      const prefix = seedNum ? `#${seedNum}` : (rankNum ? `#${rankNum}` : "");

      return prefix ? `${prefix} ${school}` : school;
    };

    const scoresByBowlId = useMemo(() => {
      const map = {};
      if (!Array.isArray(bowlGames)) return map;
      bowlGames.forEach((game) => {
        const bowlId = String(getFirstValue(game, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"])).trim();
        if (!bowlId) return;
        const homePts = toNumber(getFirstValue(game, ["Home Pts", "HomePts", "Home Points", "HomeScore", "Home Score", "Home PTS", "Home Final"]));
        const awayPts = toNumber(getFirstValue(game, ["Away Pts", "AwayPts", "Away Points", "AwayScore", "Away Score", "Away PTS", "Away Final"]));
        map[bowlId] = { homePts, awayPts };
      });
      return map;
    }, [bowlGames]);

    const sponsoredNameByBowlId = useMemo(() => {
      const map = {};
      if (!Array.isArray(bowlGames)) return map;
      bowlGames.forEach((game) => {
        const bowlId = String(getFirstValue(game, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"])).trim();
        if (!bowlId) return;
        const sponsoredName = String(getFirstValue(game, ["Sponsored Bowl Name", "Sponsored Bowl", "Bowl Sponsor", "Bowl Sponsorship"])).trim();
        if (sponsoredName) map[bowlId] = sponsoredName;
      });
      return map;
    }, [bowlGames]);

    // Auto-scroll to the most recently completed game in schedule order (keeps bowl order intact)
    const mostRecentCompletedIdx = useMemo(() => {
      let bestIdx = -1;
      scheduleRows.forEach((g, idx) => {
        const winnerId = String(getFirstValue(g, ["Winner ID", "WinnerID", "Winner Id", "WinnerId"])).trim();
        if (!winnerId) return;
        bestIdx = idx;
      });
      return bestIdx;
    }, [scheduleRows]);

    const matchupCards = useMemo(() => {
      const rows = Array.isArray(scheduleRows) ? scheduleRows : [];
      const players = Array.isArray(picksIds)
        ? picksIds.filter(p => p && p.Name).slice().sort((a, b) => String(a.Name).localeCompare(String(b.Name)))
        : [];

      return rows.map((game) => {
        const bowlId = String(game && game["Bowl ID"] ? game["Bowl ID"] : "").trim();
        const awayId = normalizeId(getFirstValue(game, ["Away ID", "AwayID", "Away Id", "AwayId"]));
        const homeId = normalizeId(getFirstValue(game, ["Home ID", "HomeID", "Home Id", "HomeId"]));
        const awayFallback = getFirstValue(game, ["Team 1", "Away Team", "Away", "Away Name"]);
        const homeFallback = getFirstValue(game, ["Team 2", "Home Team", "Home", "Home Name"]);
        const awayMeta = getTeamMeta(awayId, awayFallback);
        const homeMeta = getTeamMeta(homeId, homeFallback);

        const winnerId = normalizeId(getFirstValue(game, ["Winner ID", "WinnerID", "Winner Id", "WinnerId"]));
        const scoreFallback = bowlId && scoresByBowlId[bowlId] ? scoresByBowlId[bowlId] : {};
        const homePts = toNumber(getFirstValue(game, ["Home Pts", "HomePts", "Home Points", "HomeScore", "Home Score", "Home PTS", "Home Final"])) ?? scoreFallback.homePts;
        const awayPts = toNumber(getFirstValue(game, ["Away Pts", "AwayPts", "Away Points", "AwayScore", "Away Score", "Away PTS", "Away Final"])) ?? scoreFallback.awayPts;
        const isFinal = !!winnerId || (Number.isFinite(homePts) && Number.isFinite(awayPts));
        const winnerByScore = Number.isFinite(homePts) && Number.isFinite(awayPts)
          ? (homePts >= awayPts ? homeId : awayId)
          : "";
        const winnerKey = winnerId || winnerByScore;
        const homeWinner = !!winnerKey && homeId && winnerKey === homeId;
        const awayWinner = !!winnerKey && awayId && winnerKey === awayId;

        const favoriteId = normalizeId(getFirstValue(game, ["Favorite ID", "FavoriteID", "Fav ID", "FavID"]));
        const spreadRaw = String(getFirstValue(game, ["Spread", "Line", "Vegas Spread"])).trim();
        const totalRaw = String(getFirstValue(game, ["Total", "O/U", "Over/Under", "OU", "O-U", "Vegas Total"])).trim();
        const favoriteMeta = getTeamMeta(favoriteId, getFirstValue(game, ["Favorite", "Favorite Team", "Fav"]));
        const favoriteLabel = favoriteMeta.shortName || favoriteMeta.name;

        const picksAway = [];
        const picksHome = [];
        if (bowlId && players.length) {
          players.forEach((player) => {
            const pickId = normalizeId(player[bowlId]);
            if (!pickId) return;
            if (awayId && pickId === awayId) picksAway.push(player.Name);
            if (homeId && pickId === homeId) picksHome.push(player.Name);
          });
        }

        const sponsoredName = bowlId && sponsoredNameByBowlId[bowlId]
          ? sponsoredNameByBowlId[bowlId]
          : String(getFirstValue(game, ["Sponsored Bowl Name", "Sponsored Bowl", "Bowl Sponsor", "Bowl Sponsorship"]) || "").trim();
        const bowlName = sponsoredName || String(getFirstValue(game, ["Bowl", "Bowl Name", "BowlName"]) || "").trim();
        const dateLabel = String(getFirstValue(game, ["Date", "Game Date"]) || "").trim();
        const timeLabel = String(getFirstValue(game, ["Time", "Kickoff", "Kickoff Time"]) || "").trim();
        const networkLabel = String(getFirstValue(game, ["Network", "TV", "TV Network", "TV/Network"]) || "").trim();

        const awayHex = normalizeHex(awayMeta.hex, "#1F2937");
        const homeHex = normalizeHex(homeMeta.hex, "#111827");

        return {
          bowlId,
          bowlName,
          awayId,
          homeId,
          awayMeta,
          homeMeta,
          awayPts,
          homePts,
          isFinal,
          awayWinner,
          homeWinner,
          favoriteLabel,
          spreadRaw,
          totalRaw,
          picksAway,
          picksHome,
          dateLabel,
          timeLabel,
          networkLabel,
          gradient: `linear-gradient(90deg, ${awayHex} 0%, ${homeHex} 100%)`
        };
      });
    }, [scheduleRows, picksIds, teamById, scoresByBowlId, sponsoredNameByBowlId]);

    if (loading) return <LoadingSpinner text="Loading Picks..." />;
    if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load picks data"} />;


    useEffect(() => {
      if (activeView !== "bigboard") {
        didAutoScrollRef.current = false;
        return;
      }
      if (didAutoScrollRef.current) return;
      if (mostRecentCompletedIdx < 0) return;
      const container = tableScrollRef.current;
      if (!container) return;

      requestAnimationFrame(() => {
        const th = mostRecentThRef.current;
        if (!th) return;
        const cRect = container.getBoundingClientRect();
        const tRect = th.getBoundingClientRect();

        // Align the target column so it is fully visible (not tucked under the sticky Name column).
        // If we find a sticky header cell, use its right edge as the "pinned" boundary.
        const stickyTh = container.querySelector("thead th.sticky");
        const stickyRect = stickyTh ? stickyTh.getBoundingClientRect() : null;

        const gap = 16; // breathing room between sticky area and the target column
        const desiredLeft = stickyRect ? (stickyRect.right + gap) : (cRect.left + 24);

        const delta = (tRect.left - desiredLeft);
        container.scrollLeft += delta;

        didAutoScrollRef.current = true;
      });
    }, [activeView, mostRecentCompletedIdx]);

    useEffect(() => {
      if (activeView !== "matchups") {
        didMatchupScrollRef.current = false;
        return;
      }
      if (didMatchupScrollRef.current) return;
      if (mostRecentCompletedIdx < 0) return;
      const container = matchupScrollRef.current;
      const target = mostRecentMatchupRef.current;
      if (!container || !target) return;

      requestAnimationFrame(() => {
        const cRect = container.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        const desiredLeft = cRect.left + 16;
        const delta = tRect.left - desiredLeft;
        container.scrollLeft += delta;
        didMatchupScrollRef.current = true;
      });
    }, [activeView, mostRecentCompletedIdx]);

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-8 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Bowl Mania</h2>
            <p className="text-gray-600 text-sm">Every game, every prediction.</p>
          </div>
          <div className="mt-5 px-4 max-w-2xl mx-auto w-full">
            <div className="flex w-full rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveView("bigboard")}
                className={`flex-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeView === "bigboard" ? "bg-blue-900 text-white" : "text-gray-600 hover:text-blue-900"}`}
              >
                Bowls Big Board
              </button>
              <button
                type="button"
                onClick={() => setActiveView("matchups")}
                className={`flex-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeView === "matchups" ? "bg-blue-900 text-white" : "text-gray-600 hover:text-blue-900"}`}
              >
                Bowl Matchups
              </button>
            </div>
          </div>
        </div>

        {activeView === "bigboard" && (
          <div className="px-2 md:px-6 flex flex-col items-center">
            <div className="w-full max-w-[98%] md:max-w-[90%] shadow-2xl border border-gray-100 rounded-xl bg-white overflow-hidden">
              <div ref={tableScrollRef} className="overflow-x-auto w-full">
                <table className="min-w-max border-collapse w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-800">
                      <th className="sticky left-0 sticky-left bg-gray-50 p-2 text-left font-bold border-r border-b border-gray-100 min-w-[140px] sticky-col-shadow tracking-wide text-sm shadow-sm">
                        Name
                      </th>

                      {scheduleRows.map((game, idx) => (
                        <th
                          key={idx}
                          ref={idx === mostRecentCompletedIdx ? mostRecentThRef : null}
                          className="bg-gray-50 p-2 font-bold border-r border-b border-gray-100 whitespace-nowrap min-w-[220px] text-center shadow-sm"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-gray-900 text-[14px]">{game.Bowl}</span>
                            <span className="text-gray-500 text-[11px] font-normal">
                              {game.Date} • {game.Time} • {game.Network}
                            </span>
                            <span className="text-gray-500 text-[11px] font-normal">{formatGameHeader(game)}</span>
                          </div>
                        </th>
                      ))}

                      <th className="bg-gray-50 p-2 font-bold border-b border-gray-100 min-w-[100px] text-center tracking-wide text-sm shadow-sm">
                        Tiebreaker Score
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {pickRows.map((player, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="group hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <td className="sticky left-0 sticky-left p-2 text-left font-bold text-gray-900 border-r-2 border-gray-100 sticky-col-shadow bg-white">
                          {player.Name}
                        </td>

                        {scheduleRows.map((game, colIndex) => (
                          <td key={colIndex} className="p-2 text-center border-r border-gray-100 last:border-0">
                            {(() => {
                              const bowlId = (game["Bowl ID"] ?? "").toString().trim();
                              const pickId = bowlId ? player[bowlId] : "";
                              const pickName = getTeamLabel(pickId);
                              const winnerName = getTeamLabel(game["Winner ID"]) || (game.Winner || "");
                              return <StatusPill pick={pickName} winner={winnerName} />;
                            })()}
                          </td>
                        ))}

                        <td className="p-2 text-center text-gray-700 font-medium text-[14px] border-l border-gray-100">
                          {player["Tiebreaker Score"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeView === "matchups" && (
          <div className="px-4 pb-6">
            <div className="max-w-6xl mx-auto">
              <style>{`
                .matchups-scroll {
                  scrollbar-width: none;
                }
                .matchups-scroll::-webkit-scrollbar {
                  height: 0;
                }
              `}</style>
              <div
                ref={matchupScrollRef}
                className="matchups-scroll flex gap-4 overflow-x-auto pb-3 px-1"
                style={{ scrollSnapType: "x mandatory" }}
                aria-label="Bowl matchups carousel"
              >
                {matchupCards.map((card, idx) => {
                  const awayName = card.awayMeta.name || "Away Team";
                  const homeName = card.homeMeta.name || "Home Team";
                  const statusLine = card.isFinal
                    ? "Final"
                    : [formatKickoffDate(card.dateLabel), card.timeLabel].filter(Boolean).join(" • ");
                  const networkLogo = getNetworkLogo(card.networkLabel);
                  const favoriteLine = card.favoriteLabel && card.spreadRaw
                    ? `${card.favoriteLabel} ${card.spreadRaw}`
                    : "—";
                  const totalLine = card.totalRaw ? card.totalRaw : "—";
                  return (
                    <div
                      key={card.bowlId || card.bowlName || `${awayName}-${homeName}`}
                      ref={idx === mostRecentCompletedIdx ? mostRecentMatchupRef : null}
                      className="relative min-w-[320px] md:min-w-[360px] max-w-[420px] min-h-[560px] md:min-h-[620px] rounded-2xl overflow-hidden shadow-sm text-white"
                      style={{ background: card.gradient, scrollSnapAlign: "start" }}
                      aria-label={`${card.bowlName || "Bowl Matchup"} card`}
                    >
                      <div className="absolute inset-0 bg-slate-900/35" aria-hidden="true"></div>
                      <div className="relative p-4 md:p-5 flex flex-col gap-3">
                        <div className="text-[11px] uppercase tracking-widest text-white/70">
                          {card.bowlName || "Bowl Game"}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-white/80">
                            {statusLine || "TBD"}
                          </div>
                          {card.networkLabel && (
                            <div className="flex items-center justify-center">
                              {networkLogo ? (
                                <img src={networkLogo} alt={card.networkLabel} className="h-5 object-contain drop-shadow" loading="lazy" />
                              ) : (
                                <div className="text-[11px] text-white/70">{card.networkLabel}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {card.awayMeta.logo ? (
                                <img src={card.awayMeta.logo} alt={awayName} className="w-12 h-12 object-contain drop-shadow" loading="lazy" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">—</div>
                              )}
                              <div className={`text-sm font-semibold ${card.awayWinner ? "text-white" : "text-white/80"}`}>{awayName}</div>
                            </div>
                            {card.isFinal && (
                              <div className={`text-4xl font-black leading-none ${card.awayWinner ? "text-white" : "text-white/70"}`}>
                                {Number.isFinite(card.awayPts) ? card.awayPts : "—"}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {card.homeMeta.logo ? (
                                <img src={card.homeMeta.logo} alt={homeName} className="w-12 h-12 object-contain drop-shadow" loading="lazy" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">—</div>
                              )}
                              <div className={`text-sm font-semibold ${card.homeWinner ? "text-white" : "text-white/80"}`}>{homeName}</div>
                            </div>
                            {card.isFinal && (
                              <div className={`text-4xl font-black leading-none ${card.homeWinner ? "text-white" : "text-white/70"}`}>
                                {Number.isFinite(card.homePts) ? card.homePts : "—"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 text-sm">
                          <div className="rounded-xl bg-white/15 border border-white/15 px-3 py-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                              {awayName} ({card.picksAway.length})
                            </div>
                            <div className="text-sm text-white/85">
                              {card.picksAway.length ? card.picksAway.join(", ") : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/15 border border-white/15 px-3 py-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                              {homeName} ({card.picksHome.length})
                            </div>
                            <div className="text-sm text-white/85">
                              {card.picksHome.length ? card.picksHome.join(", ") : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-2">
                          <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Betting Odds</div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/75">Favorite</span>
                            <span className="font-semibold">{favoriteLine}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-white/75">O/U</span>
                            <span className="font-semibold">{totalLine}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  RC.pages.PicksPage = PicksPage;
})();
