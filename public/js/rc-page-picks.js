/* Roberts Cup - Picks Page (extracted)
   Loaded via: <script type="text/babel" src="js/rc-page-picks.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases so the moved code stays unchanged
  const { SCHEDULE_URL, PICKS_URL, csvToJson } = RC;

  // --- PICKS PAGE ---
  const PicksPage = () => {
              const [schedule, setSchedule] = useState([]); const [picks, setPicks] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
              useEffect(() => {
                  const fetchData = async () => {
                      try {
                          const [scheduleResponse, picksResponse] = await Promise.all([fetch(SCHEDULE_URL), fetch(PICKS_URL)]);
                          if (!scheduleResponse.ok || !picksResponse.ok) throw new Error("Failed to fetch data from Google Sheets");
                          const scheduleText = await scheduleResponse.text(); const picksText = await picksResponse.text();
                          const parsedSchedule = csvToJson(scheduleText); const parsedPicks = csvToJson(picksText);
                          setSchedule(parsedSchedule.filter(g => g.Bowl && g.Date)); setPicks(parsedPicks.filter(p => p.Name));
                      } catch (err) { console.error(err); setError(err.message); } finally { setLoading(false); }
                  };
                  fetchData();
              }, []);
              if (loading) return <LoadingSpinner text="Loading Picks..." />;
              if (error) return <ErrorMessage message={error} />;
              return (
                  <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                      <div className="bg-white pt-8 pb-8 px-4"><div className="max-w-7xl mx-auto text-center"><h2 className="text-3xl text-blue-900 font-bold mb-1">Bowl Mania</h2><p className="text-gray-600 text-sm">Every game, every prediction.</p></div></div>
                      <div className="px-2 md:px-6 flex flex-col items-center">
                          <div className="w-full max-w-[98%] md:max-w-[90%] shadow-2xl border border-gray-100 rounded-xl bg-white overflow-hidden">
                              <div className="overflow-x-auto w-full">
                                  <table className="min-w-max border-collapse w-full text-sm">
                                      <thead>
                                          <tr className="bg-gray-50 text-gray-800">
                                              <th className="sticky left-0 sticky-left bg-gray-50 p-2 text-left font-bold border-r border-b border-gray-100 min-w-[140px] sticky-col-shadow tracking-wide text-sm shadow-sm">Name</th>
                                              {schedule.map((game, idx) => (
                                                  <th key={idx} className="bg-gray-50 p-2 font-bold border-r border-b border-gray-100 whitespace-nowrap min-w-[220px] text-center shadow-sm">
                                                      <div className="flex flex-col gap-0.5"><span className="text-gray-900 text-[14px]">{game.Bowl}</span><span className="text-gray-500 text-[11px] font-normal">{game.Date} • {game.Time} • {game.Network}</span></div>
                                                  </th>
                                              ))}
                                              <th className="bg-gray-50 p-2 font-bold border-b border-gray-100 min-w-[100px] text-center tracking-wide text-sm shadow-sm">Tiebreaker Score</th>
                                          </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                          {picks.map((player, rowIndex) => (
                                              <tr key={rowIndex} className="group hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0">
                                                  <td className="sticky left-0 sticky-left p-2 text-left font-bold text-gray-900 border-r-2 border-gray-100 sticky-col-shadow bg-white">{player.Name}</td>
                                                  {schedule.map((game, colIndex) => (<td key={colIndex} className="p-2 text-center border-r border-gray-100 last:border-0"><StatusPill pick={player[game.Bowl]} winner={game.Winner} /></td>))}
                                                  <td className="p-2 text-center text-gray-700 font-medium text-[14px] border-l border-gray-100">{player["Tiebreaker Score"]}</td>
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
