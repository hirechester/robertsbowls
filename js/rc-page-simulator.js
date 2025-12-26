/* Roberts Cup - Simulator Page (extracted)
   Loaded as: <script type="text/babel" src="js/rc-page-simulator.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases (so the moved code stays unchanged)
  const { SCHEDULE_URL, PICKS_URL, csvToJson } = RC;

  // --- SIMULATOR PAGE ---
  const SimulatorPage = () => {
      const [loading, setLoading] = useState(true);
      const [schedule, setSchedule] = useState([]);
      const [picks, setPicks] = useState([]);
      const [simulatedWinners, setSimulatedWinners] = useState({});

      useEffect(() => {
          const init = async () => {
              try {
                  const [scheduleRes, picksRes] = await Promise.all([
                      fetch(SCHEDULE_URL),
                      fetch(PICKS_URL)
                  ]);
                  const scheduleText = await scheduleRes.text();
                  const picksText = await picksRes.text();

                  const scheduleData = csvToJson(scheduleText);
                  // Filter for UNPLAYED games (no winner yet) for the toggles
                  const unplayed = scheduleData.filter(g => !g.Winner && g.Bowl && g["Team 1"]);
                  // Sort by date/time
                  unplayed.sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));

                  const picksData = csvToJson(picksText).filter(p => p.Name);

                  setSchedule(scheduleData); // Need full schedule for calculations
                  setPicks(picksData);
                  setLoading(false);
              } catch (e) {
                  console.error(e);
                  setLoading(false);
              }
          };
          init();
      }, []);

      const toggleWinner = (bowl, team) => {
          setSimulatedWinners(prev => {
              const next = { ...prev };
              if (next[bowl] === team) {
                  delete next[bowl]; // Toggle off if already selected
              } else {
                  next[bowl] = team;
              }
              return next;
          });
      };

      const resetSimulation = () => {
          setSimulatedWinners({});
      };

      // Calculate Projected Standings based on REAL winners + SIMULATED winners
      const projectedStandings = useMemo(() => {
          if (picks.length === 0) return [];

          return picks.map(player => {
              let wins = 0;
              schedule.forEach(game => {
                  const realWinner = game.Winner;
                  const simWinner = simulatedWinners[game.Bowl];

                  // Use simulated winner if no real winner exists
                  const winnerToUse = realWinner || simWinner;

                  if (winnerToUse) {
                      const pick = player[game.Bowl];
                      if (pick && pick.toLowerCase() === winnerToUse.toLowerCase()) {
                          wins++;
                      }
                  }
              });
              return { name: player.Name, wins };
          }).sort((a, b) => b.wins - a.wins); // Sort descending
      }, [picks, schedule, simulatedWinners]);

      if (loading) return <LoadingSpinner text="Booting up The Oracle..." />;

      const unplayedGames = schedule.filter(g => !g.Winner && g.Bowl && g["Team 1"]).sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));

      return (
          <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
              <div className="bg-white pt-8 pb-4 px-4">
                  <div className="max-w-4xl mx-auto text-center">
                      <h2 className="text-3xl text-blue-900 font-bold mb-1">The Simulator</h2>
                      <p className="text-gray-600 text-sm">Choose your destiny and predict the future.</p>
                  </div>
              </div>

              {/* Projected Leaderboard (Sticky) */}
              <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm px-4 pb-2 pt-2">
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg mb-2">
                       <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-400">Projected Leaderboard</h3>
                          <button onClick={resetSimulation} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white font-bold transition-colors">Reset All</button>
                       </div>
                       <div className="overflow-x-auto no-scrollbar pb-2">
                           <div className="flex gap-4 w-fit mx-auto">
                               {projectedStandings.slice(0, 10).map((p, idx) => (
                                   <div key={p.name} className="flex flex-col items-center justify-center flex-shrink-0 w-16">
                                       <span className="text-2xl font-black w-full text-center">{p.wins}</span>
                                       <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{p.name}</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                  </div>
              </div>

              <div className="px-4 max-w-4xl mx-auto w-full pt-4 pb-8 space-y-4">
                   {unplayedGames.length === 0 ? (
                       <div className="text-center text-gray-500 py-12">No unplayed games left to simulate!</div>
                   ) : (
                       unplayedGames.map((game) => {
                           const selected = simulatedWinners[game.Bowl];
                           return (
                              <div key={game.Bowl} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{game.Bowl}</span>
                                      <span className="text-[10px] font-bold text-gray-400">{game.Date}</span>
                                  </div>
                                  <div className="p-4 flex items-center justify-between gap-4">
                                      <button
                                          onClick={() => toggleWinner(game.Bowl, game["Team 1"])}
                                          className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-all border-2 ${selected === game["Team 1"] ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                                      >
                                          {game["Team 1"]}
                                      </button>
                                      <span className="text-gray-300 font-serif italic text-xs">vs</span>
                                       <button
                                          onClick={() => toggleWinner(game.Bowl, game["Team 2"])}
                                          className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-all border-2 ${selected === game["Team 2"] ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'}`}
                                      >
                                          {game["Team 2"]}
                                      </button>
                                  </div>
                              </div>
                           );
                       })
                   )}
              </div>
          </div>
      );
  };

  RC.pages.SimulatorPage = SimulatorPage;
})();
