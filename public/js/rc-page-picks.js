/* Roberts Cup - Picks Page (Stage 16)
   Migrated to shared league data via RC.data.useLeagueData() (rc-data.js)

   Replace:
     public/js/rc-page-picks.js
   With this file (rename to rc-page-picks.js).
*/
(() => {
const { useMemo, useEffect, useRef } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // --- PICKS PAGE ---
  const PicksPage = () => {
    // Shared league data (fetched once per session by rc-data.js)
    const { schedule, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const tableScrollRef = useRef(null);
    const mostRecentThRef = useRef(null);
    const didAutoScrollRef = useRef(false);


    const scheduleRows = useMemo(() => {
      if (!Array.isArray(schedule)) return [];
      return schedule.filter(g => g.Bowl && g.Date);
    }, [schedule]);

    // Auto-scroll to the most recently completed game (keeps bowl order intact)
    const mostRecentCompletedIdx = useMemo(() => {
      let bestIdx = -1;
      let bestTs = -1;
      scheduleRows.forEach((g, idx) => {
        const winnerId = String(g && (g['Winner ID'] ?? g.WinnerID ?? g.WinnerId ?? g.winnerId ?? g.winnerID ?? '')).trim();
        if (!winnerId) return;
        const dateStr = String(g && (g.Date ?? g['Date'] ?? '')).trim();
        const timeStr = String(g && (g.Time ?? g['Time'] ?? '')).trim();
        let ts = -1;
        if (dateStr) {
          const d = new Date(dateStr + (timeStr ? ` ${timeStr}` : ''));
          ts = d.getTime();
        }
        if (!Number.isFinite(ts) || ts <= 0) ts = idx;
        if (ts >= bestTs) {
          bestTs = ts;
          bestIdx = idx;
        }
      });
      return bestIdx;
    }, [scheduleRows]);


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

    if (loading) return <LoadingSpinner text="Loading Picks..." />;
    if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load picks data"} />;


    useEffect(() => {
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
    }, [mostRecentCompletedIdx]);

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-8 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Bowl Mania</h2>
            <p className="text-gray-600 text-sm">Every game, every prediction.</p>
          </div>
        </div>

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
      </div>
    );
  };

  RC.pages.PicksPage = PicksPage;
})();