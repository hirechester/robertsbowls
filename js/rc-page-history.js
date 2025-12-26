(() => {
  const { useState, useEffect, useMemo } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // 8. HISTORY PAGE
  const HistoryPage = () => {
              const [historyData, setHistoryData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
              useEffect(() => {
                  const fetchHistory = async () => {
                      try {
                          const response = await fetch(HISTORY_URL); if (!response.ok) throw new Error("Failed to fetch History data");
                          const text = await response.text(); const rawData = csvToJson(text);
                          const sortedAsc = rawData.filter(r => r.Year && r.Winner).sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
                          const winCounts = {};
                          setHistoryData(sortedAsc.map(entry => {
                              const winner = entry.Winner.trim(); winCounts[winner] = (winCounts[winner] || 0) + 1;
                              return { ...entry, winNumber: winCounts[winner] };
                          }).reverse());
                      } catch (err) { console.error(err); setError(err.message); } finally { setLoading(false); }
                  };
                  fetchHistory();
              }, []);
              if (loading) return <LoadingSpinner text="Loading History..." />;
              if (error) return <ErrorMessage message={error} />;
              return (
                  <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                      <div className="bg-white pt-8 pb-8 px-4"><div className="max-w-7xl mx-auto text-center"><h2 className="text-3xl text-blue-900 font-bold mb-1">Hall of Fame</h2><p className="text-gray-600 text-sm">The legends of the family pool.</p></div></div>
                      <div className="relative px-4 max-w-2xl mx-auto w-full"><div className="space-y-8">
                              {historyData.map((item, index) => (
                                  <div key={index} className="relative flex items-center group">
                                      <div className="absolute left-6 md:left-8 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 group-hover:border-yellow-400 transition-all duration-300">
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                                      </div>
                                      <div className="ml-16 md:ml-20 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full flex justify-between items-center relative overflow-hidden group-hover:shadow-md transition-shadow">
                                          <div className="absolute -right-2 -bottom-6 text-7xl md:text-8xl font-black text-gray-50 select-none z-0">{item.Year}</div>
                                          <div className="relative z-10"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Champion</span>{item.winNumber > 1 && (<span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide border border-yellow-200 shadow-sm">{item.winNumber}-Time Winner</span>)}</div><h3 className="text-2xl md:text-3xl font-bold text-gray-800">{item.Winner}</h3></div>
                                          <div className="relative z-10 ml-4"><div className="bg-gray-50 px-3 py-1 md:px-4 md:py-2 rounded-lg border border-gray-100 text-center"><span className="text-lg md:text-xl font-bold text-blue-900 block leading-none">{item.Year}</span></div></div>
                                      </div>
                                  </div>
                              ))}
                          </div></div>
                  </div>
              );
          };

  RC.pages.HistoryPage = HistoryPage;
})();