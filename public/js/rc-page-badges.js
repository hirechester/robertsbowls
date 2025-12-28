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
    const { schedule, bowlGames, picksIds, teamById, teams, history, loading, error } = RC.data.useLeagueData();
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
      { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
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

      const ctx = { schedule, bowlGames, picksIds, teamById, teams, history, THEMES };

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
      ? `Takes down the giants when they wobble. Won ${maxKs} game${maxKs === 1 ? "" : "s"} where the leader(s) stumbled — pure upset energy.`
      : "No leader stumbles yet — everyone’s playing it safe. Waiting on the first real upset to crown a slayer.";

    return { winners, description };
  }
},

// Badge #4: Championship Rivals (affinity)
{
  id: "championship-rivals",
  emoji: "🥊",
  title: "Championship Rivals",
  themeHint: "rose",
  compute: ({ schedule, picksIds }) => {
    const players = picksIds.filter(p => p && p.Name);

    if (!players.length) return { winners: [], description: "Waiting on picks." };

    // Find the National Championship Bowl ID
    const nattyGame = Array.isArray(schedule)
      ? schedule.find(g => String(g && (g.Bowl || g["Bowl Name"] || "")).toLowerCase().includes("national championship"))
      : null;

    const nattyId = nattyGame && nattyGame["Bowl ID"] !== undefined && nattyGame["Bowl ID"] !== null
      ? String(nattyGame["Bowl ID"]).trim()
      : "";

    // Bowl IDs to compare (prefer schedule list)
    const bowlIds = (() => {
      const ids = new Set();
      if (Array.isArray(schedule)) {
        schedule.forEach(g => {
          const bid = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
          if (bid) ids.add(bid);
        });
      }
      if (ids.size === 0) {
        const sample = players[0] || {};
        Object.keys(sample).forEach(k => {
          if (k === "Name" || k === "Timestamp" || k === "Email") return;
          if (/^\d+$/.test(String(k).trim())) ids.add(String(k).trim());
        });
      }
      return Array.from(ids);
    })();

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    let bestRate = -1;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = players[i];
        const B = players[j];

        // Must disagree on Natty pick (and both must have one if nattyId exists)
        if (nattyId) {
          const aNat = (A[nattyId] !== undefined && A[nattyId] !== null) ? String(A[nattyId]).trim() : "";
          const bNat = (B[nattyId] !== undefined && B[nattyId] !== null) ? String(B[nattyId]).trim() : "";
          if (!aNat || !bNat || aNat === bNat) continue;
        }

        let total = 0;
        let agree = 0;

        bowlIds.forEach(bid => {
          const aPick = (A[bid] !== undefined && A[bid] !== null) ? String(A[bid]).trim() : "";
          const bPick = (B[bid] !== undefined && B[bid] !== null) ? String(B[bid]).trim() : "";
          if (!aPick || !bPick) return;
          total += 1;
          if (aPick === bPick) agree += 1;
        });

        if (total === 0) continue;

        const rate = agree / total;

        if (rate > bestRate + 1e-12) {
          bestRate = rate;
          winners.length = 0;
          winners.push(labelPair(A.Name, B.Name));
        } else if (Math.abs(rate - bestRate) <= 1e-12) {
          winners.push(labelPair(A.Name, B.Name));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const description = bestRate < 0
      ? "No rivals yet — need differing National Championship picks. Once two people split on the Natty, the gloves come off."
      : `Highest agreement among Natty rivals (${Math.round(bestRate * 100)}%). Same brain all season… until the end.`;

    return { winners, description };
  }
},

// Badge #5: Blind Faith (individual)
{
  id: "blind-faith",
  emoji: "🙈",
  title: "Blind Faith",
  themeHint: "slate",
  compute: ({ schedule, picksIds, teamById, teams }) => {
    const players = picksIds.filter(p => p && p.Name);
    const completed = Array.isArray(schedule) ? schedule.filter(g => {
      const bowlId = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
      const winnerId = (g && g["Winner ID"] !== undefined && g["Winner ID"] !== null) ? String(g["Winner ID"]).trim() : "";
      return Boolean(bowlId && winnerId);
    }) : [];

    if (!players.length) return { winners: [], description: "Waiting on picks." };
    if (!completed.length) return { winners: [], description: "Waiting on completed games." };

    const byId = (() => {
      if (teamById && typeof teamById === "object") return teamById;
      const map = {};
      if (Array.isArray(teams)) {
        teams.forEach(t => {
          const rawId = (t && (t["Team ID"] ?? t.TeamID ?? t.id)) !== undefined ? (t["Team ID"] ?? t.TeamID ?? t.id) : "";
          const id = String(rawId || "").trim();
          if (id) map[id] = t;
        });
      }
      return map;
    })();

    const pickFirst = (...vals) => {
      for (const v of vals) {
        const s = (v === null || v === undefined) ? "" : String(v).trim();
        if (s) return s;
      }
      return "";
    };

    const cleanNum = (s) => {
      const raw = String(s || "").trim();
      if (!raw) return "";
      const m = raw.match(/(\d+)/);
      return m ? m[1] : "";
    };

    const isUnranked = (team) => {
      if (!team) return false; // unknown team: don't count it
      const seedRaw = pickFirst(team["Seed"], team["Team Seed"], team["Seed #"], team["Seed Number"], team["Playoff Seed"], team["CFP Seed"]);
      const rankRaw = pickFirst(team["Ranking"], team["Rank"], team["AP Rank"], team["AP Ranking"], team["Rk"]);
      const seedNum = cleanNum(seedRaw);
      const rankNum = cleanNum(rankRaw);
      return !seedNum && !rankNum;
    };

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = String(g["Bowl ID"]).trim();
      const winnerId = String(g["Winner ID"]).trim();

      players.forEach(p => {
        const pickId = (p[bowlId] !== undefined && p[bowlId] !== null) ? String(p[bowlId]).trim() : "";
        if (!pickId) return;
        if (pickId !== winnerId) return;

        const team = byId[pickId];
        if (isUnranked(team)) wins[p.Name] += 1;
      });
    });

    const counts = Object.values(wins);
    const maxWins = counts.length ? Math.max(...counts) : 0;

    const winners = maxWins > 0
      ? Object.keys(wins).filter(n => wins[n] === maxWins).sort((a, b) => a.localeCompare(b))
      : [];

    const description = maxWins > 0
      ? `Most correct picks with unranked teams (${maxWins}). Trusting the chaos and cashing it in — the ultimate “why not?” energy.`
      : "No unranked winners yet — chalk has ruled so far. Waiting on an unranked surprise to make this badge spicy.";

    return { winners, description };
  }
},

