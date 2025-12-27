(() => {
  const { useState, useEffect, useMemo } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // 5. VERSUS PAGE (Stage 19: uses shared RC.data.useLeagueData())
  const VersusPage = () => {
    const { schedule, picks, loading, error } = RC.data.useLeagueData();

    const players = useMemo(() => {
      if (!Array.isArray(picks)) return [];
      return picks.map(p => p.Name).filter(Boolean).sort();
    }, [picks]);

    const scheduleSorted = useMemo(() => {
      if (!Array.isArray(schedule)) return [];
      return schedule
        .filter(g => g && g.Date && g.Time)
        .slice()
        .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
    }, [schedule]);

    const [selectedP1, setSelectedP1] = useState("");
    const [selectedP2, setSelectedP2] = useState("");

    useEffect(() => {
      if (players.length < 2) return;
      const p1Valid = selectedP1 && players.includes(selectedP1);
      const p2Valid = selectedP2 && players.includes(selectedP2);
      if (!p1Valid || !p2Valid || selectedP1 === selectedP2) {
        let idx1 = Math.floor(Math.random() * players.length);
        let idx2 = Math.floor(Math.random() * players.length);
        while (idx1 === idx2) idx2 = Math.floor(Math.random() * players.length);
        setSelectedP1(players[idx1]);
        setSelectedP2(players[idx2]);
      }
    }, [players]);

    if (loading) return <LoadingSpinner text="Loading Rivalry Mode..." />;
    if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load data"} />;


            const getStats = (playerName) => {
                const p = picks.find(x => x.Name === playerName);
                if (!p) return { wins: 0, losses: 0, streak: 0 };
                let wins = 0; let losses = 0; let currentStreak = 0;
                scheduleSorted.forEach(g => {
                    if (g.Winner) {
                        const pick = p[g.Bowl];
                        if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                            wins++;
                            currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
                        } else {
                            losses++;
                            currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
                        }
                    }
                });
                return { wins, losses, streak: currentStreak };
            };

            const stats1 = getStats(selectedP1);
            const stats2 = getStats(selectedP2);
            const diffGames = [];
            const historyGames = [];
            let headToHead = { p1: 0, p2: 0 };

            if (selectedP1 && selectedP2) {
                const p1Data = picks.find(x => x.Name === selectedP1);
                const p2Data = picks.find(x => x.Name === selectedP2);
                scheduleSorted.forEach(g => {
                    const pick1 = p1Data[g.Bowl];
                    const pick2 = p2Data[g.Bowl];
                    if (pick1 && pick2 && pick1.toLowerCase() !== pick2.toLowerCase()) {
                        if (g.Winner) {
                            let winner = null;
                            if (pick1.toLowerCase() === g.Winner.toLowerCase()) { headToHead.p1++; winner = selectedP1; }
                            else if (pick2.toLowerCase() === g.Winner.toLowerCase()) { headToHead.p2++; winner = selectedP2; }
                            historyGames.push({ ...g, pick1, pick2, winner });
                        } else {
                            diffGames.push({ ...g, pick1, pick2 });
                        }
                    }
                });
            }

            return (
                <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                    <div className="bg-white pt-8 pb-4 px-4">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-3xl text-blue-900 font-bold mb-1">Rivalry Mode</h2>
                            <p className="text-gray-600 text-sm">Sibling rivalries? Settle the score.</p>
                        </div>
                    </div>

                    <div className="px-4 max-w-4xl mx-auto w-full flex flex-col gap-6">

                        <div className="flex items-center justify-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                            <select
                                value={selectedP1}
                                onChange={(e) => setSelectedP1(e.target.value)}
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-bold"
                            >
                                {players.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <span className="text-gray-400 font-black italic">VS</span>
                            <select
                                value={selectedP2}
                                onChange={(e) => setSelectedP2(e.target.value)}
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-bold"
                            >
                                {players.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 text-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                             <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 relative z-10">Head-to-Head (Differing Picks)</h3>
                            <div className="flex items-center justify-center gap-8 md:gap-16 relative z-10">
                                <div className="text-center">
                                    <div className="text-4xl md:text-6xl font-black">{headToHead.p1}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">{selectedP1}</div>
                                </div>
                                <div className="text-2xl text-slate-600 font-serif italic">-</div>
                                <div className="text-center">
                                    <div className="text-4xl md:text-6xl font-black">{headToHead.p2}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">{selectedP2}</div>
                                </div>
                            </div>
                        </div>

                        {/* Tale of the Tape */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-100 shadow-md rounded-xl p-4 text-center">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Total Wins</div>
                                <div className="text-2xl font-black text-gray-900">{stats1.wins}</div>
                            </div>
                            <div className="bg-white border border-gray-100 shadow-md rounded-xl p-4 text-center">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Total Wins</div>
                                <div className="text-2xl font-black text-gray-900">{stats2.wins}</div>
                            </div>

                            <div className="bg-white border border-gray-100 shadow-md rounded-xl p-4 text-center">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Current Streak</div>
                                <div className={`text-xl font-bold ${stats1.streak >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {stats1.streak > 0 ? `W${stats1.streak}` : `L${Math.abs(stats1.streak)}`}
                                </div>
                            </div>
                            <div className="bg-white border border-gray-100 shadow-md rounded-xl p-4 text-center">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Current Streak</div>
                                <div className={`text-xl font-bold ${stats2.streak >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {stats2.streak > 0 ? `W${stats2.streak}` : `L${Math.abs(stats2.streak)}`}
                                </div>
                            </div>
                        </div>

                        {/* History (Moved Up & Styled Green) */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-green-50 border-b border-green-100 px-4 py-3">
                                <h3 className="text-lg font-bold text-green-900 font-serif">Battle History</h3>
                            </div>
                            {historyGames.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {historyGames.reverse().map((g, idx) => {
                                        const p1Won = g.winner === selectedP1;
                                        const p2Won = g.winner === selectedP2;
                                        return (
                                            <div key={idx} className="p-4 flex items-center justify-between">
                                                 <div className={`text-right w-1/3 ${p1Won ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                    <div className={`font-bold text-sm leading-tight ${p1Won ? 'text-green-700' : 'text-gray-900'}`}>{g.pick1}</div>
                                                    {p1Won && <div className="text-[10px] font-black text-green-600 uppercase">Winner</div>}
                                                </div>
                                                <div className="px-2 text-center w-1/3">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{g.Bowl}</div>
                                                    <div className="text-xs text-gray-300 font-bold">FINAL</div>
                                                </div>
                                                <div className={`text-left w-1/3 ${p2Won ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                    <div className={`font-bold text-sm leading-tight ${p2Won ? 'text-green-700' : 'text-gray-900'}`}>{g.pick2}</div>
                                                    {p2Won && <div className="text-[10px] font-black text-green-600 uppercase">Winner</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    No battles fought yet.
                                </div>
                            )}
                        </div>

                        {/* The Battleground (Moved Down) */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
                            <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                                <h3 className="text-lg font-bold text-red-900 font-serif">The Battleground</h3>
                                <p className="text-xs text-red-700">Upcoming games where you picked differently.</p>
                            </div>
                            {diffGames.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {diffGames.map((g, idx) => (
                                        <div key={idx} className="p-4 flex items-center justify-between">
                                            <div className="text-right w-1/3">
                                                <div className="font-bold text-gray-900 text-sm leading-tight">{g.pick1}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">{selectedP1}</div>
                                            </div>
                                            <div className="px-2 text-center w-1/3">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{g.Bowl}</div>
                                                <div className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block">vs</div>
                                            </div>
                                            <div className="text-left w-1/3">
                                                <div className="font-bold text-gray-900 text-sm leading-tight">{g.pick2}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">{selectedP2}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    No upcoming battles. You agree on everything!
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            );
        };

  RC.pages.VersusPage = VersusPage;
})();
