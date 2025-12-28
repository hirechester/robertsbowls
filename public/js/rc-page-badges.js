/* Roberts Bowls - Badges Reset (Stage Badges-Reset v6)
   - Uses the *exact* BadgeCard component styling/hover from your live main Badges page
   - Fixes the page-level return markup (previous v5 accidentally returned BadgeCard JSX directly)
   - Still includes ONE sanity badge (Top Dawg) computed ID-native (picksIds + Bowl ID + Winner ID)
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

const BadgeCard = ({ emoji, title, winners, description, colorTheme }) => {
            const [showList, setShowList] = useState(false);
            const isTie = winners.length > 1;

            const winnerText = isTie ? `${winners.length} Tied` : (winners.length > 0 ? winners[0] : "TBD");

            return (
                <div
                    className={`relative overflow-hidden rounded-2xl border p-6 shadow-md transition-all hover:scale-[1.02] hover:shadow-xl ${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 mr-2 relative z-10">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">{title}</p>
                            <h3 className="text-xl font-black leading-tight text-gray-900 mb-2 truncate">{winnerText}</h3>

                            {isTie && (
                                <button
                                    onClick={() => setShowList(!showList)}
                                    className="text-xs font-bold hover:underline flex items-center gap-1 focus:outline-none opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    {showList ? "Hide List" : "View List"}
                                    <span className="text-[10px] ml-1">{showList ? "▲" : "▼"}</span>
                                </button>
                            )}
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-3xl shadow-sm backdrop-blur-sm flex-shrink-0">
                            {emoji}
                        </div>
                    </div>

                    {showList && isTie ? (
                        <div className="mt-4 bg-white/40 rounded-lg p-2 max-h-32 overflow-y-auto backdrop-blur-sm">
                            <ul className="text-sm font-medium">
                                {winners.map((w, idx) => (
                                    <li key={idx} className="border-b border-black/5 last:border-0 py-1 px-1">{w}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm font-medium leading-relaxed opacity-90">
                            {description}
                        </p>
                    )}
                </div>
            );
        };

  const BadgesPage = () => {
    const { schedule, picksIds, loading, error } = RC.data.useLeagueData();

    const [badges, setBadges] = useState([]);

    const { LoadingSpinner, ErrorMessage } = (RC.ui || {});
    const Spinner = LoadingSpinner || (() => <div className="p-6">Loading…</div>);
    const Err = ErrorMessage || (({ message }) => <div className="p-6 text-red-600">{message}</div>);

    const THEMES = useMemo(() => [
      { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
      { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
      { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
      { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
      { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
      { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
    ], []);

    useEffect(() => {
      if (loading || error) return;
      if (!Array.isArray(schedule) || !Array.isArray(picksIds)) return;

      try {
        const players = picksIds.filter(p => p && p.Name);
        const completed = schedule.filter(g => {
          const bowlId = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
          const winnerId = (g && g["Winner ID"] !== undefined && g["Winner ID"] !== null) ? String(g["Winner ID"]).trim() : "";
          return Boolean(bowlId && winnerId);
        });

        const winsByPlayer = {};
        players.forEach(p => { winsByPlayer[p.Name] = 0; });

        completed.forEach(g => {
          const bowlId = String(g["Bowl ID"]).trim();
          const winnerId = String(g["Winner ID"]).trim();

          players.forEach(p => {
            const pickId = (p[bowlId] !== undefined && p[bowlId] !== null) ? String(p[bowlId]).trim() : "";
            if (pickId && pickId === winnerId) winsByPlayer[p.Name] += 1;
          });
        });

        const counts = Object.values(winsByPlayer);
        const maxWins = counts.length ? Math.max(...counts) : 0;

        const winners = maxWins > 0
          ? Object.keys(winsByPlayer).filter(n => winsByPlayer[n] === maxWins).sort((a,b) => a.localeCompare(b))
          : [];

        const theme = THEMES[0] || { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" };
        const description = completed.length
          ? `Most correct picks so far (${maxWins}).`
          : `Waiting on completed games.`;

        setBadges([{
          id: "top-dawg",
          emoji: "🏆",
          title: "Top Dawg",
          winners,
          description,
          colorTheme: theme,
        }]);
      } catch (e) {
        console.error("Error init badges:", e);
      }
    }, [loading, error, schedule, picksIds, THEMES]);

    if (loading) return <Spinner text="Calculating Superlatives..." />;
    if (error) return <Err message={(error && (error.message || String(error))) || "Failed to load data"} />;

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        {/* Page Header (matches other pages) */}
        <div className="bg-white pt-8 pb-8 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Superlatives</h2>
            <p className="text-gray-600 text-sm">
              Celebrating the best, worst, and weirdest performances.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="px-4 md:px-6 flex flex-col items-center">
          <div className="w-full max-w-7xl">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((b) => (
            <BadgeCard
              key={b.id || b.title}
              emoji={b.emoji}
              title={b.title}
              winners={b.winners}
              description={b.description}
              colorTheme={b.colorTheme || THEMES[0]}
            />
          ))}
        </div>
          </div>
        </div>
      </div>
    );
  };

  RC.pages.BadgesPage = BadgesPage;
})();