// Badge #6: Mortal Enemies (affinity)
{
  id: "mortal-enemies",
  emoji: "⚔️",
  title: "Mortal Enemies",
  themeHint: "dark gray",
  compute: ({ schedule, picksIds }) => {
    const players = picksIds.filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    // Bowl IDs to compare (prefer schedule list)
    const bowlIds = (() => {
      const ids = new Set();
      if (Array.isArray(schedule)) {
        schedule.forEach(g => {
          const bid = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
          if (bid) ids.add(bid);
        });
      }
      if (ids.size === 0) {
        const sample = players[0] || {};
        Object.keys(sample).forEach(k => {
          if (k === "Name" || k === "Timestamp" || k === "Email") return;
          if (/^\d+$/.test(String(k).trim())) ids.add(String(k).trim());
        });
      }
      return Array.from(ids);
    })();

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    let worstRate = Infinity;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = players[i];
        const B = players[j];

        let total = 0;
        let agree = 0;

        bowlIds.forEach(bid => {
          const aPick = (A[bid] !== undefined && A[bid] !== null) ? String(A[bid]).trim() : "";
          const bPick = (B[bid] !== undefined && B[bid] !== null) ? String(B[bid]).trim() : "";
          if (!aPick || !bPick) return;
          total += 1;
          if (aPick === bPick) agree += 1;
        });

        if (total === 0) continue;

        const rate = agree / total;

        if (rate < worstRate - 1e-12) {
          worstRate = rate;
          winners.length = 0;
          winners.push(labelPair(A.Name, B.Name));
        } else if (Math.abs(rate - worstRate) <= 1e-12) {
          winners.push(labelPair(A.Name, B.Name));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const description = (worstRate === Infinity)
      ? "Not enough overlapping picks yet to start a feud. Make more picks and let the sparks fly."
      : `Lowest agreement in the league (${Math.round(worstRate * 100)}%). If there’s a hill to die on, these two chose different ones.`;

    return { winners, description };
  }
},

// Badge #7: Booked a Tee Time (individual)
{
  id: "booked-a-tee-time",
  emoji: "🏌️‍♂️",
  title: "Booked a Tee Time",
  themeHint: "emerald",
  compute: ({ schedule, picksIds }) => {
    const players = picksIds.filter(p => p && p.Name);
    const completed = Array.isArray(schedule) ? schedule.filter(g => {
      const bowlId = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
      const winnerId = (g && g["Winner ID"] !== undefined && g["Winner ID"] !== null) ? String(g["Winner ID"]).trim() : "";
      return Boolean(bowlId && winnerId);
    }) : [];

    if (!players.length) return { winners: [], description: "Waiting on picks." };
    if (!completed.length) return { winners: [], description: "Waiting on completed games." };

    const losses = {};
    players.forEach(p => { losses[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = String(g["Bowl ID"]).trim();
      const winnerId = String(g["Winner ID"]).trim();

      players.forEach(p => {
        const pickId = (p[bowlId] !== undefined && p[bowlId] !== null) ? String(p[bowlId]).trim() : "";
        if (!pickId) return;
        if (pickId !== winnerId) losses[p.Name] += 1;
      });
    });

    const counts = Object.values(losses);
    const maxLosses = counts.length ? Math.max(...counts) : 0;

    const winners = maxLosses > 0
      ? Object.keys(losses).filter(n => losses[n] === maxLosses).sort((a, b) => a.localeCompare(b))
      : [];

    const description = maxLosses > 0
      ? `Most wrong picks so far (${maxLosses}). The clubs are packed and the cart is warming up.`
      : "Nobody’s taken a big hit yet — the fairway is still wide open.";

    return { winners, description };
  }
},

// Badge #8: Home Sweet Dome (individual)
{
  id: "home-sweet-dome",
  emoji: "🏟️",
  title: "Home Sweet Dome",
  themeHint: "rose",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const isTruthy = (v) => {
      const s = String(v ?? "").trim().toLowerCase();
      return s === "true" || s === "yes" || s === "y" || s === "1" || s === "t";
    };

    const indoorGames = (bowlGames || []).filter((g) => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      // Source of truth (supports your rename): Indoor / Indoor? / Indoors
      const indoorRaw = (g && (g["Indoor"] ?? g["Indoor?"] ?? g["Indoors"]));
      if (indoorRaw === undefined || indoorRaw === null || String(indoorRaw).trim() === "") return false;

      return isTruthy(indoorRaw);
    });

    if (!indoorGames.length) {
      return { winners: [], description: "No indoor games counted yet — make sure Bowl Games has Indoor = TRUE for completed dome games." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    indoorGames.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (!pickId) return;
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const counts = Object.values(wins);
    const maxWins = counts.length ? Math.max(...counts) : 0;

    const winners = maxWins > 0
      ? Object.keys(wins).filter(n => wins[n] === maxWins).sort((a, b) => a.localeCompare(b))
      : [];

    const description = maxWins > 0
      ? `Most correct picks under a roof (${maxWins}). No wind, no excuses — just clean work.`
      : "Nobody’s stacked indoor wins yet — waiting for some dome magic.";

    return { winners, description };
  }
},
// Badge #9: The Sheep (individual)
{
  id: "the-sheep",
  emoji: "🐑",
  title: "The Sheep",
  themeHint: "slate",
  compute: ({ schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    // Bowl IDs to evaluate (prefer schedule list)
    const bowlIds = (() => {
      const ids = new Set();
      if (Array.isArray(schedule)) {
        schedule.forEach(g => {
          const bid = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
          if (bid) ids.add(bid);
        });
      }
      if (ids.size === 0) {
        const sample = players[0] || {};
        Object.keys(sample).forEach(k => {
          if (k === "Name" || k === "Timestamp" || k === "Email") return;
          if (/^\d+$/.test(String(k).trim())) ids.add(String(k).trim());
        });
      }
      return Array.from(ids);
    })();

    const followed = {};
    players.forEach(p => { followed[p.Name] = 0; });

    bowlIds.forEach((bid) => {
      // Everyone has picks per your league rules
      const freq = {};
      players.forEach(p => {
        const pid = String(p[bid]).trim();
        freq[pid] = (freq[pid] || 0) + 1;
      });

      const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      if (!entries.length) return;

      const topCount = entries[0][1];
      // If tied for top, no clear majority—skip this bowl
      const tiedTop = entries.length > 1 && entries[1][1] === topCount;
      if (tiedTop) return;

      const majorityPick = entries[0][0];

      players.forEach(p => {
        const pid = String(p[bid]).trim();
        if (pid === majorityPick) followed[p.Name] += 1;
      });
    });

    const counts = Object.values(followed);
    const maxFollowed = counts.length ? Math.max(...counts) : 0;

    const winners = Object.keys(followed)
      .filter(n => followed[n] === maxFollowed)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most “follow-the-crowd” picks (${maxFollowed}). When the room nods, they nod too.`;

    return { winners, description };
  }
}
    ,
// Badge #10: Night Owl (individual)
{
  id: "night-owl",
  emoji: "🦉",
  title: "Night Owl",
  themeHint: "brown",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;

      // Format: "7:00 PM"
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;

      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();

      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const cutoff = 19 * 60; // 7:00 PM

    const lateCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const t = g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]);
      const mins = parseTimeToMinutes(t);
      return Number.isFinite(mins) && mins >= cutoff;
    });

    if (!lateCompleted.length) {
      return { winners: [], description: "No 7 PM+ winners logged yet — waiting for the late window to cash." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    lateCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks after 7 PM (${maxWins}). Late kickoff, sharp instincts — somebody’s thriving after dark.`;

    return { winners, description };
  }
}
    ,
// Badge #11: Alphabet Soup (individual)
{
  id: "alphabet-soup",
  emoji: "🥫",
  title: "Alphabet Soup",
  themeHint: "rose",
  compute: ({ bowlGames, picksIds, teamById }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const nameForTeamId = (tid) => {
      const t = teamById && tid ? teamById[normId(tid)] : null;
      const n = t && (t["School Name"] ?? t["School"] ?? t["Team"] ?? t["Name"]);
      return String(n ?? "").trim();
    };

    const completed = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      const homeId = normId(g && (g["Home ID"] ?? g["HomeID"]));
      const awayId = normId(g && (g["Away ID"] ?? g["AwayID"]));
      return Boolean(bowlId && winnerId && homeId && awayId);
    });

    if (!completed.length) {
      return { winners: [], description: "No completed bowls yet — the alphabet hasn’t decided anything (yet)." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);
      const homeId = normId(g["Home ID"] ?? g["HomeID"]);
      const awayId = normId(g["Away ID"] ?? g["AwayID"]);

      const homeName = nameForTeamId(homeId);
      const awayName = nameForTeamId(awayId);

      // If we can't resolve both names, skip to avoid bogus counts
      if (!homeName || !awayName) return;

      const firstTeamId = (awayName.localeCompare(homeName, undefined, { sensitivity: "base" }) <= 0) ? awayId : homeId;

      // Only award points when the alphabetical-first team actually won,
      // AND the player picked that winning team.
      if (winnerId !== firstTeamId) return;

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId && pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most wins when the alphabet wins (${maxWins}). If it comes first in the dictionary, it comes first on their scoreboard.`;

    return { winners, description };
  }
}
    ,
// Badge #12: Chasing Glory (individual)
{
  id: "chasing-glory",
  emoji: "⭐️",
  title: "Chasing Glory",
  themeHint: "yellow",
  compute: ({ bowlGames, picksIds, history }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    // Build a set of past champions from History tab (support multiple possible column names)
    const champNames = new Set(
      (history || [])
        .map(r => {
          const v =
            (r && (r["Champion"] ?? r["Winner"] ?? r["Champion Name"] ?? r["Champ"] ?? r["Champion(s)"] ?? r["Champions"])) ??
            "";
          return String(v).trim();
        })
        .filter(Boolean)
        .map(n => n.toLowerCase())
    );

    // Eligible = players who have never won a championship historically
    const eligible = players.filter(p => !champNames.has(String(p.Name).trim().toLowerCase()));
    if (!eligible.length) {
      return {
        winners: [],
        description: "Everyone’s got a ring in the trophy case — no first-timer glory to chase this year."
      };
    }

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const completed = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      return Boolean(bowlId && winnerId);
    });

    if (!completed.length) {
      return { winners: [], description: "No winners logged yet — glory can’t be chased until bowls are decided." };
    }

    const wins = {};
    eligible.forEach(p => { wins[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      eligible.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most wins among players still hunting their first title (${maxWins}). The banner-less are making noise.`;

    return { winners, description };
  }
}
    ,
// Badge #13: The Avengers (affinity)
{
  id: "the-avengers",
  emoji: "👊",
  title: "The Avengers",
  themeHint: "emerald",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const completed = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      return Boolean(bowlId && winnerId);
    });

    if (!completed.length) {
      return { winners: [], description: "No completed games yet — assembling is hard without results." };
    }

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    // Precompute per-player correctness by bowl for speed/clarity
    const correctByPlayer = {};
    players.forEach(p => {
      const name = String(p.Name).trim();
      correctByPlayer[name] = {};
      completed.forEach(g => {
        const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
        const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);
        const pickId = normId(p[bowlId]);
        correctByPlayer[name][bowlId] = (pickId === winnerId);
      });
    });

    let best = -1;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = String(players[i].Name).trim();
        const B = String(players[j].Name).trim();

        let sharedWins = 0;
        completed.forEach(g => {
          const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
          if (correctByPlayer[A][bowlId] && correctByPlayer[B][bowlId]) sharedWins += 1;
        });

        if (sharedWins > best) {
          best = sharedWins;
          winners.length = 0;
          winners.push(labelPair(A, B));
        } else if (sharedWins === best) {
          winners.push(labelPair(A, B));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const description = `Most shared wins together (${best}). Two minds, one scoreboard — this duo keeps landing on the right side of chaos.`;

    return { winners, description };
  }
}
    ,
