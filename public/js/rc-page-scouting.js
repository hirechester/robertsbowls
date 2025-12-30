/* Roberts Cup - Scouting Report Page (extracted from index.html)
   Loaded as: <script type="text/babel" src="js/rc-page-scouting.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo, useRef } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases (so the moved code stays unchanged)

  // --- SCOUTING REPORT PAGE ---
  const ScoutingReportPage = () => {
                      const [selectedPlayer, setSelectedPlayer] = useState("");
    const initialPlayerRef = useRef(null);
const [players, setPlayers] = useState([]);
    const { schedule, picksIds, history, teams, teamById, loading, error, refresh, lastUpdated } = RC.data.useLeagueData();
// TEAM DATA (from Teams tab in the main Google Sheet)
    // Expected columns: "School Name", "Team Nickname", "Primary Hex", "Logo"
    const normalizeTeamKey = (name) => {
      return (name || "")
        .replace(/#\d+\s*/g, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    };

    const TEAM_INDEX = useMemo(() => {
      const idx = {};
      if (!Array.isArray(teams)) return idx;
      teams.forEach((row) => {
        const school = String(row["School Name"] || row.School || row.Team || row.Name || "").trim();
        if (!school) return;
        const nickname = String(row["Team Nickname"] || row.Nickname || "").trim();
        const hex = String(row["Primary Hex"] || row.Hex || row.Color || "").trim();
        const logo = String(row.Logo || row["Logo URL"] || row["Logo Url"] || row.LogoUrl || "").trim();
        const entry = { school, nickname, hex, logo };
        idx[normalizeTeamKey(school)] = entry;
        if (nickname) idx[normalizeTeamKey(nickname)] = entry;
      });
      return idx;
    }, [teams]);

