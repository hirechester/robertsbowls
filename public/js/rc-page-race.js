/* Roberts Cup - Race Page (extracted)
   Loaded via: <script type="text/babel" src="js/rc-page-race.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases so the moved code stays unchanged

  // --- RACE PAGE ---
          const RacePage = () => {
              const { schedule, picks, picksIds, loading, error, refresh } = RC.data.useLeagueData();
              const [chartData, setChartData] = useState({ series: [], maxWins: 0, gameCount: 0 });
              const [hoveredPlayer, setHoveredPlayer] = useState(null);
              const [selectedPlayer, setSelectedPlayer] = useState(null);
              const [tableData, setTableData] = useState([]);

              // Define a vibrant color palette
              const COLORS = [
                  "#ef4444", // Red-500
                  "#f97316", // Orange-500
                  "#f59e0b", // Amber-500
                  "#84cc16", // Lime-500
                  "#10b981", // Emerald-500
                  "#06b6d4", // Cyan-500
                  "#3b82f6", // Blue-500
                  "#6366f1", // Indigo-500
                  "#8b5cf6", // Violet-500
                  "#d946ef", // Fuchsia-500
                  "#f43f5e", // Rose-500
                  "#64748b", // Slate-500
              ];

              const getColor = (idx) => COLORS[idx % COLORS.length];

              useEffect(() => {
                  // Build the race view from shared league data (loaded once by rc-data.js)
                  if (!Array.isArray(schedule) || !Array.isArray(picks)) return;
                  try {
                      // Process Schedule - Get completed games strictly ordered by time
                      const useIds = Array.isArray(picksIds) && schedule.some(g => String(g["Bowl ID"] || "").trim());

                      const sortedSchedule = schedule
                          .filter(g => {
                              if (!g || !g.Date || !g.Time) return false;
                              return useIds ? !!String(g["Winner ID"] || "").trim() : !!String(g.Winner || "").trim();
                          })
                          .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));

                      const normalizeId = (v) => {
                          const s = String(v ?? "").trim();
                          if (!s) return "";
                          const n = parseInt(s, 10);
                          return Number.isFinite(n) ? String(n) : s;
                      };

                      const playerRows = useIds ? picksIds : picks;
                      const players = playerRows.map(p => p.Name);

                      const picksByName = {};
                      playerRows.forEach(r => { picksByName[r.Name] = r; });

                      // Initialize history with 0 wins at start (game 0)
                      const history = {};
                      players.forEach(p => history[p] = [0]);

                      sortedSchedule.forEach(game => {
                          const bowlKey = useIds ? String(game["Bowl ID"] || "").trim() : game.Bowl;
                          const winnerKey = useIds ? normalizeId(game["Winner ID"]) : String(game.Winner || "");
                          players.forEach(playerName => {
                              const playerPicks = picksByName[playerName] || {};
                              const pickVal = playerPicks[bowlKey];
                              const currentWins = history[playerName][history[playerName].length - 1];

                              const isWin = useIds
                                  ? (normalizeId(pickVal) && normalizeId(pickVal) === winnerKey)
                                  : (pickVal && String(pickVal).toLowerCase() === winnerKey.toLowerCase());

                              history[playerName].push(currentWins + (isWin ? 1 : 0));
                          });
                      });

                      const series = players.map((p, idx) => ({
                          name: p,
                          data: history[p],
                          color: getColor(idx)
                      }));

                      const gameCount = sortedSchedule.length;
                      const maxWins = Math.max(...series.map(s => s.data[s.data.length - 1]));

                      // Table data (current standing)
                      const tData = players.map((p, idx) => {
                          const wins = history[p][history[p].length - 1];
                          return { name: p, wins, color: getColor(idx) };
                      }).sort((a, b) => b.wins - a.wins);

                      setChartData({ series, maxWins, gameCount });
                      setTableData(tData);
                  } catch (e) {
                      console.error(e);
                  }
              }, [schedule, picks, picksIds]);

              const activePlayer = selectedPlayer || hoveredPlayer;

              const getLineStyle = (player) => {
                  if (activePlayer === player.name) {
                      return { stroke: player.color, strokeWidth: 4, opacity: 1, zIndex: 50 };
                  }
                  if (activePlayer) {
                      // Dim others if one is active
                      return { stroke: '#cbd5e1', strokeWidth: 1.5, opacity: 0.3, zIndex: 1 };
                  }
                  // Default state
                  return { stroke: player.color, strokeWidth: 2, opacity: 0.8, zIndex: 10 };
              };

              if (loading) return <LoadingSpinner text="Analyzing the race..." />;
              if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load race data"} />;

              // Chart Dimensions
              const VIEWBOX_WIDTH = 1000;
              const VIEWBOX_HEIGHT = 400;
              const PADDING_TOP = 20;
              const PADDING_BOTTOM = 40;
              const PADDING_LEFT = 40;
              const PADDING_RIGHT = 30;

              // Avoid division by zero if no games played
              const xStep = chartData.gameCount > 0 ? (VIEWBOX_WIDTH - PADDING_LEFT - PADDING_RIGHT) / chartData.gameCount : 0;
              // Y scale based on maxWins + padding so line doesn't hit absolute top
              const yDomain = chartData.maxWins > 0 ? chartData.maxWins : 5;
              const yScale = (val) => (VIEWBOX_HEIGHT - PADDING_BOTTOM) - ((val / yDomain) * (VIEWBOX_HEIGHT - PADDING_TOP - PADDING_BOTTOM));

              // Create a safe sorted copy of series for rendering
              const sortedSeries = [...chartData.series].sort((a, b) => (a.name === activePlayer ? 1 : b.name === activePlayer ? -1 : 0));

              return (
                  <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                      <div className="bg-white pt-8 pb-8 px-4">
                          <div className="max-w-7xl mx-auto text-center">
                              <h2 className="text-3xl text-blue-900 font-bold mb-1">The Race</h2>
                              <p className="text-gray-600 text-sm">Track the rise (and fall) of every player.</p>
                          </div>
                      </div>

                      <div className="px-2 md:px-6 flex flex-col items-center gap-8">

                          {/* CHART CARD */}
                          <div className="w-full max-w-[98%] md:max-w-[90%] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden p-4 md:p-6">
                              {chartData.gameCount === 0 ? (
                                  <div className="text-center text-gray-400 py-12 italic">No games completed yet. The race hasn't started!</div>
                              ) : (
                                  <div className="w-full overflow-hidden">
                                      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full h-auto block select-none">

                                          {/* Wins Label */}
                                          <text
                                              x={PADDING_LEFT - 10}
                                              y={12}
                                              textAnchor="end"
                                              className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider hidden md:block"
                                              style={{ fontSize: '10px' }}
                                          >
                                              WINS
                                          </text>

                                          {/* Y-Axis Grid & Labels */}
                                          {[...Array(yDomain + 1)].map((_, i) => (
                                              <g key={`y-grid-${i}`}>
                                                  <line
                                                      x1={PADDING_LEFT}
                                                      y1={yScale(i)}
                                                      x2={VIEWBOX_WIDTH - PADDING_RIGHT}
                                                      y2={yScale(i)}
                                                      stroke="#f1f5f9"
                                                      strokeWidth="1"
                                                  />
                                                  <text
                                                      x={PADDING_LEFT - 10}
                                                      y={yScale(i) + 4}
                                                      textAnchor="end"
                                                      className="text-[12px] fill-gray-400 font-bold"
                                                      style={{ fontSize: '12px' }}
                                                  >
                                                      {i}
                                                  </text>
                                              </g>
                                          ))}

                                          {/* X-Axis Labels (Every 5 games if many, else every 1) */}
                                          {[...Array(chartData.gameCount + 1)].map((_, i) => {
                                              if (chartData.gameCount > 20 && i % 5 !== 0 && i !== chartData.gameCount) return null;
                                              return (
                                                  <text
                                                      key={`x-label-${i}`}
                                                      x={PADDING_LEFT + i * xStep}
                                                      y={VIEWBOX_HEIGHT - 10}
                                                      textAnchor="middle"
                                                      className="text-[12px] fill-gray-400 font-bold"
                                                      style={{ fontSize: '12px' }}
                                                  >
                                                      {i}
                                                  </text>
                                              );
                                          })}

                                          {/* Lines & Dots */}
                                          {sortedSeries.map((player) => {
                                              const style = getLineStyle(player);
                                              const points = player.data.map((wins, gameIdx) =>
                                                  `${PADDING_LEFT + gameIdx * xStep},${yScale(wins)}`
                                              ).join(' ');

                                              // Last point coordinates for dot
                                              const lastX = PADDING_LEFT + (player.data.length - 1) * xStep;
                                              const lastY = yScale(player.data[player.data.length - 1]);

                                              return (
                                                  <g key={player.name}>
                                                      <polyline
                                                          points={points}
                                                          fill="none"
                                                          stroke={style.stroke}
                                                          strokeWidth={style.strokeWidth}
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          opacity={style.opacity}
                                                          className="transition-all duration-300 ease-in-out"
                                                      />
                                                      <circle
                                                          cx={lastX}
                                                          cy={lastY}
                                                          r={activePlayer === player.name ? 6 : 3}
                                                          fill={style.stroke}
                                                          opacity={style.opacity}
                                                          className="transition-all duration-300 ease-in-out"
                                                      />
                                                  </g>
                                              );
                                          })}
                                      </svg>
                                      <div className="hidden md:flex justify-end text-xs text-gray-400 mt-2 font-bold uppercase tracking-wider">
                                          <span>Games Played</span>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* PLAYERS GRID */}
                          <div className="w-full max-w-[98%] md:max-w-[90%] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                              <div className="px-4 py-3 border-b border-gray-100">
                                  <h3 className="text-lg font-bold text-gray-900 font-serif">Win Count</h3>
                              </div>
                              <div
                                  className="p-4"
                                  onMouseLeave={() => setHoveredPlayer(null)}
                              >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                      {tableData.map((player) => {
                                          const isSelected = selectedPlayer === player.name;
                                          const isHighlighted = activePlayer === player.name;

                                          // Dynamic styles for the card
                                          let cardStyle = "border-transparent hover:bg-gray-50 hover:border-gray-100";
                                          if (isSelected) {
                                              cardStyle = "bg-blue-50 border-blue-200 ring-1 ring-blue-300";
                                          } else if (isHighlighted) {
                                              cardStyle = "bg-gray-100 border-gray-200";
                                          }

                                          // Text styles
                                          const nameStyle = isSelected || isHighlighted ? 'text-gray-900 font-bold' : 'text-gray-700 font-medium';

                                          return (
                                              <div
                                                  key={player.name}
                                                  onMouseEnter={() => setHoveredPlayer(player.name)}
                                                  onClick={() => setSelectedPlayer(selectedPlayer === player.name ? null : player.name)}
                                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${cardStyle}`}
                                              >
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }}></div>
                                                      <span className={`text-sm truncate ${nameStyle}`}>
                                                          {player.name}
                                                      </span>
                                                  </div>
                                                  <span className="font-bold text-lg text-gray-900">{player.wins}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>

                      </div>
                  </div>
              );
          };



  // Export
  RC.pages.RacePage = RacePage;
})();
