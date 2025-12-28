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
  themeHint: "slate",
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
    ];

      const themeFromHint = (hint) => {
        if (!hint) return THEMES[Math.floor(Math.random() * THEMES.length)];
        const key = String(hint).toLowerCase();
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