// Badge #14: Mind Meld (affinity)
{
  id: "mind-meld",
  emoji: "♥️",
  title: "Mind Meld",
  themeHint: "rose",
  compute: ({ schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (players.length < 2) return { winners: [], description: "Need at least two players to meld minds." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    // Bowl IDs to evaluate (prefer schedule list; fallback to numeric keys on picks row)
    const bowlIds = (() => {
      const ids = new Set();
      if (Array.isArray(schedule)) {
        schedule.forEach(g => {
          const bid = (g && g["Bowl ID"] !== undefined && g["Bowl ID"] !== null) ? String(g["Bowl ID"]).trim() : "";
          if (bid) ids.add(bid);
        });
      }
      if (ids.size === 0) {
        const sample = players[0] || {};
        Object.keys(sample).forEach(k => {
          if (k === "Name" || k === "Timestamp" || k === "Email") return;
          if (/^\d+$/.test(String(k).trim())) ids.add(String(k).trim());
        });
      }
      return Array.from(ids);
    })();

    if (!bowlIds.length) {
      return { winners: [], description: "No bowls found to compare — waiting on schedule." };
    }

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    let bestRate = -1;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = String(players[i].Name).trim();
        const B = String(players[j].Name).trim();

        let agree = 0;
        let total = 0;

        bowlIds.forEach(bid => {
          const aPick = normId(players[i][bid]);
          const bPick = normId(players[j][bid]);
          // Your league rules: everyone has a pick, so total counts every bowl
          total += 1;
          if (aPick === bPick) agree += 1;
        });

        const rate = total > 0 ? (agree / total) : 0;

        if (rate > bestRate) {
          bestRate = rate;
          winners.length = 0;
          winners.push(labelPair(A, B));
        } else if (rate === bestRate) {
          winners.push(labelPair(A, B));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const pct = bestRate >= 0 ? Math.round(bestRate * 100) : 0;
    const description = `Highest pick agreement (${pct}%). Two brackets, one brain — it’s getting spooky.`;

    return { winners, description };
  }
}
    ,
// Badge #15: Early Riser (individual)
{
  id: "early-riser",
  emoji: "🌅",
  title: "Early Riser",
  themeHint: "orange",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;

      // Format: "2:00 PM"
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;

      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();

      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const cutoff = 14 * 60; // 2:00 PM

    const earlyCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const t = g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]);
      const mins = parseTimeToMinutes(t);
      return Number.isFinite(mins) && mins <= cutoff;
    });

    if (!earlyCompleted.length) {
      return { winners: [], description: "No 2 PM (or earlier) winners logged yet — the sunrise slate is still brewing." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    earlyCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks at 2 PM or earlier (${maxWins}). While others hit snooze, they’re stacking wins.`;

    return { winners, description };
  }
}
    ,
// Badge #16: The Twins (affinity)
{
  id: "the-twins",
  emoji: "👯",
  title: "The Twins",
  themeHint: "purple",
  compute: ({ bowlGames, schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (players.length < 2) return { winners: [], description: "Need at least two players to find twins." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const parseDateToDay = (dateStr) => {
      const raw = String(dateStr ?? "").trim();
      if (!raw) return NaN;

      // Support YYYY-MM-DD and MM/DD/YYYY (or M/D/YYYY)
      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10) - 1;
        const d = parseInt(iso[3], 10);
        return Date.UTC(y, mo, d);
      }

      const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (us) {
        const mo = parseInt(us[1], 10) - 1;
        const d = parseInt(us[2], 10);
        let y = parseInt(us[3], 10);
        if (y < 100) y += 2000;
        return Date.UTC(y, mo, d);
      }

      const parsed = Date.parse(raw);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    // Build ordered bowl list using Bowl Games (preferred), fallback to schedule, then numeric keys from picks.
    const orderedBowlIds = (() => {
      const rows = Array.isArray(bowlGames) && bowlGames.length ? bowlGames : (Array.isArray(schedule) ? schedule : []);
      const items = [];

      rows.forEach((g, idx) => {
        const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
        if (!bowlId) return;

        const day = parseDateToDay(g && (g["Date"] ?? g["Game Date"] ?? g["Day"]));
        const mins = parseTimeToMinutes(g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]));
        // Use idx as stable tiebreaker when dates/times are missing
        items.push({ bowlId, day, mins, idx });
      });

      // If we couldn't pull any bowls from data rows, fallback to numeric keys on picks row
      if (!items.length) {
        const sample = players[0] || {};
        Object.keys(sample).forEach(k => {
          if (k === "Name" || k === "Timestamp" || k === "Email") return;
          if (/^\d+$/.test(String(k).trim())) items.push({ bowlId: String(k).trim(), day: NaN, mins: NaN, idx: items.length });
        });
      }

      // Sort: known day first, then known time, then idx, then bowlId
      items.sort((a, b) => {
        const ad = Number.isFinite(a.day) ? a.day : Infinity;
        const bd = Number.isFinite(b.day) ? b.day : Infinity;
        if (ad !== bd) return ad - bd;

        const at = Number.isFinite(a.mins) ? a.mins : Infinity;
        const bt = Number.isFinite(b.mins) ? b.mins : Infinity;
        if (at !== bt) return at - bt;

        if (a.idx !== b.idx) return a.idx - b.idx;
        return String(a.bowlId).localeCompare(String(b.bowlId));
      });

      // De-dupe by bowlId while preserving order
      const seen = new Set();
      const out = [];
      items.forEach(it => {
        if (seen.has(it.bowlId)) return;
        seen.add(it.bowlId);
        out.push(it.bowlId);
      });
      return out;
    })();

    if (!orderedBowlIds.length) return { winners: [], description: "No bowls found to compare — waiting on schedule." };

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    let best = -1;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = String(players[i].Name).trim();
        const B = String(players[j].Name).trim();

        let current = 0;
        let maxStreak = 0;

        orderedBowlIds.forEach((bid) => {
          const aPick = normId(players[i][bid]);
          const bPick = normId(players[j][bid]);

          // League rules: always picked, but keep safe
          if (!aPick || !bPick) {
            current = 0;
            return;
          }

          if (aPick === bPick) {
            current += 1;
            if (current > maxStreak) maxStreak = current;
          } else {
            current = 0;
          }
        });

        if (maxStreak > best) {
          best = maxStreak;
          winners.length = 0;
          winners.push(labelPair(A, B));
        } else if (maxStreak === best) {
          winners.push(labelPair(A, B));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const description = `Longest identical-pick streak (${best}). Two brackets, one heartbeat — they’ve been in lockstep for a while.`;

    return { winners, description };
  }
}
    ,
// Badge #17: The Jinx (affinity)
{
  id: "the-jinx",
  emoji: "🐈‍⬛",
  title: "The Jinx",
  themeHint: "dark gray",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (players.length < 2) return { winners: [], description: "Need at least two players to jinx each other." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const completed = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      return Boolean(bowlId && winnerId);
    });

    if (!completed.length) {
      return { winners: [], description: "No completed games yet — the black cat hasn’t crossed anyone’s path." };
    }

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    let best = -1;
    const winners = [];

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const A = String(players[i].Name).trim();
        const B = String(players[j].Name).trim();

        let sharedLosses = 0;

        completed.forEach(g => {
          const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
          const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

          const aPick = normId(players[i][bowlId]);
          const bPick = normId(players[j][bowlId]);

          // League rules: always picked; keep safe anyway.
          if (!aPick || !bPick) return;

          // Identical pick, and it was wrong => shared loss
          if (aPick === bPick && aPick !== winnerId) sharedLosses += 1;
        });

        if (sharedLosses > best) {
          best = sharedLosses;
          winners.length = 0;
          winners.push(labelPair(A, B));
        } else if (sharedLosses === best) {
          winners.push(labelPair(A, B));
        }
      }
    }

    winners.sort((a, b) => a.localeCompare(b));

    const description = `Most shared losses on the same pick (${best}). When these two agree… somebody should panic.`;

    return { winners, description };
  }
}
    ,
// Badge #18: Sub-Zero (individual)
{
  id: "sub-zero",
  emoji: "🥶",
  title: "Sub-Zero",
  themeHint: "light blue",
  compute: ({ bowlGames, schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const parseDateToDay = (dateStr) => {
      const raw = String(dateStr ?? "").trim();
      if (!raw) return NaN;

      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10) - 1;
        const d = parseInt(iso[3], 10);
        return Date.UTC(y, mo, d);
      }

      const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (us) {
        const mo = parseInt(us[1], 10) - 1;
        const d = parseInt(us[2], 10);
        let y = parseInt(us[3], 10);
        if (y < 100) y += 2000;
        return Date.UTC(y, mo, d);
      }

      const parsed = Date.parse(raw);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    // Ordered list of completed bowls (for streak logic)
    const completedOrdered = (() => {
      const rows = Array.isArray(bowlGames) && bowlGames.length ? bowlGames : (Array.isArray(schedule) ? schedule : []);
      const items = [];

      rows.forEach((g, idx) => {
        const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
        const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
        if (!bowlId || !winnerId) return;

        const day = parseDateToDay(g && (g["Date"] ?? g["Game Date"] ?? g["Day"]));
        const mins = parseTimeToMinutes(g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]));
        items.push({ bowlId, winnerId, day, mins, idx });
      });

      items.sort((a, b) => {
        const ad = Number.isFinite(a.day) ? a.day : Infinity;
        const bd = Number.isFinite(b.day) ? b.day : Infinity;
        if (ad !== bd) return ad - bd;

        const at = Number.isFinite(a.mins) ? a.mins : Infinity;
        const bt = Number.isFinite(b.mins) ? b.mins : Infinity;
        if (at !== bt) return at - bt;

        return a.idx - b.idx;
      });

      // De-dupe by bowlId in case of duplicates
      const seen = new Set();
      return items.filter(it => {
        if (seen.has(it.bowlId)) return false;
        seen.add(it.bowlId);
        return true;
      });
    })();

    if (!completedOrdered.length) {
      return { winners: [], description: "No winners logged yet — nobody’s cold until the games start ending." };
    }

    const losingStreaks = {}; // max losing streak per player
    const current = {};       // current streak while scanning chronologically

    players.forEach(p => {
      losingStreaks[p.Name] = 0;
      current[p.Name] = 0;
    });

    completedOrdered.forEach(g => {
      const bid = g.bowlId;
      const wid = g.winnerId;

      players.forEach(p => {
        const pickId = normId(p[bid]);

        // If somehow missing, break streak (but league says always picked)
        if (!pickId) {
          current[p.Name] = 0;
          return;
        }

        const isLoss = (pickId !== wid);
        if (isLoss) {
          current[p.Name] += 1;
          if (current[p.Name] > losingStreaks[p.Name]) losingStreaks[p.Name] = current[p.Name];
        } else {
          current[p.Name] = 0;
        }
      });
    });

    const maxStreak = Math.max(...Object.values(losingStreaks));
    const winners = Object.keys(losingStreaks)
      .filter(n => losingStreaks[n] === maxStreak)
      .sort((a, b) => a.localeCompare(b));

    const description = `Longest losing streak (${maxStreak}). The picks froze solid — somebody’s living in the icebox.`;

    return { winners, description };
  }
}
    ,
// Badge #19: The TV Guide (individual)
{
  id: "the-tv-guide",
  emoji: "📺",
  title: "The TV Guide",
  themeHint: "emerald",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const isESPN = (tv) => {
      const s = String(tv ?? "").trim().toUpperCase();
      if (!s) return false;
      // Treat anything that starts with ESPN as ESPN network (ESPN, ESPN2, ESPN+, ESPNU, ESPN Deportes, etc.)
      return s.startsWith("ESPN");
    };

    const espnCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const tv = g && (g["TV"] ?? g["Network"] ?? g["Channel"]);
      return isESPN(tv);
    });

    if (!espnCompleted.length) {
      return { winners: [], description: "No ESPN winners logged yet — flip the channel, the points aren’t here (yet)." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    espnCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most wins on ESPN games (${maxWins}). They don’t just watch the bowls — they *read* the scroll.`;

    return { winners, description };
  }
}
    ,