useEffect(() => {
        // Initialize player list from shared picks data
        if (!Array.isArray(picksIds)) return;
        const names = picksIds.map(p => p.Name).filter(Boolean).sort();
        setPlayers(names);
        if (!selectedPlayer && names.length > 0) {
          // Pick a random player on first load (stable for the session)
          if (!initialPlayerRef.current || !names.includes(initialPlayerRef.current)) {
            initialPlayerRef.current = names[Math.floor(Math.random() * names.length)];
          }
          setSelectedPlayer(initialPlayerRef.current);
        }
        if (selectedPlayer && names.length > 0 && !names.includes(selectedPlayer)) {
          // If a previously-selected name disappears, fall back to the initial random pick (or first)
          const fallback = (initialPlayerRef.current && names.includes(initialPlayerRef.current))
            ? initialPlayerRef.current
            : names[0];
          setSelectedPlayer(fallback);
        }
    }, [picksIds]);
  
                      if (loading) return <LoadingSpinner text="Scouting players..." />;
    if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load data"} />;
  
                      // --- CALCULATIONS ---
                      const normalizeHex = (v, fallback = "#4F46E5") => {
      const raw = String(v || "").trim();
      const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
      return m ? ("#" + m[1].toUpperCase()) : fallback;
    };

    const calculateStats = (player) => {
      if (!player) return null;
      const pData = Array.isArray(picksIds) ? picksIds.find(p => p.Name === player) : null;
    const nattyGame = Array.isArray(schedule)
      ? schedule.find(g => /national championship/i.test(String(g && g.Bowl ? g.Bowl : "")))
      : null;
    const nattyBowlId = nattyGame ? String(nattyGame["Bowl ID"] || "").trim() : "";

      if (!pData) return null;

      const gameKey = (g) => String((g && (g["Bowl ID"] !== undefined ? g["Bowl ID"] : g.Bowl)) || "").trim();
      const winnerIdFor = (g) => String((g && g["Winner ID"]) || "").trim();
      const pickIdFor = (row, g) => {
        const k = gameKey(g);
        if (!k) return "";
        const v = row && row[k];
        return v === undefined || v === null ? "" : String(v).trim();
      };
      const isCorrect = (row, g) => {
        const w = winnerIdFor(g);
        const p = pickIdFor(row, g);
        return !!(w && p && p === w);
      };
      const truthy01 = (v) => {
        const s = String(v || "").trim();
        if (!s) return false;
        return s === "1" || /^true$/i.test(s) || /^yes$/i.test(s);
      };
      const teamNameById = (id) => {
        const key = String(id || "").trim();
        if (!key) return "";
        const t = teamById && teamById[key];
        if (!t) return "";
        return String(t["School Name"] || t.School || t.Team || t.Name || "").trim();
      };

      // 1) Current Rank & Wins (ID-based)
      const leaderboard = (Array.isArray(picksIds) ? picksIds : [])
        .map(p => {
          let w = 0;
          (Array.isArray(schedule) ? schedule : []).forEach(g => {
            if (isCorrect(p, g)) w++;
          });
          return { name: p.Name, wins: w };
        })
        .sort((a, b) => b.wins - a.wins);

      // Calculate Rank with Ties logic
      let currentRank = 1;
      for (let i = 0; i < leaderboard.length; i++) {
        if (i > 0 && leaderboard[i].wins < leaderboard[i - 1].wins) {
          currentRank = i + 1;
        }
        leaderboard[i].rank = currentRank;
        const prev = leaderboard[i - 1];
        const next = leaderboard[i + 1];
        leaderboard[i].isTied =
          (prev && prev.wins === leaderboard[i].wins) ||
          (next && next.wins === leaderboard[i].wins);
      }

      const playerEntry = leaderboard.find(p => p.name === player) || { rank: leaderboard.length, wins: 0, isTied: false };
      const rank = playerEntry.rank;
      const wins = playerEntry.wins;
      const isTied = playerEntry.isTied;

      // 2) Past Greatness (History)
      const pastWinsData = (Array.isArray(history) ? history : []).filter(h => h.Winner && h.Winner.trim().toLowerCase() === player.toLowerCase());
      const titles = pastWinsData.length;
      const titleYears = pastWinsData.map(h => h.Year).sort().join(', ');

      // 3) Situationals (ID-based)
      const getWinStats = (filterFn) => {
        const games = (Array.isArray(schedule) ? schedule : []).filter(g => winnerIdFor(g) && filterFn(g));
        if (games.length === 0) return { pct: 0, wins: 0, total: 0 };
        let w = 0;
        games.forEach(g => { if (isCorrect(pData, g)) w++; });
        return { pct: Math.round((w / games.length) * 100), wins: w, total: games.length };
      };

      const getTimeHour = (g) => {
        if (!g.Time) return null;
        const timeStr = g.Time.trim().toUpperCase();
        let [timePart, modifier] = timeStr.split(' ');
        if (!modifier) {
          if (timeStr.includes('PM')) { modifier = 'PM'; timePart = timeStr.replace('PM', ''); }
          else if (timeStr.includes('AM')) { modifier = 'AM'; timePart = timeStr.replace('AM', ''); }
        }
        let [hours, minutes] = timePart.split(':').map(Number);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours;
      };

      const cfp = getWinStats(g => truthy01(g.CFP));
      const b1g = getWinStats(g => truthy01(g.B1G));
      const sec = getWinStats(g => truthy01(g.SEC));

      // Conference grades (derived from Teams tab via Home ID / Away ID)
      const teamConfById = (id) => {
        const key = String(id || "").trim();
        if (!key) return "";
        const row = teamById && teamById[key];
        const raw = row ? (row["Conference"] || row.Conference || row["Conf"] || row.Conf || row["League"] || row.League || "") : "";
        return String(raw || "").trim().toLowerCase();
      };
      const gameTeamIds = (g) => {
        const home = String((g && (g["Home ID"] || g.HomeId || g.HomeID || "")) || "").trim();
        const away = String((g && (g["Away ID"] || g.AwayId || g.AwayID || "")) || "").trim();
        return [home, away].filter(Boolean);
      };
      const gameHasConference = (g, matchFn) => {
        return gameTeamIds(g).some(tid => matchFn(teamConfById(tid)));
      };

      const b12 = getWinStats(g => gameHasConference(g, c => {
        const compact = c.replace(/\s+/g, "");
        return c.includes("big 12") || compact.includes("big12");
      }));
      const acc = getWinStats(g => gameHasConference(g, c => {
        return c.includes("acc") || c.includes("atlantic coast");
      }));
      const g6 = getWinStats(g => gameHasConference(g, c => {
        // "Group of 6" per your list: AAC, C-USA, MAC, MWC, Pac-12, Sun Belt
        const needles = [
          "american athletic", "aac",
          "conference usa", "c-usa", "cusa",
          "mid-american", "mac",
          "mountain west", "mwc",
          "pac-12", "pac 12",
          "sun belt"
        ];
        return needles.some(n => c.includes(n));
      }));
      const morning = getWinStats(g => { const h = getTimeHour(g); return h !== null && h < 12; });
      const afternoon = getWinStats(g => { const h = getTimeHour(g); return h !== null && h >= 12 && h < 19; });
      const night = getWinStats(g => { const h = getTimeHour(g); return h !== null && h >= 19; });

      const tvNorm = (g) => String((g && (g.Network || g.TV || "")) || "").trim().toUpperCase().replace(/\s+/g, " ");

      const espn = getWinStats(g => {
        const tv = tvNorm(g);
        return tv === "ESPN" || tv === "ESPN2";
      });
      const abc = getWinStats(g => tvNorm(g) === "ABC");
      const fox = getWinStats(g => tvNorm(g) === "FOX");
      const cbs = getWinStats(g => tvNorm(g) === "CBS");
      const hbomax = getWinStats(g => tvNorm(g) === "HBO MAX");
      const cw = getWinStats(g => tvNorm(g) === "THE CW NETWORK");

      // 4) Maverick Rating (ID-based)
      let maverickScore = 0;
      let totalGames = 0;
      (Array.isArray(schedule) ? schedule : []).forEach(g => {
        const k = gameKey(g);
        if (!k) return;
        const myPick = pickIdFor(pData, g);
        if (!myPick) return;

        const counts = {};
        (Array.isArray(picksIds) ? picksIds : []).forEach(p => {
          const pp = pickIdFor(p, g);
          if (pp) counts[pp] = (counts[pp] || 0) + 1;
        });

        let maxC = 0;
        let majority = null;
        Object.entries(counts).forEach(([pick, count]) => {
          if (count > maxC) { maxC = count; majority = pick; }
        });

        totalGames++;
        if (majority && myPick !== majority) maverickScore++;
      });
      const maverickPct = totalGames > 0 ? Math.round((maverickScore / totalGames) * 100) : 0;

      // 5) Nemesis & BFF (ID-based)
      let maxDiff = -1;
      let nemesis = "-";
      let maxSame = -1;
      let bff = "-";
      (Array.isArray(picksIds) ? picksIds : []).forEach(p => {
        if (p.Name === player) return;
        let diff = 0;
        let same = 0;
        (Array.isArray(schedule) ? schedule : []).forEach(g => {
          const myP = pickIdFor(pData, g);
          const theirP = pickIdFor(p, g);
          if (myP && theirP) {
            if (myP !== theirP) diff++;
            else same++;
          }
        });
        if (diff > maxDiff) { maxDiff = diff; nemesis = p.Name; }
        if (same > maxSame) { maxSame = same; bff = p.Name; }
      });

      // 6) Streaks (ID-based)
      const completedGames = (Array.isArray(schedule) ? schedule : [])
        .filter(g => winnerIdFor(g) && g.Date && g.Time)
        .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));

      let currentStreak = 0;
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let tempWin = 0;
      let tempLoss = 0;

      completedGames.forEach(g => {
        const pick = pickIdFor(pData, g);
        const winner = winnerIdFor(g);
        if (pick && winner && pick === winner) {
          tempWin++;
          if (tempWin > maxWinStreak) maxWinStreak = tempWin;
          tempLoss = 0;
          currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        } else {
          tempLoss++;
          if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
          tempWin = 0;
          currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        }
      });

      // 7) Ceiling Tracker
      const totalGameCount = (Array.isArray(schedule) ? schedule : []).filter(g => g.Bowl && (g["Away ID"] || g["Home ID"] || g["Team 1"])).length;
      const unplayedCount = (Array.isArray(schedule) ? schedule : []).filter(g => g.Bowl && (g["Away ID"] || g["Home ID"] || g["Team 1"]) && !winnerIdFor(g)).length;
      const maxPotential = wins + unplayedCount;
      const leaderWins = leaderboard.length ? Math.max(...leaderboard.map(p => p.wins)) : 0;

      // 8) Signature Win (ID-based)
      let bestWin = null;
      let minWinners = Infinity;
      (Array.isArray(schedule) ? schedule : []).forEach(g => {
        const wId = winnerIdFor(g);
        if (!wId) return;
        if (!isCorrect(pData, g)) return;

        let gameWinnerCount = 0;
        (Array.isArray(picksIds) ? picksIds : []).forEach(p => {
          const theirPick = pickIdFor(p, g);
          if (theirPick && theirPick === wId) gameWinnerCount++;
        });

        if (gameWinnerCount < minWinners) {
          minWinners = gameWinnerCount;
          bestWin = { bowl: g.Bowl, teamId: wId, team: teamNameById(wId) || (g.Winner || wId), count: gameWinnerCount };
        }
      });

      return {
        rank, isTied, wins,
        titles, titleYears,
        cfp, b1g, sec, b12, acc, g6, morning, afternoon, night,
        espn, abc, fox, cbs, hbomax, cw,
        maverickPct, nemesis, bff,
        champ: (nattyBowlId && pData && pData[nattyBowlId]) ? String(pData[nattyBowlId]).trim() : (pData && (pData["National Championship"] || pData["National Championship Pick"] || pData["Championship"] || "")),
        tiebreaker: pData["Tiebreaker Score"],
        currentStreak, maxWinStreak, maxLossStreak,
        maxPotential, totalGameCount, leaderWins,
        bestWin
      };
    };

    const stats = calculateStats(selectedPlayer);
  
                      // Helper component for Team Card
                      const ChampCard = ({ teamName }) => {
      const rawStr = String(teamName || "").trim();

      // Prefer Team ID lookup (new ID-native flow)
      let data = null;
      if (rawStr && teamById && teamById[rawStr]) {
        const row = teamById[rawStr];
        data = {
          school: String(row["School Name"] || row.School || row.Team || row.Name || "").trim(),
          nickname: String(row["Team Nickname"] || row.Nickname || "").trim(),
          hex: String(row["Primary Hex"] || row.Hex || row.Color || "").trim(),
          logo: String(row.Logo || row["Logo URL"] || row["Logo Url"] || row.LogoUrl || "").trim(),
        };
      } else {
        // Backward-compatible: allow passing a team name string
        const cleanName = rawStr ? rawStr.replace(/#\d+\s*/g, "").trim() : "";
        const key = normalizeTeamKey(cleanName);
        const legacy = TEAM_INDEX[key];
        data = legacy || { school: cleanName || "-" };
      }

      const hexRaw = data && data.hex ? String(data.hex).trim() : "";
      const hex = hexRaw ? (hexRaw.startsWith("#") ? hexRaw : "#" + hexRaw.replace(/^#/, "")) : "#1D4ED8";
      const nickname = data && data.nickname ? data.nickname : "";
      const logo = data && data.logo ? data.logo : "";
      const school = data && data.school ? data.school : (rawStr || "-");

      return (
        <div className="rounded-2xl border shadow-sm overflow-hidden relative" style={{ borderColor: hex }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: hex }} />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/80 ring-1 ring-black/5 flex items-center justify-center overflow-hidden">
              {logo ? (
                <img src={logo} alt={school} className="w-14 h-14 object-contain drop-shadow" loading="lazy" />
              ) : (
                <div className="text-2xl">🏆</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider" style={hex ? { color: hex } : undefined}>National Championship Pick</div>
              <div className="text-2xl font-black text-gray-900 truncate">{school}</div>
              {nickname ? <div className="text-sm text-gray-700 font-semibold truncate">{nickname}</div> : null}
            </div>
          </div>
        </div>
      );
    };
  
                      return (
                          <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                               <div className="bg-white pt-8 pb-4 px-4">
                                  <div className="max-w-4xl mx-auto text-center">
                                      <h2 className="text-3xl text-blue-900 font-bold mb-1">Scouting Report</h2>
                                      <p className="text-gray-600 text-sm">Deep dive analytics into your favorite people.</p>
                                  </div>
                              </div>
  
                              <div className="px-4 max-w-xl mx-auto w-full flex flex-col gap-6">
                                  {/* Selector */}
                                  <div className="relative">
                                      <select
                                          value={selectedPlayer}
                                          onChange={(e) => setSelectedPlayer(e.target.value)}
                                          className="appearance-none bg-white border border-gray-300 text-gray-900 text-lg rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-4 font-bold shadow-sm text-center"
                                      >
                                          {players.map(p => <option key={p} value={p}>{p}</option>)}
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                      </div>
                                  </div>
  
                                  {stats && (
                                                              <>
                                                                  {/* Top Card */}
                                                                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                                                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                                                      <div className="flex justify-between items-center mb-6 relative z-10">
                                                                          <div className="text-left">
                                                                              <div className="text-sm text-slate-400 font-bold uppercase tracking-widest">Current Rank</div>
                                                                              <div className="text-5xl font-black text-white">
                                                                                  {stats.isTied ? "T-" : ""}{stats.rank}
                                                                              </div>
                                                                          </div>
                                                                          <div className="text-right">
                                                                              <div className="text-sm text-slate-400 font-bold uppercase tracking-widest">Wins</div>
                                                                              <div className="text-5xl font-black text-yellow-400">{stats.wins}</div>
                                                                          </div>
                                                                      </div>
  
                                                                      {/* PAST GREATNESS BADGE - Fixed Height Container */}
                                                                      <div className="min-h-[80px] flex items-center">
                                                                          {stats.titles > 0 ? (
                                                                              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3 relative z-10 w-full">
                                                                                  <div className="text-2xl flex-shrink-0">🏆</div>
                                                                                  <div>
                                                                                      <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Past Greatness</div>
                                                                                      <div className="text-white font-bold">
                                                                                          {stats.titles}-Time Champion <span className="text-yellow-200/70 text-xs font-normal ml-1">({stats.titleYears})</span>
                                                                                      </div>
                                                                                  </div>
                                                                              </div>
                                                                          ) : (
                                                                              <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3 relative z-10 opacity-50 w-full">
                                                                                  <div className="text-2xl grayscale flex-shrink-0">🏆</div>
                                                                                  <div>
                                                                                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Past Greatness</div>
                                                                                      <div className="text-slate-300 font-bold text-sm">Chasing first title</div>
                                                                                  </div>
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                  </div>
  
                                                                  {/* Ceiling Tracker */}
                                                                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                                                                          <h3 className="text-lg font-bold text-gray-900 font-serif">Ceiling Tracker</h3>
                                                                          <span className="text-sm font-bold text-blue-600">{stats.maxPotential} Max Wins</span>
                                                                      </div>
                                                                      <div className="p-5">
                                                                          <div className="relative h-6 bg-gray-100 rounded-full w-full overflow-hidden mb-2">
                                                                              {/* Current Wins */}
                                                                              <div
                                                                                  className="absolute top-0 bottom-0 left-0 bg-blue-600 transition-all duration-1000 z-10"
                                                                                  style={{ width: `${(stats.wins / stats.totalGameCount) * 100}%` }}
                                                                              ></div>
                                                                              {/* Potential Wins */}
                                                                              <div
                                                                                  className="absolute top-0 bottom-0 left-0 bg-blue-200 transition-all duration-1000"
                                                                                  style={{ width: `${(stats.maxPotential / stats.totalGameCount) * 100}%` }}
                                                                              ></div>
                                                                              {/* Leader Line */}
                                                                              <div
                                                                                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                                                                  style={{ left: `${(stats.leaderWins / stats.totalGameCount) * 100}%` }}
                                                                              ></div>
                                                                          </div>
                                                                          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                                              <span>Current: {stats.wins}</span>
                                                                              <span className="text-red-500">Leader: {stats.leaderWins}</span>
                                                                          </div>
                                                                      </div>
                                                                  </div>
  
                                                                  {/* NEW: Extravagant Vitals (Champ ONLY) */}
                                                                  <div className="space-y-4">
                                                                      <ChampCard teamName={stats.champ} />
                                                                  </div>
  
                                                                  {/* Relationships (Small Cards) */}
                                                                  <div className="grid grid-cols-2 gap-3">
                                                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                                                          <div className="flex justify-between items-center mb-1">
                                                                              <div className="text-xs font-bold text-gray-400 uppercase">Nemesis</div>
                                                                          </div>
                                                                          <div className="text-lg font-black text-red-600 truncate">{stats.nemesis}</div>
                                                                          <div className="text-[10px] text-gray-500 mt-0.5">Most differing picks</div>
                                                                      </div>
                                                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                                                          <div className="flex justify-between items-center mb-1">
                                                                              <div className="text-xs font-bold text-gray-400 uppercase">Best Friend</div>
                                                                          </div>
                                                                          <div className="text-lg font-black text-green-600 truncate">{stats.bff}</div>
                                                                          <div className="text-[10px] text-gray-500 mt-0.5">Most shared picks</div>
                                                                      </div>
                                                                  </div>
  
                                                                  {/* Streaks Card */}
                                                                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                                                                          <h3 className="text-lg font-bold text-gray-900 font-serif">Season Streaks</h3>
                                                                      </div>
                                                                      <div className="p-4 grid grid-cols-3 gap-2 text-center divide-x divide-gray-100">
                                                                          <div>
                                                                              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Current</div>
                                                                              <div className={`text-xl font-black ${stats.currentStreak > 0 ? 'text-green-600' : stats.currentStreak < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                                                  {stats.currentStreak > 0 ? `W${stats.currentStreak}` : stats.currentStreak < 0 ? `L${Math.abs(stats.currentStreak)}` : '-'}
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Longest Win</div>
                                                                              <div className="text-xl font-black text-green-600">
                                                                                  W{stats.maxWinStreak}
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Longest Loss</div>
                                                                              <div className="text-xl font-black text-red-600">
                                                                                  L{stats.maxLossStreak}
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                  </div>
  
                                                                  {/* Signature Win Card */}
                                                                  {stats.bestWin && (() => {
                                                                      const row = (teamById && stats.bestWin.teamId != null) ? teamById[String(stats.bestWin.teamId)] : null;
                                                                      const sigHex = normalizeHex(row && (row["Primary Hex"] || row.Hex || row.Color));
                                                                      const sigBorder = sigHex + "55";
      const sigBg = sigHex + "18";
      const sigNickname = String(row && (row["Team Nickname"] || row["Nickname"] || row.Nickname || "") || "").trim();
                                                                      return (
                                                                          <div className="bg-gray-50 rounded-2xl border shadow-sm p-5 relative overflow-hidden" style={{ borderColor: sigBorder }}>
                                                                              <div className="absolute top-0 right-0 text-6xl opacity-10 pointer-events-none">🌟</div>
                                                                              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: sigHex }}>Signature Win</div>
                                                                              <div className="text-xl font-black leading-tight mb-2 text-gray-900">
                                                                                  Picked <span style={{ color: sigHex }}>{stats.bestWin.team}</span> in the {stats.bestWin.bowl}
                                                                              </div>
                                                                              <div className="inline-block text-xs font-bold px-2 py-1 rounded shadow-sm border" style={{ borderColor: sigBorder, color: sigHex, backgroundColor: sigBg }}>
                                                                                  {stats.bestWin.count === 1
                    ? `Only player to pick the ${sigNickname || stats.bestWin.team}!`
                    : `Only ${stats.bestWin.count} players got the ${(sigNickname || stats.bestWin.team)} right`}
                                                                              </div>
                                                                          </div>
                                                                      );
                                                                  })()}

  
                                                                  {/* Skills Breakdown */}
                                                                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                                                                          <h3 className="text-lg font-bold text-gray-900 font-serif">Performance Grades</h3>
                                                                      </div>
                                                                      <div className="p-5 space-y-4">
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span className="text-yellow-700">College Football Playoff Games <span className="text-gray-400 font-normal ml-1">({stats.cfp.wins} of {stats.cfp.total})</span></span>
                                                                                  <span className="text-yellow-900">{stats.cfp.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${stats.cfp.pct}%` }}></div>
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span style={{ color: "#0088CE" }}>Big Ten Conference Games <span className="text-gray-400 font-normal ml-1">({stats.b1g.wins} of {stats.b1g.total})</span></span>
                                                                                  <span style={{ color: "#0088CE" }}>{stats.b1g.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="h-2 rounded-full" style={{ width: `${stats.b1g.pct}%`, backgroundColor: "#0088CE" }}></div>
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span style={{ color: "#22356B" }}>SEC Conference Games <span className="text-gray-400 font-normal ml-1">({stats.sec.wins} of {stats.sec.total})</span></span>
                                                                                  <span style={{ color: "#22356B" }}>{stats.sec.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="h-2 rounded-full" style={{ width: `${stats.sec.pct}%`, backgroundColor: "#22356B" }}></div>
                                                                              </div>
                                                                          </div>
  
                                                                          
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span style={{ color: "#C41230" }}>Big 12 Conference Games <span className="text-gray-400 font-normal ml-1">({stats.b12.wins} of {stats.b12.total})</span></span>
                                                                                  <span style={{ color: "#C41230" }}>{stats.b12.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="h-2 rounded-full" style={{ width: `${stats.b12.pct}%`, backgroundColor: "#C41230" }}></div>
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span style={{ color: "#013CA6" }}>ACC Conference Games <span className="text-gray-400 font-normal ml-1">({stats.acc.wins} of {stats.acc.total})</span></span>
                                                                                  <span style={{ color: "#013CA6" }}>{stats.acc.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="h-2 rounded-full" style={{ width: `${stats.acc.pct}%`, backgroundColor: "#013CA6" }}></div>
                                                                              </div>
                                                                          </div>
                                                                          <div>
                                                                              <div className="flex justify-between text-sm font-bold mb-1">
                                                                                  <span className="text-green-800">Group of 6 Conference Games <span className="text-gray-400 font-normal ml-1">({stats.g6.wins} of {stats.g6.total})</span></span>
                                                                                  <span className="text-green-800">{stats.g6.pct}%</span>
                                                                              </div>
                                                                              <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                  <div className="h-2 rounded-full" style={{ width: `${stats.g6.pct}%`, backgroundColor: "#16A34A" }}></div>
                                                                              </div>
                                                                          </div>

                                                                          <div className="border-t border-gray-100 pt-4 space-y-4">
                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span className="text-orange-900">Morning Games <span className="text-gray-400 font-normal ml-1">({stats.morning.wins} of {stats.morning.total})</span></span>
                                                                                      <span className="text-orange-700">{stats.morning.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${stats.morning.pct}%` }}></div>
                                                                                  </div>
                                                                              </div>
                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span className="text-sky-900">Afternoon Games <span className="text-gray-400 font-normal ml-1">({stats.afternoon.wins} of {stats.afternoon.total})</span></span>
                                                                                      <span className="text-sky-700">{stats.afternoon.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${stats.afternoon.pct}%` }}></div>
                                                                                  </div>
                                                                              </div>
                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span className="text-purple-900">Night Games <span className="text-gray-400 font-normal ml-1">({stats.night.wins} of {stats.night.total})</span></span>
                                                                                      <span className="text-purple-700">{stats.night.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${stats.night.pct}%` }}></div>
                                                                                  </div>
                                                                              </div>
                                                                          </div>
  
                                                                          <div className="border-t border-gray-100 pt-4 space-y-4">
                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#e52534" }}>ESPN Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.espn.wins} of {stats.espn.total})</span></span>
                                                                                      <span style={{ color: "#e52534" }}>{stats.espn.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.espn.pct}%`, backgroundColor: "#e52534" }}></div>
                                                                                  </div>
                                                                              </div>

                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#000000" }}>ABC Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.abc.wins} of {stats.abc.total})</span></span>
                                                                                      <span style={{ color: "#000000" }}>{stats.abc.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.abc.pct}%`, backgroundColor: "#000000" }}></div>
                                                                                  </div>
                                                                              </div>

                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#000000" }}>FOX Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.fox.wins} of {stats.fox.total})</span></span>
                                                                                      <span style={{ color: "#000000" }}>{stats.fox.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.fox.pct}%`, backgroundColor: "#000000" }}></div>
                                                                                  </div>
                                                                              </div>

                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#014ace" }}>CBS Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.cbs.wins} of {stats.cbs.total})</span></span>
                                                                                      <span style={{ color: "#014ace" }}>{stats.cbs.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.cbs.pct}%`, backgroundColor: "#014ace" }}></div>
                                                                                  </div>
                                                                              </div>

                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#002BE7" }}>HBO Max Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.hbomax.wins} of {stats.hbomax.total})</span></span>
                                                                                      <span style={{ color: "#002BE7" }}>{stats.hbomax.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.hbomax.pct}%`, backgroundColor: "#002BE7" }}></div>
                                                                                  </div>
                                                                              </div>

                                                                              <div>
                                                                                  <div className="flex justify-between text-sm font-bold mb-1">
                                                                                      <span style={{ color: "#FF4500" }}>CW Network Broadcast Games <span className="text-gray-400 font-normal ml-1">({stats.cw.wins} of {stats.cw.total})</span></span>
                                                                                      <span style={{ color: "#FF4500" }}>{stats.cw.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.cw.pct}%`, backgroundColor: "#FF4500" }}></div>
                                                                                  </div>
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                  </div>
  
                                                              </>
                                                          )}
                              </div>
                          </div>
                      );
                  };

  RC.pages.ScoutingReportPage = ScoutingReportPage;
})();
