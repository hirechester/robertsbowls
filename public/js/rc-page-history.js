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
        const runnerRow = sortedAll.find(r => r !== champRow) || null;
        const champName = champRow ? resolvePlayerName(champRow.playerRaw) : "—";
        const runnerName = runnerRow ? resolvePlayerName(runnerRow.playerRaw) : "—";
        const champTeamName = champRow ? resolveTeamName(champRow.champTeamId) : "";

        outWinners.set(yearNum, champName);
        outDetails.set(yearNum, {
          record: champRow ? `${champRow.wins}-${champRow.losses}` : "—",
          champTeamName: champTeamName || "—",
          champRank: (champRow && champRow.champRank !== null && champRow.champRank !== "") ? champRow.champRank : "—",
          champion: champName,
          runnerUp: runnerName
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

    const toggleYear = (year) => {
      setExpandedYear((prev) => (prev === year ? null : year));
    };

    if (loading) return <Spinner text="Loading History..." />;
    if (error) return <Err message={(error && (error.message || String(error))) || "Failed to load history"} />;
    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-8 px-4"><div className="max-w-7xl mx-auto text-center"><h2 className="text-3xl text-blue-900 font-bold mb-1">Hall of Fame</h2><p className="text-gray-600 text-sm">The legends of the family pool.</p></div></div>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                      )}
                    </div>
                  </div>
                </div>
                {hasDetails && isExpanded && (
                  <div className="ml-16 md:ml-20 mt-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between"><span className="text-gray-500">Record</span><span className="font-semibold text-gray-900">{details.record || "—"}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-500">Champ Team</span><span className="font-semibold text-gray-900">{details.champTeamName || "—"}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-500">Champ Rank</span><span className="font-semibold text-gray-900">{details.champRank || "—"}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-500">Runner-up</span><span className="font-semibold text-gray-900">{details.runnerUp || "—"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div></div>
      </div>
    );
  };

  RC.pages.HistoryPage = HistoryPage;
})();