// Badge #20: The Heater (individual)
{
  id: "the-heater",
  emoji: "🔥",
  title: "The Heater",
  themeHint: "orange",
  compute: ({ bowlGames, schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const parseDateToDay = (dateStr) => {
      const raw = String(dateStr ?? "").trim();
      if (!raw) return NaN;

      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10) - 1;
        const d = parseInt(iso[3], 10);
        return Date.UTC(y, mo, d);
      }

      const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (us) {
        const mo = parseInt(us[1], 10) - 1;
        const d = parseInt(us[2], 10);
        let y = parseInt(us[3], 10);
        if (y < 100) y += 2000;
        return Date.UTC(y, mo, d);
      }

      const parsed = Date.parse(raw);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    // Ordered list of completed bowls (for streak logic)
    const completedOrdered = (() => {
      const rows = Array.isArray(bowlGames) && bowlGames.length ? bowlGames : (Array.isArray(schedule) ? schedule : []);
      const items = [];

      rows.forEach((g, idx) => {
        const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
        const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
        if (!bowlId || !winnerId) return;

        const day = parseDateToDay(g && (g["Date"] ?? g["Game Date"] ?? g["Day"]));
        const mins = parseTimeToMinutes(g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]));
        items.push({ bowlId, winnerId, day, mins, idx });
      });

      items.sort((a, b) => {
        const ad = Number.isFinite(a.day) ? a.day : Infinity;
        const bd = Number.isFinite(b.day) ? b.day : Infinity;
        if (ad !== bd) return ad - bd;

        const at = Number.isFinite(a.mins) ? a.mins : Infinity;
        const bt = Number.isFinite(b.mins) ? b.mins : Infinity;
        if (at !== bt) return at - bt;

        return a.idx - b.idx;
      });

      // De-dupe by bowlId
      const seen = new Set();
      return items.filter(it => {
        if (seen.has(it.bowlId)) return false;
        seen.add(it.bowlId);
        return true;
      });
    })();

    if (!completedOrdered.length) {
      return { winners: [], description: "No winners logged yet — nobody’s heating up until bowls start ending." };
    }

    const bestStreak = {};
    const current = {};

    players.forEach(p => {
      bestStreak[p.Name] = 0;
      current[p.Name] = 0;
    });

    completedOrdered.forEach(g => {
      const bid = g.bowlId;
      const wid = g.winnerId;

      players.forEach(p => {
        const pickId = normId(p[bid]);
        if (!pickId) {
          current[p.Name] = 0;
          return;
        }

        const isWin = (pickId === wid);
        if (isWin) {
          current[p.Name] += 1;
          if (current[p.Name] > bestStreak[p.Name]) bestStreak[p.Name] = current[p.Name];
        } else {
          current[p.Name] = 0;
        }
      });
    });

    const maxStreak = Math.max(...Object.values(bestStreak));
    const winners = Object.keys(bestStreak)
      .filter(n => bestStreak[n] === maxStreak)
      .sort((a, b) => a.localeCompare(b));

    const description = `Longest winning streak (${maxStreak}). They’ve been on fire — somebody check the thermostat.`;

    return { winners, description };
  }
}
    ,
