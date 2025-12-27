/* Roberts Cup - Home Page (extracted from index.html)
   Loaded as: <script type="text/babel" src="js/rc-page-home.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases (so the moved code stays unchanged)
  const { SCHEDULE_URL, PICKS_URL, csvToJson } = RC;

  // --- HOME PAGE ---
  const HomePage = () => {
            const [headlines, setHeadlines] = useState([]);
            const [slateGames, setSlateGames] = useState([]);
            const [loading, setLoading] = useState(true);

            // Shared league data (fetched once per session by rc-data.js)
            const { schedule: scheduleData, picks: picksData, loading: dataLoading, error: dataError } = RC.data.useLeagueData();

            useEffect(() => {
                if (dataLoading) {
                    setLoading(true);
                    return;
                }
                if (dataError) {
                    console.error("HomePage: failed to load league data", dataError);
                    setLoading(false);
                    return;
                }
                if (!scheduleData || !picksData) return;

                try {
                    const schedule = scheduleData;
                    const picks = picksData;


                        // 1. Process Schedule
                        const sortedSchedule = schedule
                            .filter(g => g.Date && g.Time)
                            .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                        const unplayedGames = sortedSchedule.filter(g => !g.Winner);

                        // 2. Identify "On The Slate" Games (Today & Tomorrow)
                        const today = new Date();
                        const tomorrow = new Date();
                        tomorrow.setDate(today.getDate() + 1);

                        const isMatch = (gameDateStr, targetDate) => {
                            const gd = new Date(gameDateStr);
                            return gd.getDate() === targetDate.getDate() &&
                                   gd.getMonth() === targetDate.getMonth() &&
                                   gd.getFullYear() === targetDate.getFullYear();
                        };

                        const slate = sortedSchedule.filter(g => {
                            const isToday = isMatch(g.Date, today);
                            const isTomorrow = isMatch(g.Date, tomorrow);
                            if (isToday) g.dayLabel = "TODAY";
                            if (isTomorrow) g.dayLabel = "TOMORROW";
                            return isToday || isTomorrow;
                        });
                        setSlateGames(slate);

                        // 3. Stats Calculation (Simulation)
                        const SIMULATIONS = 2000;
                        const playerSimWins = {};
                        picks.forEach(p => playerSimWins[p.Name] = 0);

                        for (let i = 0; i < SIMULATIONS; i++) {
                            const simOutcomes = {};
                            unplayedGames.forEach(g => {
                                simOutcomes[g.Bowl] = Math.random() < 0.5 ? g["Team 1"] : g["Team 2"];
                            });
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
                            picks.forEach(player => {
                                if (currentSimScores[player.Name] === maxWins) playerSimWins[player.Name]++;
                            });
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
                            const winProb = (playerSimWins[player.Name] / SIMULATIONS * 100);
                            return {
                                name: player.Name, wins, losses, currentStreak, maxWinStreak, winProb,
                                rawPicks: player, champPick: player["National Championship"], tiebreaker: parseInt(player["Tiebreaker Score"] || 0)
                            };
                        });

                        stats.sort((a, b) => b.wins - a.wins);
                        const leader = stats[0];

                        // Calculate Swing Games for headlines
                        stats = stats.map(player => {
                            let swingGames = 0;
                            if (player.name !== leader.name) {
                                sortedSchedule.forEach(game => {
                                    if (!game.Winner) {
                                        const lp = leader.rawPicks[game.Bowl];
                                        const pp = player.rawPicks[game.Bowl];
                                        if (lp && pp && lp !== pp) swingGames++;
                                    }
                                });
                            }
                            return { ...player, swingGames };
                        });

                        // 4. Generate Dynamic Headlines
                        const dynamicPool = new Map();
                        const addHl = (key, data) => { if (!dynamicPool.has(key)) dynamicPool.set(key, data); };

                        // Simulation Odds HL
                        const highestProb = stats.reduce((prev, current) => (prev.winProb > current.winProb) ? prev : current);
                        if (highestProb && highestProb.winProb > 0) {
                            addHl("simulation", { Emoji: "🤖", Headline: "Simulation Says...", Content: `The supercomputer is crushing on ${highestProb.name}, giving them a ${highestProb.winProb.toFixed(1)}% chance to take the crown. Do you trust the machine?` });
                        }

                        // Streaks HL
                        const heaters = stats.filter(p => p.currentStreak > 3).sort((a,b) => b.currentStreak - a.currentStreak);
                        if (heaters.length > 0) {
                            addHl("heater", { Emoji: "🔥", Headline: "Heater Alert", Content: `${heaters[0].name} has rattled off ${heaters[0].currentStreak} straight wins. Someone get a fire extinguisher.` });
                        }

                        // Miracles HL
                        const miraclePlayer = stats.find(p => p.winProb > 0 && p.winProb < 1);
                        if (miraclePlayer) {
                            addHl("miracle", { Emoji: "🎰", Headline: "So You're Saying There's a Chance", Content: `${miraclePlayer.name} is holding onto a thread with a ${miraclePlayer.winProb.toFixed(1)}% win probability.` });
                        }

                        // Against the Grain HL
                        const rebel = stats.reduce((prev, current) => (prev.swingGames > current.swingGames) ? prev : current);
                        if (rebel && rebel.swingGames > 0) {
                            addHl("rebel", { Emoji: "🌾", Headline: "Against the Grain", Content: `${rebel.name} has gone rogue with ${rebel.swingGames} picks different from the leader. Playing their own game.` });
                        }

                        // Mirror HL
                        if (stats.length > 1 && (stats[0].wins - stats[1].wins) === 1) {
                            addHl("mirror", { Emoji: "👀", Headline: "Rearview Mirror", Content: `Objects in mirror are closer than they appear. ${stats[0].name} is clinging to a narrow 1-game lead over ${stats[1].name}.` });
                        }

                        // Tiebreaker HL
                        const moon = stats.reduce((prev, current) => (prev.tiebreaker > current.tiebreaker) ? prev : current);
                        if (moon && moon.tiebreaker > 0) {
                            addHl("moon", { Emoji: "🚀", Headline: "To The Moon", Content: `${moon.name} is predicting a massive ${moon.tiebreaker} points in the title game shootout.` });
                        }

                        // Final Headlines Selection
                        const dynamicHls = Array.from(dynamicPool.values());
                        const shuffledDynamic = dynamicHls.sort(() => 0.5 - Math.random());
                        const shuffledStatic = [...STATIC_HEADLINES].sort(() => 0.5 - Math.random());

                        let finalHeadlines = [];
                        finalHeadlines.push(shuffledStatic[0]);
                        const dCount = Math.min(shuffledDynamic.length, 5);
                        finalHeadlines.push(...shuffledDynamic.slice(0, dCount));

                        if (finalHeadlines.length < 6) {
                            const needed = 6 - finalHeadlines.length;
                            finalHeadlines.push(...shuffledStatic.slice(1, 1 + needed));
                        }
                        finalHeadlines.sort(() => 0.5 - Math.random());

                        setHeadlines(finalHeadlines);
                        setLoading(false);
                } catch (error) {
                    console.error("HomePage: error building home data", error);
                    setLoading(false);
                }
            }, [dataLoading, dataError, scheduleData, picksData]);

            // Static Bank
            const STATIC_HEADLINES = [
                { type: "STATIC", Emoji: "👮‍♂️", Headline: "League Office Update", Content: "The Commissioner has issued a formal warning: trash talk is mandatory, accuracy is optional." },
                { type: "STATIC", Emoji: "📉", Headline: "Market Crash", Content: "Confidence points are plummeting faster than crypto. Who bet the house on that 6-6 MAC team?" },
                { type: "STATIC", Emoji: "🦃", Headline: "Family Feud", Content: "Thanksgiving was weeks ago, but the real family drama is happening on the leaderboard right now." },
                { type: "STATIC", Emoji: "🥶", Headline: "Ice Cold", Content: "A chilly wind blows through the bottom of the standings. Better bundle up, it's freezing down there." },
                { type: "STATIC", Emoji: "👀", Headline: "Sleeping Giant", Content: "They started slow, but the analytics (and their ego) say a comeback is statistically probable." },
                { type: "STATIC", Emoji: "🥔", Headline: "Bowl SZN", Content: "Nothing says 'Happy Holidays' like sweating out a meaningless 4th quarter in the Famous Idaho Potato Bowl." },
                { type: "STATIC", Emoji: "📊", Headline: "The Analytics", Content: "The numbers don't lie, but they might hurt your feelings. Check the probability charts if you dare." },
                { type: "STATIC", Emoji: "👑", Headline: "Heavy is the Head", Content: "The leader looks comfortable, but the chasing pack is hungry. Can they hold the Iron Throne?" },
                { type: "STATIC", Emoji: "🤔", Headline: "Questionable Call", Content: "That pick was... bold. Let's see if it pays off big or ends in total, hilarious tragedy." },
                { type: "STATIC", Emoji: "🚑", Headline: "Critical Condition", Content: "The elimination line is creeping closer. Time to make a move or start planning your concession speech." },
                { type: "STATIC", Emoji: "🎲", Headline: "Rolling the Dice", Content: "High risk, high reward. Someone is swinging for the fences while everyone else plays it safe." },
                { type: "STATIC", Emoji: "📺", Headline: "Glued to the Screen", Content: "4 games, 3 screens, 1 champion. The remote control is the true MVP of the Roberts Cup." },
                { type: "STATIC", Emoji: "💔", Headline: "Heartbreaker", Content: "That sure-thing lock just lost on a last-second field goal. There goes the perfect weekend." },
                { type: "STATIC", Emoji: "📈", Headline: "Stock Rising", Content: "Moving up the leaderboard like a rocket. The dark horse has officially entered the chat." },
                { type: "STATIC", Emoji: "🔮", Headline: "Crystal Ball", Content: "Predicted the upset perfectly. Are they a football genius or a time traveler from 2026?" },
                { type: "STATIC", Emoji: "🧂", Headline: "Salty", Content: "The group chat is getting spicy. Rivalries are heating up as the games wind down." },
                { type: "STATIC", Emoji: "🏆", Headline: "Eye on the Prize", Content: "The Roberts Cup is gleaming. Polish your shelf, or prepare your excuses." },
                { type: "STATIC", Emoji: "🏹", Headline: "Chaos Theory", Content: "Absolute mayhem in the late games. No lead is safe when the Pac-12 (RIP) plays after dark." },
                { type: "STATIC", Emoji: "🐢", Headline: "Slow and Steady", Content: "Picking favorites might be boring, but it might just win the race. Don't be a hero." },
                { type: "STATIC", Emoji: "🦁", Headline: "King of the Jungle", Content: "A dominant performance so far. Is this the start of a dynasty, or a fluke?" },
                { type: "STATIC", Emoji: "🏚️", Headline: "Rebuilding Year", Content: "\"I'm just playing for fun this year.\" — Every loser, ever." },
                { type: "STATIC", Emoji: "⚡", Headline: "Shock the World", Content: "The pick nobody saw coming just cashed. The standings are in shambles." },
                { type: "STATIC", Emoji: "🎯", Headline: "Bullseye", Content: "Precision picking. While others panic, the leader stays cool under pressure." },
                { type: "STATIC", Emoji: "📉", Headline: "Fading Fast", Content: "Started strong, now fading down the stretch. Can they stop the bleeding before it's too late?" },
                { type: "STATIC", Emoji: "🍿", Headline: "Get the Popcorn", Content: "The tiebreaker scenarios are getting wild. We might need a NASA supercomputer for this finish." }
            ];

            if (loading) return <LoadingSpinner text="Loading your home experience..." />;

            return (
                <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                    {/* Grand Header */}
                    <div className="bg-slate-900 text-white p-8 md:p-12 rounded-b-3xl shadow-2xl mb-8 relative overflow-hidden border-b-4 border-yellow-500 pb-16">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-yellow-500/20 to-amber-600/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                            <div>
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                                    <span className="bg-slate-800 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30 uppercase tracking-widest shadow-sm">
                                        2025-26 Season
                                    </span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black mb-2 tracking-tight">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 drop-shadow-sm">
                                        Roberts Cup
                                    </span>
                                </h1>
                                <p className="text-slate-400 text-lg font-medium">The quest for family glory begins.</p>
                            </div>

                            <div className="relative mt-2 md:mt-0 group">
                                <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-10 rounded-full group-hover:opacity-20 transition-opacity duration-700"></div>
                                <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.4)] relative z-10">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Top Headlines Section */}
                    <div className="px-4 max-w-4xl mx-auto w-full relative z-20 pb-8">
                        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-4 ml-1">Top Headlines</h2>
                         <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {headlines.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-1 p-5 hover:bg-blue-50/30 transition-colors group">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl flex-shrink-0">{item.Emoji}</span>
                                            <h4 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-900 transition-colors">{item.Headline}</h4>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">{item.Content}</p>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>

                    {/* On The Slate Section */}
                    <div className="px-4 max-w-4xl mx-auto w-full relative z-20 pb-12">
                        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-4 ml-1">On The Slate</h2>
                        {slateGames.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {slateGames.map((game, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 flex flex-col justify-between hover:shadow-2xl transition-shadow group">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                {game.dayLabel === "TODAY" ? (
                                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                                        TODAY
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        TOMORROW
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {game.Date}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <div className="text-lg font-black text-gray-800 leading-tight">
                                                    {game["Team 1"]} <span className="text-gray-300 font-normal mx-1">vs</span> {game["Team 2"]}
                                                </div>
                                            </div>
                                            <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {game.Bowl}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-bold">{game.Time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-xs font-bold uppercase tracking-tighter">{game.Network}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                                <p className="text-gray-500 font-medium">
                                    No games found in the next two days. <br />
                                    <span className="text-sm font-normal">Check the Picks page for the next available matchup.</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

  // Export
  RC.pages.HomePage = HomePage;
})();
