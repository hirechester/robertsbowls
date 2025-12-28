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

      const shuffleArray = (arr) => {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      };

      const ctx = { schedule, picksIds, THEMES };

      const BADGE_DEFS = [
        // Badge #2: The Matriarch (static, no ties)
        {
          id: "matriarch",
          emoji: "👸",
          title: "The Matriarch",
          themeHint: "amber",
          compute: () => ({
            winners: ["Nana"],
            description: "The heart of the Roberts Cup (and the family). Win or lose, she\'s still the favorite."
          })
        },



// Badge #3: King Slayer (individual)
{
  id: "king-slayer",
  emoji: "👑",
  title: "King Slayer",
  themeHint: "amber",
  compute: ({ schedule, picksIds }) => {
    const players = picksIds.filter(p => p && p.Name);
    const playerByName = {};
    players.forEach(p => { playerByName[p.Name] = p; });

    const completed = schedule.filter(g => {
      const bowlId = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
      const winnerId = (g && g["Winner ID"] !== undefined && g["Winner ID"] !== null) ? String(g["Winner ID"]).trim() : "";
      return Boolean(bowlId && winnerId);
    });

    if (!completed.length || !players.length) {
      return { winners: [], description: "Waiting on completed games." };
    }

    // 1) Current leaders (Top Dawg logic)
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

    const maxWins = Math.max(...Object.values(winsByPlayer));
    const leaders = Object.keys(winsByPlayer).filter(n => winsByPlayer[n] === maxWins);

    // 2) King Slayer points: correct picks on bowls where any leader missed
    const ksByPlayer = {};
    players.forEach(p => { ksByPlayer[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = String(g["Bowl ID"]).trim();
      const winnerId = String(g["Winner ID"]).trim();

      const leaderStumbled = leaders.some(ln => {
        const lp = playerByName[ln];
        if (!lp) return false;
        const lPick = (lp[bowlId] !== undefined && lp[bowlId] !== null) ? String(lp[bowlId]).trim() : "";
        return Boolean(lPick) && lPick !== winnerId;
      });

      if (!leaderStumbled) return;

      players.forEach(p => {
        const pickId = (p[bowlId] !== undefined && p[bowlId] !== null) ? String(p[bowlId]).trim() : "";
        if (pickId && pickId === winnerId) ksByPlayer[p.Name] += 1;
      });
    });

    const maxKs = Math.max(...Object.values(ksByPlayer));
    const winners = maxKs > 0
      ? Object.keys(ksByPlayer).filter(n => ksByPlayer[n] === maxKs).sort((a,b) => a.localeCompare(b))
      : [];

    const description = maxKs > 0
      ? `Takes down the giants. Won ${maxKs} game${maxKs === 1 ? "" : "s"} where the leader(s) stumbled.`
      : "No leader stumbles yet — check back after an upset!";

    return { winners, description };
  }
},

        // Badge #1 (sanity): Top Dawg (ID-native scoring)
        {
          id: "top-dawg",
          emoji: "🏆",
          title: "Top Dawg",
          themeHint: "indigo",
          compute: ({ schedule, picksIds }) => {
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

            const description = completed.length
              ? `Most correct picks so far (${maxWins}).`
              : `Waiting on completed games.`;

            return { winners, description };
          }
        },
      ];

      const themeFromHint = (hint) => {
        if (!hint) return THEMES[Math.floor(Math.random() * THEMES.length)];
        const key = String(hint).toLowerCase();
        if (key.includes("yellow") || key.includes("amber") || key.includes("gold")) return THEMES[2];
        if (key.includes("indigo")) return THEMES[0];
        if (key.includes("emerald") || key.includes("green")) return THEMES[1];
        if (key.includes("rose") || key.includes("red") || key.includes("pink")) return THEMES[3];
        if (key.includes("cyan") || key.includes("teal") || key.includes("blue")) return THEMES[4];
        if (key.includes("violet") || key.includes("purple")) return THEMES[5];
        return THEMES[Math.floor(Math.random() * THEMES.length)];
      };

      const built = [];

      BADGE_DEFS.forEach((def) => {
        try {
          const result = def.compute(ctx) || {};
          const theme = themeFromHint(def.themeHint);

          built.push({
            id: def.id,
            emoji: def.emoji,
            title: def.title,
            winners: Array.isArray(result.winners) ? result.winners : [],
            description: result.description || "",
            colorTheme: theme,
          });
        } catch (e) {
          console.warn(`Badge failed: ${def.id}`, e);
        }
      });

      setBadges(shuffleArray(built));
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