// Badge #21: Short & Sweet (individual)
{
  id: "short-and-sweet",
  emoji: "🍬",
  title: "Short & Sweet",
  themeHint: "teal",
  compute: ({ bowlGames, teamById, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const getTeamName = (teamId) => {
      const t = teamById && teamById[String(teamId)];
      const name = t && (t["School Name"] ?? t["School"] ?? t["Name"] ?? t["Team"] ?? t["Team Name"]);
      return String(name ?? "").trim();
    };

    const completed = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      const homeId = normId(g && (g["Home ID"] ?? g["HomeID"]));
      const awayId = normId(g && (g["Away ID"] ?? g["AwayID"]));
      return Boolean(bowlId && winnerId && homeId && awayId);
    });

    if (!completed.length) {
      return { winners: [], description: "No completed games yet — nobody’s earned candy (yet)." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    completed.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);
      const homeId = normId(g["Home ID"] ?? g["HomeID"]);
      const awayId = normId(g["Away ID"] ?? g["AwayID"]);

      const homeName = getTeamName(homeId);
      const awayName = getTeamName(awayId);

      // If team names missing, skip this bowl for this badge.
      if (!homeName || !awayName) return;

      const homeLen = homeName.length;
      const awayLen = awayName.length;

      // Identify the shortest-name team in this matchup.
      // If tied, no one can "pick the shortest" definitively — skip the bowl.
      if (homeLen === awayLen) return;

      const shortestTeamId = homeLen < awayLen ? homeId : awayId;

      // Only count if the shortest-name team actually won.
      if (winnerId !== shortestTeamId) return;

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most wins backing the shortest-name team (${maxWins}). Less letters, more Ws — pure candy.`;

    return { winners, description };
  }
}
    ,
// Badge #22: B1G Winner (individual)
{
  id: "b1g-winner",
  emoji: "🌰",
  title: "B1G Winner",
  themeHint: "red",
  compute: ({ bowlGames, teamById, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const getConf = (teamId) => {
      const t = teamById && teamById[String(teamId)];
      const conf =
        (t && (t["Conference"] ?? t["Conf"] ?? t["Conference Name"] ?? t["League"] ?? t["Division"])) ?? "";
      return String(conf).trim();
    };

    const isBigTen = (confStr) => {
      const s = String(confStr ?? "").toUpperCase();
      if (!s) return false;
      return s.includes("BIG TEN") || s.includes("B1G");
    };

    const b1gCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      const homeId = normId(g && (g["Home ID"] ?? g["HomeID"]));
      const awayId = normId(g && (g["Away ID"] ?? g["AwayID"]));
      if (!bowlId || !winnerId || !homeId || !awayId) return false;

      const homeConf = getConf(homeId);
      const awayConf = getConf(awayId);
      return isBigTen(homeConf) || isBigTen(awayConf);
    });

    if (!b1gCompleted.length) {
      return { winners: [], description: "No Big Ten matchups have gone final yet — the nut hasn’t cracked." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    b1gCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks in Big Ten-involved bowls (${maxWins}). When the B1G shows up, they show out.`;

    return { winners, description };
  }
}
    ,
