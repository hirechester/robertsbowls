/* Roberts Cup - Standings Page (extracted from index.html)
   Loaded as: <script type="text/babel" src="js/rc-page-standings.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases (so the moved code stays unchanged)
  const { SCHEDULE_URL, PICKS_URL, csvToJson } = RC;

  // --- STANDINGS PAGE ---
  const StandingsPage = () => {
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'wins', direction: 'descending' });

    useEffect(() => {
        const calculateStandings = async () => {
            try {
                const [scheduleRes, picksRes] = await Promise.all([
                    fetch(SCHEDULE_URL),
                    fetch(PICKS_URL)
                ]);
                const scheduleText = await scheduleRes.text();
                const picksText = await picksRes.text();
                const schedule = csvToJson(scheduleText);
                const picks = csvToJson(picksText).filter(p => p.Name);
                const sortedSchedule = schedule.filter(g => g.Date && g.Time).sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                const unplayedGames = sortedSchedule.filter(g => !g.Winner);
                const SIMULATIONS = 2000;
                const playerSimWins = {};
                picks.forEach(p => playerSimWins[p.Name] = 0);
                for (let i = 0; i < SIMULATIONS; i++) {
                    const simOutcomes = {};
                    unplayedGames.forEach(g => { simOutcomes[g.Bowl] = Math.random() < 0.5 ? g["Team 1"] : g["Team 2"]; });
                    let maxWins = -1;
                    const currentSimScores = {};
                    picks.forEach(player => {
                        let sWins = 0;
                        sortedSchedule.forEach(g => {
                            const pick = player[g.Bowl];
                            let winner = g.Winner || simOutcomes[g.Bowl];
                            if (pick && winner && pick.toLowerCase() === winner.toLowerCase()) sWins++;
                        });
                        currentSimScores[player.Name] = sWins;
                        if (sWins > maxWins) maxWins = sWins;
                    });
                    picks.forEach(player => { if (currentSimScores[player.Name] === maxWins) playerSimWins[player.Name]++; });
                }
                let stats = picks.map(player => {
                    let wins = 0; let losses = 0; let currentStreak = 0; let tempWinStreak = 0; let maxWinStreak = 0;
                    sortedSchedule.forEach(game => {
                        const winner = game.Winner;
                        const pick = player[game.Bowl];
                        if (winner) {
                            if (pick && pick.toLowerCase() === winner.toLowerCase()) {
                                wins++;
                                currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
                                tempWinStreak++;
                                if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
                            } else {
                                losses++;
                                currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
                                tempWinStreak = 0;
                            }
                        }
                    });
                    const winProbVal = playerSimWins[player.Name];
                    const winProb = (winProbVal / SIMULATIONS * 100).toFixed(1) + '%';
                    return {
                        name: player.Name, wins, losses, percentage: (wins + losses > 0 ? (wins / (wins + losses)).toFixed(3) : ".000").replace('0.', '.'),
                        currentStreak, maxWinStreak, champPick: player["National Championship"] || "-",
                        tiebreaker: player["Tiebreaker Score"] || "0", rawPicks: player, winProb, winProbNum: winProbVal
                    };
                });
                stats.sort((a, b) => b.wins - a.wins);
                const leader = stats[0];
                let currentRank = 1;
                for (let i = 0; i < stats.length; i++) {
                    if (i > 0 && stats[i].wins < stats[i - 1].wins) currentRank = i + 1;
                    stats[i].rank = currentRank;
                    const winDeficit = leader.wins - stats[i].wins;
                    let status = "alive";
                    if (stats[i].rank === 1) {
                        stats[i].swingGames = "-";
                        status = "leading";
                    } else {
                        let diffs = 0;
                        sortedSchedule.forEach(game => {
                            if (!game.Winner) {
                                const lp = leader.rawPicks[game.Bowl];
                                const pp = stats[i].rawPicks[game.Bowl];
                                if (lp && pp && lp !== pp) diffs++;
                            }
                        });
                        stats[i].swingGames = diffs;
                        if (diffs < winDeficit) status = "eliminated";
                    }
                    stats[i].status = status;
                }
                setStandings(stats);
            } catch (err) { console.error(err); setError(err.message); } finally { setLoading(false); }
        };
        calculateStandings();
    }, []);

    const sortedData = useMemo(() => {
        let sortableItems = [...standings];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (['wins', 'losses', 'rank', 'currentStreak', 'maxWinStreak', 'swingGames', 'winProbNum'].includes(sortConfig.key)) {
                    if (sortConfig.key === 'swingGames') {
                        const aVal = aValue === '-' ? 999 : Number(aValue);
                        const bVal = bValue === '-' ? 999 : Number(bValue);
                        aValue = aVal; bValue = bVal;
                    } else { aValue = Number(aValue); bValue = Number(bValue); }
                } else if (sortConfig.key === 'percentage') {
                    aValue = parseFloat(aValue); bValue = parseFloat(bValue);
                } else if (sortConfig.key === 'champPick') {
                    const getSeed = (str) => {
                        const match = String(str).match(/#(\d+)/);
                        return match ? parseInt(match[1], 10) : 999;
                    };
                    const aSeed = getSeed(aValue);
                    const bSeed = getSeed(bValue);
                    if (aSeed !== bSeed) {
                        aValue = aSeed; bValue = bSeed;
                    } else {
                        aValue = String(aValue).toLowerCase(); bValue = String(bValue).toLowerCase();
                    }
                } else if (sortConfig.key === 'tiebreaker') {
                    aValue = parseInt(aValue, 10) || 0; bValue = parseInt(bValue, 10) || 0;
                } else if (sortConfig.key === 'status') {
                    const statusOrder = { 'leading': 3, 'alive': 2, 'eliminated': 1 };
                    aValue = statusOrder[aValue] || 0; bValue = statusOrder[bValue] || 0;
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase();
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [standings, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (['wins', 'percentage', 'currentStreak', 'maxWinStreak', 'swingGames', 'status', 'winProbNum'].includes(key)) direction = 'descending';
        if (sortConfig.key === key) direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        const activeKey = sortConfig.key === 'winProbNum' ? 'winProb' : sortConfig.key;
        if (activeKey !== name) return <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-50 text-[10px]">▼</span>;
        return sortConfig.direction === 'ascending' ? <span className="ml-1 text-blue-600 text-[10px]">▲</span> : <span className="ml-1 text-blue-600 text-[10px]">▼</span>;
    };

    const renderRank = (rank) => {
        const s = ["th", "st", "nd", "rd"]; const v = rank % 100; const text = rank + (s[(v - 20) % 10] || s[v] || s[0]);
        if (rank === 1) return <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold text-xs whitespace-nowrap">{text}</span>;
        if (rank === 2) return <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold text-xs whitespace-nowrap">{text}</span>;
        if (rank === 3) return <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-xs whitespace-nowrap">{text}</span>;
        return <span className="text-gray-900 text-sm">{text}</span>;
    };

    const renderStreak = (streak) => {
        if (streak === 0) return <span className="text-gray-400">-</span>;
        const isWin = streak > 0; const val = Math.abs(streak); const text = isWin ? `W${val}` : `L${val}`;
        let classes = "inline-flex items-center px-2 py-0.5 text-xs border ";
        let icon = null;
        if (isWin) {
            if (val >= 5) { classes += "rounded-full font-bold bg-[#fb8c00] text-white border-orange-700"; icon = "🔥"; }
            else if (val === 4) classes += "rounded-full font-bold bg-[#ffb74d] text-orange-900 border-orange-600";
            else if (val === 3) classes += "rounded-full font-bold bg-[#ffe0b2] text-orange-800 border-orange-300";
            else classes += "rounded-lg font-medium bg-gray-50 text-gray-900 border-transparent";
        } else {
            if (val >= 5) { classes += "rounded-full font-bold bg-[#1e88e5] text-white border-blue-700"; icon = "❄️"; }
            else if (val === 4) classes += "rounded-full font-bold bg-[#64b5f6] text-blue-900 border-blue-600";
            else if (val === 3) classes += "rounded-full font-bold bg-[#bbdefb] text-blue-800 border-blue-300";
            else classes += "rounded-lg font-medium bg-gray-50 text-gray-900 border-transparent";
        }
        return <span className={classes}>{text} {icon && <span className="ml-1">{icon}</span>}</span>;
    };

    const renderStatus = (status) => {
        if (status === 'leading') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold text-xs whitespace-nowrap">🥇 Leading</span>;
        if (status === 'eliminated') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-xs whitespace-nowrap">💀 Eliminated</span>;
        return <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-xs whitespace-nowrap">Alive</span>;
    };

    if (loading) return <LoadingSpinner text="Loading Standings..." />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
            <div className="bg-white pt-8 pb-8 px-4"><div className="max-w-7xl mx-auto text-center"><h2 className="text-3xl text-blue-900 font-bold mb-1">Leaderboard</h2><p className="text-gray-600 text-sm">Who has the bragging rights?</p></div></div>
            <div className="px-2 md:px-6 flex flex-col items-center">
                <div className="w-full max-w-[98%] md:max-w-[90%] shadow-2xl border border-gray-100 rounded-xl bg-white overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-max border-collapse w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-800 cursor-pointer select-none">
                                    <th onClick={() => requestSort('name')} className="sticky left-0 sticky-left bg-gray-50 p-2 text-left font-bold border-r border-b border-gray-100 min-w-[140px] sticky-col-shadow group hover:bg-gray-100 transition-colors">Name {getSortIcon('name')}</th>
                                    <th onClick={() => requestSort('rank')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">Rank {getSortIcon('rank')}</th>
                                    <th onClick={() => requestSort('wins')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">Wins {getSortIcon('wins')}</th>
                                    <th onClick={() => requestSort('losses')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">Losses {getSortIcon('losses')}</th>
                                    <th onClick={() => requestSort('percentage')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">Percentage {getSortIcon('percentage')}</th>
                                    <th onClick={() => requestSort('currentStreak')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">🔥 Current Streak {getSortIcon('currentStreak')}</th>
                                    <th onClick={() => requestSort('maxWinStreak')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">💪 Longest Streak {getSortIcon('maxWinStreak')}</th>
                                    <th onClick={() => requestSort('champPick')} className="p-2 font-bold border-b border-gray-100 text-center min-w-[180px] group hover:bg-gray-100 transition-colors">👑 Championship Team {getSortIcon('champPick')}</th>
                                    <th onClick={() => requestSort('tiebreaker')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">🎯 Tiebreaker Score {getSortIcon('tiebreaker')}</th>
                                    <th onClick={() => requestSort('winProbNum')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">🔮 Win Probability {getSortIcon('winProb')}</th>
                                    <th onClick={() => requestSort('status')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">🧮 Elimination Status {getSortIcon('status')}</th>
                                    <th onClick={() => requestSort('swingGames')} className="p-2 font-bold border-b border-gray-100 text-center group hover:bg-gray-100 transition-colors">🪜 Swing Games {getSortIcon('swingGames')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {sortedData.map((player, idx) => (
                                    <tr key={idx} className="group hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0">
                                        <td className="sticky left-0 sticky-left p-2 text-left font-bold text-gray-900 border-r-2 border-gray-100 sticky-col-shadow bg-white">{player.name}</td>
                                        <td className="p-2 text-center border-r border-gray-100">{renderRank(player.rank)}</td>
                                        <td className="p-2 text-center text-gray-900 border-r border-gray-100">{player.wins}</td>
                                        <td className="p-2 text-center text-gray-600 border-r border-gray-100">{player.losses}</td>
                                        <td className="p-2 text-center text-gray-900 border-r border-gray-100">{player.percentage}</td>
                                        <td className="p-2 text-center border-r border-gray-100">{renderStreak(player.currentStreak)}</td>
                                        <td className="p-2 text-center border-r border-gray-100"><span className="inline-block px-2 py-0.5 rounded-lg border border-transparent text-xs font-medium bg-gray-50 text-gray-900">W{player.maxWinStreak}</span></td>
                                        <td className="p-2 text-center border-r border-gray-100 text-gray-900 truncate">{player.champPick}</td>
                                        <td className="p-2 text-center text-gray-900 border-r border-gray-100">{player.tiebreaker}</td>
                                        <td className="p-2 text-center text-gray-900 border-r border-gray-100">{player.winProb}</td>
                                        <td className="p-2 text-center border-r border-gray-100">{renderStatus(player.status)}</td>
                                        <td className="p-2 text-center text-gray-900">{player.swingGames}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="mt-8 px-2 md:px-6 flex flex-col items-center pb-10">
                <div className="w-full max-w-[98%] md:max-w-[90%] shadow-2xl border border-gray-100 rounded-xl bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-900 font-serif">Legend</h3></div>
                    <div className="p-4 space-y-4 text-sm text-gray-600">
                        <div className="space-y-1"><div className="flex gap-2 items-start"><span className="font-bold text-gray-900 whitespace-nowrap text-base">🔮 Win Probability:</span></div><p className="mb-2">Based on 2,000 Monte Carlo simulations of the remaining games (treated as 50/50 coin flips).</p></div>
                        <div className="border-t border-gray-100 pt-3 space-y-1"><div className="flex gap-2 items-start"><span className="font-bold text-gray-900 whitespace-nowrap text-base">🧮 Elimination Status:</span></div><p className="mb-2">Compares how many wins you’re behind the lead to your remaining swing chances.</p>
                            <ul className="list-disc pl-5 space-y-1"><li><span className="font-bold text-yellow-700">Leading</span> — currently in 1st place (or tied for it)</li><li><span className="font-bold text-green-700">Alive</span> — mathematically possible to catch the leader</li><li><span className="font-bold text-red-700">Eliminated</span> — not enough swing games remaining to overcome the deficit</li></ul>
                        </div>
                        <div className="border-t border-gray-100 pt-3 space-y-1">
                            <div className="flex gap-2 items-start"><span className="font-bold text-gray-900 whitespace-nowrap text-base">🪜 Swing Games:</span></div>
                            <p className="mb-2">The number of remaining games where your pick differs from the current leader. You can only gain ground on the leader in these specific games. If this number is lower than your win deficit, you are eliminated.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


  // Export
  RC.pages.StandingsPage = StandingsPage;
})();
