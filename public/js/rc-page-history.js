(() => {
  const { useMemo, useState } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // 8. HISTORY PAGE
  const HistoryPage = () => {
    // Shared league data (loaded once per session by rc-data.js)
    const { history, loading, error, hallOfFameByYear, teamById, peopleById, peopleByName } = RC.data.useLeagueData();
    const [expandedYear, setExpandedYear] = useState(null);
    const [tableSort, setTableSort] = useState({ key: "pct", direction: "desc" });
    const [activeView, setActiveView] = useState("history");

    const { LoadingSpinner, ErrorMessage } = (RC.ui || {});
    const Spinner = LoadingSpinner || (({ text }) => <div className="px-4 py-8 text-gray-600">{text || "Loading..."}</div>);
    const Err = ErrorMessage || (({ message }) => <div className="px-4 py-8 text-red-600">{message}</div>);

    const normalizeId = (val) => {
      const s = String(val ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const resolveTeamName = (teamId) => {
      if (!teamId || !teamById) return "";
      const team = teamById[normalizeId(teamId)];
      if (!team) return "";
      return String(team["School Name"] || team["School"] || team["Team"] || team["Name"] || "").trim();
    };

    const resolveTeamNickname = (teamId) => {
      if (!teamId || !teamById) return "";
      const team = teamById[normalizeId(teamId)];
      if (!team) return "";
      return String(team["Team Nickname"] || team["Nickname"] || team["Nick Name"] || team["Mascot"] || "").trim();
    };

    const resolvePlayerName = (raw) => {
      const rawStr = String(raw || "").trim();
      if (!rawStr) return "—";
      const idKey = normalizeId(rawStr);
      if (peopleById && peopleById[idKey]) return peopleById[idKey];
      const lower = rawStr.toLowerCase();
      const matches = peopleByName && peopleByName[lower];
      if (matches && matches.length === 1) return matches[0];
      return rawStr;
    };

    // Transform history into newest-first list and annotate each winner with winNumber (1st, 2nd, ...)
    const hallComputed = useMemo(() => {
      const rowsByYear = hallOfFameByYear instanceof Map ? hallOfFameByYear : new Map();
      const outDetails = new Map();
      const outWinners = new Map();
      if (!rowsByYear.size) return { winners: outWinners, details: outDetails };

      const sorter = (a, b) => {
        const winsDiff = (b.wins || 0) - (a.wins || 0);
        if (winsDiff) return winsDiff;
        const lossesDiff = (a.losses || 0) - (b.losses || 0);
        if (lossesDiff) return lossesDiff;
        const nameA = String(a.playerRaw || "").toLowerCase();
        const nameB = String(b.playerRaw || "").toLowerCase();
        return nameA.localeCompare(nameB);
      };

      rowsByYear.forEach((rows, year) => {
        const yearNum = parseInt(year, 10);
        if (!Number.isFinite(yearNum)) return;
        if (!Array.isArray(rows) || !rows.length) return;
        const titleRows = rows.filter(r => r && r.title);
        const champRow = (titleRows.length ? titleRows.slice().sort(sorter)[0] : rows.slice().sort(sorter)[0]) || null;
        const sortedAll = rows.slice().sort(sorter);
        const runnerCandidates = sortedAll.filter(r => r !== champRow);
        const bestRunner = runnerCandidates[0] || null;
        const runnerRows = bestRunner
          ? runnerCandidates.filter(r => (r.wins || 0) === (bestRunner.wins || 0) && (r.losses || 0) === (bestRunner.losses || 0))
          : [];
        const champName = champRow ? resolvePlayerName(champRow.playerRaw) : "—";
        const runnerNames = runnerRows.map(r => resolvePlayerName(r.playerRaw)).filter(Boolean);
        const uniqueRunners = Array.from(new Set(runnerNames));
        const runnerUpLabel = uniqueRunners.length ? uniqueRunners.join(", ") : "—";
        const champTeamName = champRow ? resolveTeamName(champRow.champTeamId) : "";
        const champTeamNickname = champRow ? resolveTeamNickname(champRow.champTeamId) : "";
        const champRankVal = champRow && champRow.champRank !== null && champRow.champRank !== "" ? champRow.champRank : "";
        const champTeamFull = champTeamNickname && champTeamName
          ? `${champTeamName} ${champTeamNickname}`
          : (champTeamName || "—");
        const champTeamLabel = champTeamFull !== "—"
          ? (champRankVal ? `#${champRankVal} ${champTeamFull}` : champTeamFull)
          : (champRankVal ? `#${champRankVal}` : "—");

        outWinners.set(yearNum, champName);
        const winTotal = champRow ? (champRow.wins || 0) + (champRow.losses || 0) : 0;
        const winPct = winTotal > 0 ? (champRow.wins || 0) / winTotal : null;
        outDetails.set(yearNum, {
          record: champRow ? `${champRow.wins}-${champRow.losses}` : "—",
          winPct,
          champTeamLabel,
          champion: champName,
          runnerUp: runnerUpLabel,
          runnerUpCount: uniqueRunners.length
        });
      });

      return { winners: outWinners, details: outDetails };
    }, [hallOfFameByYear, teamById, peopleById, peopleByName]);

    const historyData = useMemo(() => {
      const items = [];
      if (Array.isArray(history)) {
        history.forEach((entry) => {
          const yearNum = parseInt(entry?.Year, 10);
          const winner = String(entry?.Winner || "").trim();
          if (!Number.isFinite(yearNum) || !winner) return;
          items.push({ year: yearNum, winner, source: "history" });
        });
      }

      hallComputed.winners.forEach((winner, year) => {
        if (!winner) return;
        items.push({ year, winner, source: "hall" });
      });

      if (!items.length) return [];

      const byYear = new Map();
      items.forEach((item) => {
        const existing = byYear.get(item.year);
        if (!existing || item.source === "hall") {
          byYear.set(item.year, item);
        }
      });

      const yearsAsc = Array.from(byYear.keys()).sort((a, b) => a - b);
      const winCounts = {};
      const listAsc = yearsAsc.map((year) => {
        const entry = byYear.get(year);
        const winnerName = String(entry?.winner || "").trim();
        winCounts[winnerName] = (winCounts[winnerName] || 0) + 1;
        return { Year: String(year), Winner: winnerName, winNumber: winCounts[winnerName] };
      });

      return listAsc.reverse();
    }, [history, hallComputed]);

    const hallDetailsByYear = hallComputed.details;
    const earliestHallYear = useMemo(() => {
      const rowsByYear = hallOfFameByYear instanceof Map ? hallOfFameByYear : new Map();
      if (!rowsByYear.size) return null;
      let minYear = null;
      rowsByYear.forEach((_rows, year) => {
        const yearNum = parseInt(year, 10);
        if (!Number.isFinite(yearNum)) return;
        if (minYear === null || yearNum < minYear) minYear = yearNum;
      });
      return minYear;
    }, [hallOfFameByYear]);

    const allTimeStandings = useMemo(() => {
      const rowsByYear = hallOfFameByYear instanceof Map ? hallOfFameByYear : new Map();
      const totals = {};
      const hallTitleYears = new Set();

      rowsByYear.forEach((rows) => {
        (rows || []).forEach((row) => {
          const name = resolvePlayerName(row?.playerRaw);
          if (!name || name === "—") return;
          if (!totals[name]) totals[name] = { name, wins: 0, losses: 0, titles: 0 };
          totals[name].wins += row?.wins || 0;
          totals[name].losses += row?.losses || 0;
          if (row?.title) {
            totals[name].titles += 1;
            if (Number.isFinite(row?.year)) hallTitleYears.add(row.year);
          }
        });
      });

      if (Array.isArray(history)) {
        history.forEach((entry) => {
          const yearNum = parseInt(entry?.Year, 10);
          const winner = String(entry?.Winner || "").trim();
          if (!Number.isFinite(yearNum) || !winner) return;
          if (hallTitleYears.has(yearNum)) return;
          const name = resolvePlayerName(winner);
          if (!name || name === "—") return;
          if (!totals[name]) totals[name] = { name, wins: 0, losses: 0, titles: 0 };
          totals[name].titles += 1;
        });
      }

      const list = Object.values(totals).map((row) => {
        const total = row.wins + row.losses;
        const pct = total > 0 ? (row.wins / total) : null;
        return {
          ...row,
          pct,
          pctText: pct !== null ? pct.toFixed(3).replace(/^0\./, ".") + "%" : "—"
        };
      });
      const ranked = list.slice().sort((a, b) => {
        const pctDiff = (b.pct ?? -1) - (a.pct ?? -1);
        if (pctDiff) return pctDiff;
        const winsDiff = b.wins - a.wins;
        if (winsDiff) return winsDiff;
        const lossesDiff = a.losses - b.losses;
        if (lossesDiff) return lossesDiff;
        return a.name.localeCompare(b.name);
      });
      const rankByName = {};
      let currentRank = 1;
      let lastPctKey = null;
      ranked.forEach((row, idx) => {
        const pctKey = row.pct === null ? "null" : row.pct.toFixed(6);
        if (idx === 0) {
          currentRank = 1;
          lastPctKey = pctKey;
        } else if (pctKey !== lastPctKey) {
          currentRank = idx + 1;
          lastPctKey = pctKey;
        }
        rankByName[row.name] = currentRank;
      });

      return list.map((row) => ({ ...row, rank: rankByName[row.name] }));
    }, [hallOfFameByYear, peopleById, peopleByName, history]);

    const sortedAllTimeStandings = useMemo(() => {
      const dir = tableSort.direction === "asc" ? 1 : -1;
      const key = tableSort.key;
      return allTimeStandings.slice().sort((a, b) => {
        if (key === "name") return a.name.localeCompare(b.name) * dir;
        if (key === "rank") return (a.rank - b.rank) * dir;
        if (key === "wins") return (a.wins - b.wins) * dir;
        if (key === "losses") return (a.losses - b.losses) * dir;
        if (key === "pct") return ((a.pct ?? -1) - (b.pct ?? -1)) * dir;
        if (key === "titles") return ((a.titles ?? 0) - (b.titles ?? 0)) * dir;
        return 0;
      });
    }, [allTimeStandings, tableSort]);

    const toggleTableSort = (key) => {
      setTableSort((prev) => {
        if (prev.key === key) {
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        const defaultDir = key === "name" ? "asc" : "desc";
        return { key, direction: defaultDir };
      });
    };

    const sortIcon = (key) => {
      if (tableSort.key !== key) return "↕";
      return tableSort.direction === "asc" ? "↑" : "↓";
    };

    const renderRankPill = (rank) => {
      const s = ["th", "st", "nd", "rd"];
      const v = rank % 100;
      const text = rank + (s[(v - 20) % 10] || s[v] || s[0]);
      if (rank === 1) return <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold text-xs whitespace-nowrap">{text}</span>;
      if (rank === 2) return <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold text-xs whitespace-nowrap">{text}</span>;
      if (rank === 3) return <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-xs whitespace-nowrap">{text}</span>;
      return <span className="text-gray-900 text-sm">{text}</span>;
    };

    const toggleYear = (year) => {
      setExpandedYear((prev) => (prev === year ? null : year));
    };

    if (loading) return <Spinner text="Loading History..." />;
    if (error) return <Err message={(error && (error.message || String(error))) || "Failed to load history"} />;
    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-6 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Hall of Fame</h2>
            <p className="text-gray-600 text-sm">The legends of the family pool.</p>
          </div>
          <div className="mt-5 px-4 max-w-2xl mx-auto w-full">
            <div className="flex w-full rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveView("history")}
                className={`flex-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeView === "history" ? "bg-blue-900 text-white" : "text-gray-600 hover:text-blue-900"}`}
              >
                Title History
              </button>
              <button
                type="button"
                onClick={() => setActiveView("standings")}
                className={`flex-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeView === "standings" ? "bg-blue-900 text-white" : "text-gray-600 hover:text-blue-900"}`}
              >
                All-Time Standings
              </button>
            </div>
          </div>
        </div>
        {activeView === "history" && (
        <div className="relative px-4 max-w-2xl mx-auto w-full"><div className="space-y-8">
          {historyData.map((item, index) => {
            const yearNum = parseInt(item.Year, 10);
            const details = Number.isFinite(yearNum) ? hallDetailsByYear.get(yearNum) : null;
            const hasDetails = !!details;
            const isExpanded = hasDetails && expandedYear === yearNum;
            const cardClasses = [
              "ml-16 md:ml-20 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full flex justify-between items-center relative overflow-hidden group-hover:shadow-md transition-shadow",
              hasDetails ? "cursor-pointer" : ""
            ].join(" ");
            return (
              <div key={item.Year || index} className="relative">
                <div className="relative flex items-center group">
                  <div className="absolute left-6 md:left-8 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 group-hover:border-yellow-400 transition-all duration-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  </div>
                  <div
                    className={cardClasses}
                    role={hasDetails ? "button" : undefined}
                    tabIndex={hasDetails ? 0 : undefined}
                    aria-expanded={hasDetails ? isExpanded : undefined}
                    onClick={hasDetails ? () => toggleYear(yearNum) : undefined}
                    onKeyDown={hasDetails ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleYear(yearNum);
                      }
                    } : undefined}
                  >
                    <div className="absolute -right-2 -bottom-6 text-7xl md:text-8xl font-black text-gray-50 select-none z-0">{item.Year}</div>
                    <div className="relative z-10"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Champion</span>{item.winNumber > 1 && (<span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide border border-yellow-200 shadow-sm">{item.winNumber}-Time Winner</span>)}</div><h3 className="text-2xl md:text-3xl font-bold text-gray-800">{item.Winner}</h3></div>
                    <div className="relative z-10 ml-4 flex items-center gap-2">
                      <div className="bg-gray-50 px-3 py-1 md:px-4 md:py-2 rounded-lg border border-gray-100 text-center"><span className="text-lg md:text-xl font-bold text-blue-900 block leading-none">{item.Year}</span></div>
                      {hasDetails && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`hidden sm:inline-block text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                      )}
                    </div>
                  </div>
                </div>
                {hasDetails && isExpanded && (
                  <div className="ml-16 md:ml-20 mt-3 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border border-yellow-200 rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex flex-col items-center text-center gap-2 text-amber-900">
                      <div className="text-base md:text-lg font-semibold text-amber-900">Record: {details.record || "—"}{details.winPct !== null ? ` (${details.winPct.toFixed(3).replace(/^0\./, ".")}%)` : ""}</div>
                      <div className="text-sm text-amber-800">Championship Pick: {details.champTeamLabel || "—"}</div>
                      <div className="text-sm text-amber-800">{(details.runnerUpCount || 0) > 1 ? "Runners-Up" : "Runner-Up"}: {details.runnerUp || "—"}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
        )}
        {activeView === "standings" && (
          <div className="relative px-4 max-w-2xl mx-auto w-full mt-10">
            <div className="w-full shadow-sm border border-gray-100 rounded-2xl bg-white overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="min-w-full border-collapse w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-800">
                      <th onClick={() => toggleTableSort("name")} className="p-2 text-left font-bold border-b border-gray-100 min-w-[100px] w-[140px] cursor-pointer select-none hover:bg-gray-100 transition-colors">Player <span className="text-gray-400">{sortIcon("name")}</span></th>
                      <th onClick={() => toggleTableSort("rank")} className="p-2 font-bold border-b border-gray-100 text-center cursor-pointer select-none hover:bg-gray-100 transition-colors w-[90px]">Rank <span className="text-gray-400">{sortIcon("rank")}</span></th>
                      <th onClick={() => toggleTableSort("wins")} className="p-2 font-bold border-b border-gray-100 text-center cursor-pointer select-none hover:bg-gray-100 transition-colors w-[90px]">Wins <span className="text-gray-400">{sortIcon("wins")}</span></th>
                      <th onClick={() => toggleTableSort("losses")} className="p-2 font-bold border-b border-gray-100 text-center cursor-pointer select-none hover:bg-gray-100 transition-colors w-[90px]">Losses <span className="text-gray-400">{sortIcon("losses")}</span></th>
                      <th onClick={() => toggleTableSort("titles")} className="p-2 font-bold border-b border-gray-100 text-center cursor-pointer select-none hover:bg-gray-100 transition-colors w-[90px]">Titles <span className="text-gray-400">{sortIcon("titles")}</span></th>
                      <th onClick={() => toggleTableSort("pct")} className="p-2 font-bold border-b border-gray-100 text-center cursor-pointer select-none hover:bg-gray-100 transition-colors w-[90px]">Win % <span className="text-gray-400">{sortIcon("pct")}</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {sortedAllTimeStandings.map((row) => (
                      <tr key={row.name} className="group hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0">
                        <td className="p-2 text-left font-bold text-gray-900">{row.name}</td>
                        <td className="p-2 text-center text-gray-900">{renderRankPill(row.rank)}</td>
                        <td className="p-2 text-center text-gray-900">{row.wins}</td>
                        <td className="p-2 text-center text-gray-600">{row.losses}</td>
                        <td className="p-2 text-center text-gray-900">{row.titles > 0 ? "🏆".repeat(row.titles) : "—"}</td>
                        <td className="p-2 text-center text-gray-900">{row.pctText}</td>
                      </tr>
                    ))}
                    {!allTimeStandings.length && (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-gray-500">Waiting on Hall of Fame records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              {earliestHallYear ? `Standings include every season back to ${earliestHallYear}.` : "Standings include every season available."}
            </div>
          </div>
        )}
      </div>
    );
  };

  RC.pages.HistoryPage = HistoryPage;
})();