// Badge #23: It Just Means More (individual)
{
  id: "it-just-means-more",
  emoji: "🐶",
  title: "It Just Means More",
  themeHint: "blue",
  compute: ({ bowlGames, teamById, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const getConf = (teamId) => {
      const t = teamById && teamById[String(teamId)];
      const conf =
        (t && (t["Conference"] ?? t["Conf"] ?? t["Conference Name"] ?? t["League"] ?? t["Division"])) ?? "";
      return String(conf).trim();
    };

    const isSEC = (confStr) => {
      const s = String(confStr ?? "").toUpperCase();
      if (!s) return false;
      // Most sheets will have "SEC"; allow "SOUTHEASTERN" as a backup.
      return s.includes("SEC") || s.includes("SOUTHEASTERN");
    };

    const secCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      const homeId = normId(g && (g["Home ID"] ?? g["HomeID"]));
      const awayId = normId(g && (g["Away ID"] ?? g["AwayID"]));
      if (!bowlId || !winnerId || !homeId || !awayId) return false;

      const homeConf = getConf(homeId);
      const awayConf = getConf(awayId);
      return isSEC(homeConf) || isSEC(awayConf);
    });

    if (!secCompleted.length) {
      return { winners: [], description: "No SEC matchups have gone final yet — it *doesn’t* mean more (yet)." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    secCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks in SEC-involved bowls (${maxWins}). If it’s an SEC game, they somehow *knew*.`;

    return { winners, description };
  }
}
    ,
// Badge #24: Playoff Payoff (individual)
{
  id: "playoff-payoff",
  emoji: "🏅",
  title: "Playoff Payoff",
  themeHint: "yellow",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const truthy = (v) => {
      const s = String(v ?? "").trim().toUpperCase();
      if (!s) return false;
      return s === "TRUE" || s === "YES" || s === "Y" || s === "1";
    };

    const cfpCompleted = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const cfpVal = g && (g["CFP?"] ?? g["CFP"] ?? g["Playoff"] ?? g["Playoff?"]);
      return truthy(cfpVal);
    });

    if (!cfpCompleted.length) {
      return { winners: [], description: "No CFP games have gone final yet — the payoff’s still pending." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    cfpCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks on CFP games (${maxWins}). When the lights get brighter, they get sharper.`;

    return { winners, description };
  }
}
    ,
// Badge #25: Saturday Night Fever (individual)
{
  id: "saturday-night-fever",
  emoji: "🕺",
  title: "Saturday Night Fever",
  themeHint: "purple",
  compute: ({ bowlGames, schedule, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const parseTimeToMinutes = (timeStr) => {
      const raw = String(timeStr ?? "").trim();
      if (!raw) return NaN;
      const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
      if (!m) return NaN;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh += 12;
      }
      return hh * 60 + mm;
    };

    const parseDateToUTCNoon = (dateStr) => {
      const raw = String(dateStr ?? "").trim();
      if (!raw) return null;

      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10) - 1;
        const d = parseInt(iso[3], 10);
        return new Date(Date.UTC(y, mo, d, 12, 0, 0));
      }

      const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (us) {
        const mo = parseInt(us[1], 10) - 1;
        const d = parseInt(us[2], 10);
        let y = parseInt(us[3], 10);
        if (y < 100) y += 2000;
        return new Date(Date.UTC(y, mo, d, 12, 0, 0));
      }

      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return null;
      const dt = new Date(parsed);
      // Normalize to UTC noon of that calendar day if possible
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0));
    };

    const isSaturdayNight = (g) => {
      const dt = parseDateToUTCNoon(g && (g["Date"] ?? g["Game Date"] ?? g["Day"]));
      if (!dt) return false;
      const dow = dt.getUTCDay(); // 0 Sun ... 6 Sat
      if (dow !== 6) return false;

      const mins = parseTimeToMinutes(g && (g["Time"] ?? g["Start Time"] ?? g["Kickoff"] ?? g["Kickoff Time"]));
      return Number.isFinite(mins) && mins >= 19 * 60;
    };

    const rows = Array.isArray(bowlGames) && bowlGames.length ? bowlGames : (Array.isArray(schedule) ? schedule : []);
    const satNightCompleted = (rows || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;
      return isSaturdayNight(g);
    });

    if (!satNightCompleted.length) {
      return { winners: [], description: "No Saturday night finals yet — the dance floor’s still empty." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    satNightCompleted.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most wins on Saturday-night bowls (${maxWins}). Glitter, lights, and straight-up good reads.`;

    return { winners, description };
  }
}
    ,
// Badge #26: Cover Artist (individual)
{
  id: "cover-artist",
  emoji: "🎸",
  title: "Cover Artist",
  themeHint: "red",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const toNum = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return NaN;
      const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };

    const completedCoverGames = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      const favId = normId(g && (g["Favorite ID"] ?? g["FavoriteID"] ?? g["Fav ID"] ?? g["FavID"]));
      const spreadRaw = g && (g["Spread"] ?? g["Line"] ?? g["Vegas Spread"]);
      const spread = toNum(spreadRaw);

      const homeId = normId(g && (g["Home ID"] ?? g["HomeID"]));
      const awayId = normId(g && (g["Away ID"] ?? g["AwayID"]));
      const homePts = toNum(g && (g["Home Pts"] ?? g["HomePts"] ?? g["Home Points"]));
      const awayPts = toNum(g && (g["Away Pts"] ?? g["AwayPts"] ?? g["Away Points"]));

      if (!bowlId || !winnerId || !favId) return false;
      if (!Number.isFinite(spread)) return false;
      if (!homeId || !awayId) return false;
      if (!Number.isFinite(homePts) || !Number.isFinite(awayPts)) return false;

      // Favorite must actually win
      if (winnerId !== favId) return false;

      // Determine favorite margin
      const favIsHome = favId === homeId;
      const favPts = favIsHome ? homePts : awayPts;
      const dogPts = favIsHome ? awayPts : homePts;
      const margin = favPts - dogPts;

      // Spread might be stored as -3.5 or 3.5 — we care about magnitude.
      const spreadAbs = Math.abs(spread);

      // "Covered" = win by MORE than the spread (strictly greater).
      return margin > spreadAbs;
    });

    if (!completedCoverGames.length) {
      return { winners: [], description: "No covers logged yet — the band’s still tuning up." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    completedCoverGames.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);
      const favId = normId(g["Favorite ID"] ?? g["FavoriteID"] ?? g["Fav ID"] ?? g["FavID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        // Count only if they picked the favorite AND the favorite covered (and won).
        if (pickId && pickId === winnerId && pickId === favId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks where the favorite covered (${maxWins}). Vegas called it — they played it loud.`;

    return { winners, description };
  }
}
    ,
