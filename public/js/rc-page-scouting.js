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
    const { schedule, bowlGames, picksIds, history, teams, teamById, loading, error, refresh, lastUpdated } = RC.data.useLeagueData();
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
      const getFirstValue = (row, keys) => {
        for (let i = 0; i < keys.length; i++) {
          const val = row && row[keys[i]];
          if (val !== undefined && val !== null && String(val).trim() !== "") return val;
        }
        return "";
      };
      const toNumber = (val) => {
        const cleaned = String(val == null ? "" : val).replace(/[^0-9.+-]/g, "");
        const num = parseFloat(cleaned);
        return Number.isFinite(num) ? num : null;
      };
      const gameTimeValue = (g) => {
        const d = String((g && g.Date) || "").trim();
        const t = String((g && g.Time) || "").trim();
        if (!d) return null;
        const dt = new Date(`${d} ${t}`.trim());
        const ts = dt.getTime();
        return Number.isFinite(ts) ? ts : null;
      };
      const homeIdFor = (g) => String(getFirstValue(g, ["Home ID", "HomeID", "Home Id", "HomeId"])).trim();
      const awayIdFor = (g) => String(getFirstValue(g, ["Away ID", "AwayID", "Away Id", "AwayId"])).trim();
      const favoriteIdFor = (g) => String(getFirstValue(g, ["Favorite ID", "FavoriteID", "Favorite Id", "FavoriteId"])).trim();
      const bowlNameFor = (g) => String(getFirstValue(g, ["Bowl", "Bowl Name", "BowlName"])).trim();
      const spreadFor = (g) => toNumber(getFirstValue(g, ["Spread", "Line", "Vegas Spread"]));
      const homePtsFor = (g) => toNumber(getFirstValue(g, ["Home Pts", "HomePts", "Home Points", "HomeScore", "Home Score", "Home PTS", "Home Final"]));
      const awayPtsFor = (g) => toNumber(getFirstValue(g, ["Away Pts", "AwayPts", "Away Points", "AwayScore", "Away Score", "Away PTS", "Away Final"]));
      const totalFor = (g) => toNumber(getFirstValue(g, ["Total", "O/U", "Over/Under", "OU", "O-U", "Vegas Total"]));
      const weightForGame = (g) => {
        const raw = String((g && g["Weight"]) ?? "").trim();
        const val = raw ? Number(raw) : 1;
        return Number.isFinite(val) && val > 0 ? val : 1;
      };

      // 1) Current Rank & Wins (ID-based)
      const leaderboard = (Array.isArray(picksIds) ? picksIds : [])
        .map(p => {
          let w = 0;
          (Array.isArray(schedule) ? schedule : []).forEach(g => {
            if (isCorrect(p, g)) w += weightForGame(g);
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
      const otherNetwork = getWinStats(g => {
        const tv = tvNorm(g);
        return tv && tv !== "ESPN" && tv !== "ESPN2";
      });

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
      const totalGameCount = (Array.isArray(schedule) ? schedule : []).reduce((acc, g) => {
        if (!g || !g.Bowl) return acc;
        return acc + weightForGame(g);
      }, 0);
      const unplayedCount = (Array.isArray(schedule) ? schedule : []).reduce((acc, g) => {
        if (!g || !g.Bowl || winnerIdFor(g)) return acc;
        return acc + weightForGame(g);
      }, 0);
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

      // 9) Sportsbook (family-friendly)
      const sportsbookSimple = {
        oddsPersonality: {
          labels: [],
          favoriteRate: 0,
          underdogRate: 0,
          upsetCalls: 0,
          closeShare: 0,
          totalValid: 0
        },
        big4: {
          favoritesPicked: 0,
          underdogsPicked: 0,
          totalValid: 0,
          upsetsCalled: 0,
          surprisesMissed: 0,
          upsetGames: 0
        },
        closeGames: {
          totalScored: 0,
          oneScoreGames: 0,
          oneScoreCorrect: 0,
          blowouts: 0,
          blowoutCorrect: 0,
          closeWrong: 0
        },
        ats: { w: 0, l: 0, p: 0, total: 0 },
        bestCalls: [],
        oofMoments: [],
        favoritesCorrect: 0,
        underdogsCorrect: 0,
        publicGames: 0,
        publicAligned: 0,
        contrarianCount: 0,
        contrarianCorrect: 0,
        nearTotalCount: 0,
        nearTotalGames: 0,
        totalsSum: 0,
        totalsCount: 0,
        leagueTotalsSum: 0,
        leagueTotalsCount: 0
      };

      const bestCandidates = [];
      const oofCandidates = [];
      const pickShareForGame = (g, teamId) => {
        const key = gameKey(g);
        if (!key || !teamId) return null;
        let total = 0;
        let count = 0;
        (Array.isArray(picksIds) ? picksIds : []).forEach(p => {
          const pick = pickIdFor(p, g);
          if (!pick) return;
          total++;
          if (pick === teamId) count++;
        });
        if (!total) return null;
        return { count, total, pct: count / total };
      };
      const publicSideForGame = (g) => {
        const key = gameKey(g);
        if (!key) return null;
        const counts = {};
        let total = 0;
        (Array.isArray(picksIds) ? picksIds : []).forEach(p => {
          const pick = pickIdFor(p, g);
          if (!pick) return;
          total++;
          counts[pick] = (counts[pick] || 0) + 1;
        });
        if (!total) return null;
        let max = 0;
        let leaders = [];
        Object.entries(counts).forEach(([id, count]) => {
          if (count > max) {
            max = count;
            leaders = [id];
          } else if (count === max) {
            leaders.push(id);
          }
        });
        if (leaders.length !== 1) return null;
        return { teamId: leaders[0], count: max, total, pct: max / total };
      };
      const sourceGames = (Array.isArray(bowlGames) && bowlGames.length) ? bowlGames : (Array.isArray(schedule) ? schedule : []);

      sourceGames.forEach(g => {
        try {
          const bowlKey = gameKey(g);
          if (!bowlKey) return;
          const myPick = pickIdFor(pData, g);
          if (!myPick) return;

          const homeId = homeIdFor(g);
          const awayId = awayIdFor(g);
          const favoriteId = favoriteIdFor(g);
          const winnerId = winnerIdFor(g);
          const spread = spreadFor(g);
          const homePts = homePtsFor(g);
          const awayPts = awayPtsFor(g);
          const totalLine = totalFor(g);
          const hasScores = homePts !== null && awayPts !== null;
          const margin = hasScores ? Math.abs(homePts - awayPts) : null;
          const isCompleted = !!winnerId;
          const isPickOnBoard = myPick === homeId || myPick === awayId;
          const bowlName = bowlNameFor(g) || "Unknown Bowl";
          const timeValue = gameTimeValue(g) || 0;

          if (hasScores && isCompleted && totalLine !== null) {
            sportsbookSimple.leagueTotalsSum += (homePts + awayPts);
            sportsbookSimple.leagueTotalsCount++;
          }

          if (isCompleted && favoriteId && isPickOnBoard) {
            sportsbookSimple.big4.totalValid++;
            if (myPick === favoriteId) sportsbookSimple.big4.favoritesPicked++;
            else sportsbookSimple.big4.underdogsPicked++;
          }

          if (isCompleted && favoriteId && myPick && myPick !== favoriteId && myPick === winnerId) {
            sportsbookSimple.big4.upsetsCalled++;
          }

          if (isCompleted && favoriteId && myPick === favoriteId && winnerId && winnerId !== favoriteId) {
            sportsbookSimple.big4.surprisesMissed++;
          }

          if (hasScores && isCompleted) {
            sportsbookSimple.closeGames.totalScored++;
            if (totalLine !== null) {
              sportsbookSimple.totalsSum += (homePts + awayPts);
              sportsbookSimple.totalsCount++;
              sportsbookSimple.nearTotalGames++;
              if (Math.abs((homePts + awayPts) - totalLine) <= 3 && (homePts + awayPts) !== totalLine) {
                sportsbookSimple.nearTotalCount++;
              }
            }
            if (margin !== null && margin <= 8) {
              sportsbookSimple.closeGames.oneScoreGames++;
              if (myPick === winnerId) sportsbookSimple.closeGames.oneScoreCorrect++;
              else sportsbookSimple.closeGames.closeWrong++;
            }
            if (margin !== null && margin >= 20) {
              sportsbookSimple.closeGames.blowouts++;
              if (myPick === winnerId) sportsbookSimple.closeGames.blowoutCorrect++;
            }
          }

          if (isCompleted && favoriteId && isPickOnBoard) {
            if (myPick === winnerId) {
              if (myPick === favoriteId) sportsbookSimple.favoritesCorrect++;
              else sportsbookSimple.underdogsCorrect++;
            }
            if (winnerId && favoriteId && winnerId !== favoriteId) {
              sportsbookSimple.big4.upsetGames++;
            }
          }

          if (isCompleted && isPickOnBoard) {
            const publicInfo = publicSideForGame(g);
            if (publicInfo) {
              sportsbookSimple.publicGames++;
              if (myPick === publicInfo.teamId) sportsbookSimple.publicAligned++;
              if (publicInfo.pct >= 0.65 && myPick !== publicInfo.teamId) {
                sportsbookSimple.contrarianCount++;
                if (myPick === winnerId) sportsbookSimple.contrarianCorrect++;
              }
            }
          }

          if (hasScores && spread !== null && favoriteId && isPickOnBoard) {
            const line = Math.abs(spread);
            const favoriteScore = favoriteId === homeId ? homePts : (favoriteId === awayId ? awayPts : null);
            if (favoriteScore !== null) {
              const underdogScore = favoriteId === homeId ? awayPts : homePts;
              const favMargin = favoriteScore - underdogScore;
              let outcome = "push";
              if (favMargin > line) outcome = (myPick === favoriteId) ? "win" : "loss";
              else if (favMargin < line) outcome = (myPick === favoriteId) ? "loss" : "win";
              if (outcome === "win") sportsbookSimple.ats.w++;
              else if (outcome === "loss") sportsbookSimple.ats.l++;
              else sportsbookSimple.ats.p++;
              sportsbookSimple.ats.total++;
            }
          }

          if (isCompleted && myPick === winnerId) {
            let tier = 4;
            let reason = "Picked the winner.";
            if (favoriteId && myPick !== favoriteId) {
              tier = 1;
              reason = "Picked the underdog and they won.";
            } else {
              const share = pickShareForGame(g, myPick);
              if (share && share.pct <= 0.35) {
                tier = 2;
                reason = "Not many people picked this one.";
              } else if (margin !== null && margin >= 20) {
                tier = 3;
                reason = "Called a big win.";
              }
            }
            bestCandidates.push({ bowl: bowlName, reason, tier, margin: margin || 0, time: timeValue });
          }

          if (isCompleted && myPick !== winnerId) {
            let tier = 4;
            let reason = "Your pick missed.";
            if (favoriteId && myPick === favoriteId && winnerId && winnerId !== favoriteId) {
              tier = 1;
              reason = "Took the favorite, but the underdog won.";
            } else if (margin !== null && margin <= 8) {
              tier = 2;
              reason = `Your team lost by ${margin}.`;
            } else if (margin !== null) {
              tier = 3;
              reason = `Lost by ${margin}.`;
            }
            oofCandidates.push({ bowl: bowlName, reason, tier, margin: margin == null ? 999 : margin, time: timeValue });
          }
        } catch (err) {
          // Defensive: skip any malformed game row
        }
      });

      sportsbookSimple.oddsPersonality.favoriteRate = sportsbookSimple.big4.totalValid > 0
        ? sportsbookSimple.big4.favoritesPicked / sportsbookSimple.big4.totalValid
        : 0;
      sportsbookSimple.oddsPersonality.underdogRate = sportsbookSimple.big4.totalValid > 0
        ? sportsbookSimple.big4.underdogsPicked / sportsbookSimple.big4.totalValid
        : 0;
      sportsbookSimple.oddsPersonality.upsetCalls = sportsbookSimple.big4.upsetsCalled;
      const totalPickedWithScores = sportsbookSimple.closeGames.totalScored;
      const closeShare = totalPickedWithScores > 0
        ? sportsbookSimple.closeGames.oneScoreGames / totalPickedWithScores
        : 0;
      sportsbookSimple.oddsPersonality.closeShare = closeShare;
      sportsbookSimple.oddsPersonality.totalValid = sportsbookSimple.big4.totalValid;

      const labels = [];
      const favoriteRate = sportsbookSimple.oddsPersonality.favoriteRate;
      const underdogRate = sportsbookSimple.oddsPersonality.underdogRate;
      const totalPicks = sportsbookSimple.big4.totalValid;
      const upsetCalls = sportsbookSimple.big4.upsetsCalled;
      const upsetThreshold = Math.max(3, Math.ceil(totalPicks * 0.12));
      const closeSharePct = sportsbookSimple.oddsPersonality.closeShare;
      const upsetInvolvedShare = totalPicks > 0 ? (sportsbookSimple.big4.upsetGames / totalPicks) : 0;
      const favoriteBetrayalRate = sportsbookSimple.big4.favoritesPicked > 0
        ? (sportsbookSimple.big4.surprisesMissed / sportsbookSimple.big4.favoritesPicked)
        : 0;
      const underdogWinRate = sportsbookSimple.big4.underdogsPicked > 0
        ? (sportsbookSimple.underdogsCorrect / sportsbookSimple.big4.underdogsPicked)
        : 0;
      const blowoutShare = totalPickedWithScores > 0
        ? (sportsbookSimple.closeGames.blowouts / totalPickedWithScores)
        : 0;
      const closeLossRate = sportsbookSimple.closeGames.oneScoreGames > 0
        ? (sportsbookSimple.closeGames.closeWrong / sportsbookSimple.closeGames.oneScoreGames)
        : 0;
      const publicAlignmentRate = sportsbookSimple.publicGames > 0
        ? (sportsbookSimple.publicAligned / sportsbookSimple.publicGames)
        : 0;
      const contrarianCorrectRate = sportsbookSimple.contrarianCount > 0
        ? (sportsbookSimple.contrarianCorrect / sportsbookSimple.contrarianCount)
        : 0;
      const atsWinRate = sportsbookSimple.ats.total > 0 ? (sportsbookSimple.ats.w / sportsbookSimple.ats.total) : 0;
      const atsLossRate = sportsbookSimple.ats.total > 0 ? (sportsbookSimple.ats.l / sportsbookSimple.ats.total) : 0;
      const atsPushRate = sportsbookSimple.ats.total > 0 ? (sportsbookSimple.ats.p / sportsbookSimple.ats.total) : 0;
      const avgTotalPoints = sportsbookSimple.totalsCount > 0 ? (sportsbookSimple.totalsSum / sportsbookSimple.totalsCount) : null;
      const leagueAvgTotal = sportsbookSimple.leagueTotalsCount > 0 ? (sportsbookSimple.leagueTotalsSum / sportsbookSimple.leagueTotalsCount) : null;

      if (favoriteRate >= 0.8) labels.push("🧱 Chalk Wall");
      if (underdogRate >= 0.6) labels.push("🐕 Dog Days");
      if (Math.abs(favoriteRate - 0.5) <= 0.05 && totalPicks >= 10) labels.push("🪙 Coin Flipper");
      if (upsetInvolvedShare >= 0.45) labels.push("🧲 Upset Magnet");
      if (favoriteBetrayalRate >= 0.3 && favoriteRate >= 0.6) labels.push("😬 Favorite Burned");
      if (underdogRate <= 0.3 && underdogWinRate >= 0.55) labels.push("🏹 Underdog Sniper");
      if (underdogRate >= 0.45 && closeSharePct >= 0.45) labels.push("🌪️ Chaos Captain");
      if (closeSharePct >= 0.6 && totalPickedWithScores >= 8) labels.push("🫣 Nailbiter Resident");
      if (blowoutShare >= 0.45 && totalPickedWithScores >= 8) labels.push("💥 Blowout Tourist");
      if (avgTotalPoints !== null && leagueAvgTotal !== null && avgTotalPoints <= (leagueAvgTotal - 6)) labels.push("🧊 Ice Cold Finishes");
      if (avgTotalPoints !== null && leagueAvgTotal !== null && avgTotalPoints >= (leagueAvgTotal + 6)) labels.push("🔥 Shootout Seeker");
      if (closeLossRate >= 0.4 && sportsbookSimple.closeGames.oneScoreGames >= 5) labels.push("⏳ Last-Second Heartbreak");
      if (publicAlignmentRate >= 0.7) labels.push("🐑 Crowd Follower");
      if (publicAlignmentRate <= 0.4 && sportsbookSimple.publicGames >= 5) labels.push("🦅 Solo Pilot");
      if (contrarianCorrectRate >= 0.55 && sportsbookSimple.contrarianCount >= 6) labels.push("🧨 Contrarian Hero");
      if (contrarianCorrectRate <= 0.35 && sportsbookSimple.contrarianCount >= 6) labels.push("😵 Contrarian Pain");
      if (atsWinRate >= 0.55 && sportsbookSimple.ats.total >= 10) labels.push("📏 Spread Beater");
      if (atsLossRate >= 0.55 && sportsbookSimple.ats.total >= 10) labels.push("🧻 Spread Slippery");
      if (atsPushRate >= 0.12 && sportsbookSimple.ats.total >= 10) labels.push("🟰 Push Collector");
      if (sportsbookSimple.nearTotalGames >= 4 && (sportsbookSimple.nearTotalCount / sportsbookSimple.nearTotalGames) >= 0.25) labels.push("😰 Sweat Specialist");

      if (favoriteRate >= 0.65) labels.push("⭐ Favorite Picker");
      if (underdogRate >= 0.45) labels.push("🎯 Underdog Believer");
      if (upsetCalls >= upsetThreshold) labels.push("🦊 Upset Whisperer");
      if (closeSharePct >= 0.5) labels.push("🎢 Close-Game Magnet");
      if (labels.length === 0 && favoriteRate >= 0.45 && favoriteRate <= 0.6) labels.push("⚖️ Balanced Picker");
      if (labels.length === 0) labels.push("⚖️ Balanced Picker");
      sportsbookSimple.oddsPersonality.labels = labels.slice(0, 3);

      sportsbookSimple.bestCalls = bestCandidates
        .sort((a, b) => (a.tier - b.tier) || (b.margin - a.margin) || (b.time - a.time))
        .slice(0, 5);
      sportsbookSimple.oofMoments = oofCandidates
        .sort((a, b) => (a.tier - b.tier) || (a.margin - b.margin) || (b.time - a.time))
        .slice(0, 5);

      return {
        rank, isTied, wins,
        titles, titleYears,
        cfp, b1g, sec, b12, acc, g6, morning, afternoon, night,
        espn, otherNetwork,
        maverickPct, nemesis, bff,
        champ: (nattyBowlId && pData && pData[nattyBowlId]) ? String(pData[nattyBowlId]).trim() : (pData && (pData["National Championship"] || pData["National Championship Pick"] || pData["Championship"] || "")),
        tiebreaker: pData["Tiebreaker Score"],
        currentStreak, maxWinStreak, maxLossStreak,
        maxPotential, totalGameCount, leaderWins,
        bestWin,
        sportsbookSimple
      };
    };

    const stats = calculateStats(selectedPlayer);
    const sportsbookSimple = stats && stats.sportsbookSimple ? stats.sportsbookSimple : null;

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
                                                                                      <span style={{ color: "#014ace" }}>Other TV Network Games <span className="text-gray-400 font-normal ml-1">({stats.otherNetwork.wins} of {stats.otherNetwork.total})</span></span>
                                                                                      <span style={{ color: "#014ace" }}>{stats.otherNetwork.pct}%</span>
                                                                                  </div>
                                                                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                                                                      <div className="h-2 rounded-full" style={{ width: `${stats.otherNetwork.pct}%`, backgroundColor: "#014ace" }}></div>
                                                                                  </div>
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                  </div>

                                                                  {/* Sportsbook */}
                                                                  {sportsbookSimple && (
                                                                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                                          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                                                                              <h3 className="text-lg font-bold text-gray-900 font-serif">Sportsbook</h3>
                                                                          </div>
                                                                          <div className="p-5 space-y-5">
                                                                              <div>
                                                                                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Odds Personality</div>
                                                                                  <div className="flex flex-wrap gap-2 mb-2">
                                                                                      {sportsbookSimple.oddsPersonality.labels.map(label => (
                                                                                          <span key={label} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                                                                              {label}
                                                                                          </span>
                                                                                      ))}
                                                                                  </div>
                                                                                  <div className="text-xs text-gray-500">Based on your picks against favorites, upsets, and close finishes.</div>
                                                                              </div>

                                                                              <div className="grid grid-cols-2 gap-3">
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Favorites Picked</div>
                                                                                      <div className="text-xl font-black text-gray-900">
                                                                                          {sportsbookSimple.big4.favoritesPicked} of {sportsbookSimple.big4.totalValid}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Underdogs Picked</div>
                                                                                      <div className="text-xl font-black text-gray-900">
                                                                                          {sportsbookSimple.big4.underdogsPicked} of {sportsbookSimple.big4.totalValid}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Upsets Called</div>
                                                                                      <div className="text-xl font-black text-gray-900">{sportsbookSimple.big4.upsetsCalled}</div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Surprises Missed</div>
                                                                                      <div className="text-xl font-black text-gray-900">{sportsbookSimple.big4.surprisesMissed}</div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">One-Score Games</div>
                                                                                      <div className="text-xl font-black text-gray-900">
                                                                                          {sportsbookSimple.closeGames.oneScoreCorrect} of {sportsbookSimple.closeGames.oneScoreGames}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Blowouts</div>
                                                                                      <div className="text-xl font-black text-gray-900">
                                                                                          {sportsbookSimple.closeGames.blowoutCorrect} of {sportsbookSimple.closeGames.blowouts}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 col-span-2">
                                                                                      <div className="text-xs font-bold text-gray-400 uppercase mb-2">Beat the Spread</div>
                                                                                      {sportsbookSimple.ats.total > 0 ? (
                                                                                          <>
                                                                                              <div className="text-lg font-black text-gray-900">
                                                                                                  {sportsbookSimple.ats.w}-{sportsbookSimple.ats.l}-{sportsbookSimple.ats.p}
                                                                                              </div>
                                                                                              <div className="text-xs text-gray-500">Record when your picked team wins by more than the odds expected.</div>
                                                                                          </>
                                                                                      ) : (
                                                                                          <div className="text-sm text-gray-500">No spread results yet.</div>
                                                                                      )}
                                                                                  </div>
                                                                              </div>

                                                                              <div className="border-t border-gray-100 pt-4">
                                                                                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Best Calls</div>
                                                                                  {sportsbookSimple.bestCalls.length > 0 ? (
                                                                                      <div className="space-y-2">
                                                                                          {sportsbookSimple.bestCalls.map((item, idx) => (
                                                                                              <div key={`${item.bowl}-${idx}`} className="text-sm text-gray-700">
                                                                                                  <span className="font-semibold text-gray-900">{item.bowl}</span> - {item.reason}
                                                                                              </div>
                                                                                          ))}
                                                                                      </div>
                                                                                  ) : (
                                                                                      <div className="text-sm text-gray-500">No standout calls yet.</div>
                                                                                  )}
                                                                              </div>

                                                                              <div className="border-t border-gray-100 pt-4">
                                                                                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Bad Beats</div>
                                                                                  {sportsbookSimple.oofMoments.length > 0 ? (
                                                                                      <div className="space-y-2">
                                                                                          {sportsbookSimple.oofMoments.map((item, idx) => (
                                                                                              <div key={`${item.bowl}-${idx}`} className="text-sm text-gray-700">
                                                                                                  <span className="font-semibold text-gray-900">{item.bowl}</span> - {item.reason}
                                                                                              </div>
                                                                                          ))}
                                                                                      </div>
                                                                                  ) : (
                                                                                      <div className="text-sm text-gray-500">No tough breaks yet.</div>
                                                                                  )}
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                  )}
  
                                                              </>
                                                          )}
                              </div>
                          </div>
                      );
                  };

  RC.pages.ScoutingReportPage = ScoutingReportPage;
})();