// Badge #27: Under Taker (individual)
{
  id: "under-taker",
  emoji: "🪦",
  title: "Under Taker",
  themeHint: "light gray",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const toNum = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return NaN;
      const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };

    const underGames = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const homePts = toNum(g && (g["Home Pts"] ?? g["HomePts"] ?? g["Home Points"]));
      const awayPts = toNum(g && (g["Away Pts"] ?? g["AwayPts"] ?? g["Away Points"]));
      const ou = toNum(g && (g["O/U"] ?? g["OU"] ?? g["Over/Under"] ?? g["Total"]));

      if (!Number.isFinite(homePts) || !Number.isFinite(awayPts) || !Number.isFinite(ou)) return false;

      const total = homePts + awayPts;
      return total < ou;
    });

    if (!underGames.length) {
      return { winners: [], description: "No unders have hit yet — the defenses haven’t clocked in." };
    }

    const wins = {};
    players.forEach(p => { wins[p.Name] = 0; });

    underGames.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId === winnerId) wins[p.Name] += 1;
      });
    });

    const maxWins = Math.max(...Object.values(wins));
    const winners = Object.keys(wins)
      .filter(n => wins[n] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most correct picks on UNDER games (${maxWins}). Low scores, cold hearts, and clean reads.`;

    return { winners, description };
  }
}
    ,
// Badge #28: Weatherproof Duo (affinity)
{
  id: "weatherproof-duo",
  emoji: "🌧️",
  title: "Weatherproof Duo",
  themeHint: "blue",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (players.length < 2) return { winners: [], description: "Need at least two players to pair up." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const normWeather = (v) => String(v ?? "").trim().toUpperCase();

    const isNotClearWeather = (w) => {
              const s = normWeather(w);
              if (!s) return false;
              // Exclude "clear" (including variants like "Clear Skies")…
              if (s.includes("CLEAR")) return false;
              // …and exclude indoor/dome-type labels where weather doesn't matter.
              if (s.includes("INDOOR") || s.includes("DOME")) return false;
              return true;
            };

    const messyGames = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const weatherVal = g && (g["Weather"] ?? g["Conditions"] ?? g["Wx"]);
      return isNotClearWeather(weatherVal);
    });

    if (!messyGames.length) {
      return { winners: [], description: "No messy-weather finals yet — bring on the chaos." };
    }

    const labelPair = (a, b) => {
      const left = String(a).trim();
      const right = String(b).trim();
      return left.localeCompare(right) <= 0 ? `${left} & ${right}` : `${right} & ${left}`;
    };

    const pairWins = {};

    // Pre-init all pairs to 0 so ties behave predictably.
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        pairWins[labelPair(players[i].Name, players[j].Name)] = 0;
      }
    }

    messyGames.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      for (let i = 0; i < players.length; i++) {
        const A = players[i];
        const pickA = normId(A[bowlId]);
        if (!pickA || pickA !== winnerId) continue;

        for (let j = i + 1; j < players.length; j++) {
          const B = players[j];
          const pickB = normId(B[bowlId]);
          if (!pickB || pickB !== winnerId) continue;

          const key = labelPair(A.Name, B.Name);
          pairWins[key] = (pairWins[key] || 0) + 1;
        }
      }
    });

    const maxWins = Math.max(...Object.values(pairWins));
    const winners = Object.keys(pairWins)
      .filter(k => pairWins[k] === maxWins)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most shared wins when the weather isn’t clear (${maxWins}). Two umbrellas, one brain.`;

    return { winners, description };
  }
}
    ,
// Badge #29: Heartbreaker (individual)
{
  id: "heartbreaker",
  emoji: "💔",
  title: "Heartbreaker",
  themeHint: "red",
  compute: ({ bowlGames, picksIds }) => {
    const players = (picksIds || []).filter(p => p && p.Name);
    if (!players.length) return { winners: [], description: "Waiting on picks." };

    const normId = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? String(n) : s;
    };

    const toNum = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return NaN;
      const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };

    const closeGames = (bowlGames || []).filter(g => {
      const bowlId = normId(g && (g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]));
      const winnerId = normId(g && (g["Winner ID"] ?? g["WinnerID"]));
      if (!bowlId || !winnerId) return false;

      const homePts = toNum(g && (g["Home Pts"] ?? g["HomePts"] ?? g["Home Points"]));
      const awayPts = toNum(g && (g["Away Pts"] ?? g["AwayPts"] ?? g["Away Points"]));
      if (!Number.isFinite(homePts) || !Number.isFinite(awayPts)) return false;

      const diff = Math.abs(homePts - awayPts);
      return diff <= 3;
    });

    if (!closeGames.length) {
      return { winners: [], description: "No nail-biters have finished yet — nobody’s had their heart broken (yet)." };
    }

    const losses = {};
    players.forEach(p => { losses[p.Name] = 0; });

    closeGames.forEach(g => {
      const bowlId = normId(g["Bowl ID"] ?? g["BowlID"] ?? g["Game ID"] ?? g["GameID"] ?? g["ID"]);
      const winnerId = normId(g["Winner ID"] ?? g["WinnerID"]);

      players.forEach(p => {
        const pickId = normId(p[bowlId]);
        if (pickId && pickId !== winnerId) losses[p.Name] += 1;
      });
    });

    const maxLosses = Math.max(...Object.values(losses));
    const winners = Object.keys(losses)
      .filter(n => losses[n] === maxLosses)
      .sort((a, b) => a.localeCompare(b));

    const description = `Most losses in one-score games (${maxLosses}). Always so close… and somehow always the one left staring at the final score.`;

    return { winners, description };
  }
}
    ];

      const themeFromHint = (hint) => {
        if (!hint) return THEMES[Math.floor(Math.random() * THEMES.length)];
        const key = String(hint).toLowerCase();
        if (key.includes("orange")) return { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-400" };
        if (key.includes("light blue") || key.includes("lightblue") || key.includes("sky")) return { bg: "bg-sky-200", text: "text-sky-900", border: "border-sky-400" };
        if (key.includes("dark") || key.includes("charcoal")) return { bg: "bg-slate-300", text: "text-slate-900", border: "border-slate-500" };
        if (key.includes("brown") || key.includes("tan")) return { bg: "bg-amber-200", text: "text-amber-900", border: "border-amber-400" };
        if (key.includes("yellow") || key.includes("amber") || key.includes("gold")) return THEMES[2];
        if (key.includes("indigo")) return THEMES[0];
        if (key.includes("emerald") || key.includes("green")) return THEMES[1];
        if (key.includes("rose") || key.includes("red") || key.includes("pink")) return THEMES[3];
        if (key.includes("cyan") || key.includes("teal") || key.includes("blue")) return THEMES[4];
        if (key.includes("violet") || key.includes("purple")) return THEMES[5];
        if (key.includes("dark-slate") || key.includes("dark gray") || key.includes("dark-gray") || key.includes("darker")) {
          return { bg: "bg-slate-200", text: "text-slate-900", border: "border-slate-400" };
        }
        if (key.includes("gray") || key.includes("grey") || key.includes("slate")) return THEMES[6] || THEMES[0];
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