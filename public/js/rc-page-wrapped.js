/* Roberts Cup - Wrapped Page (Spotify-style offseason recap)
   Loaded as: <script type="text/babel" src="js/rc-page-wrapped.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const normalizeId = (value) => {
    const s = String(value ?? "").trim();
    if (!s) return "";
    if (!/^\d+$/.test(s)) return s;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const getBowlKey = (game) => {
    const bid = normalizeId(game?.["Bowl ID"]);
    if (bid) return bid;
    const name = String(game?.Bowl || game?.["Bowl"] || "").trim();
    return name || "";
  };

  const getBowlName = (game) => {
    return String(
      game?.Bowl ||
      game?.["Bowl"] ||
      game?.["Bowl Name"] ||
      game?.["Sponsored Bowl Name"] ||
      ""
    ).trim() || "Bowl";
  };

  const parseNumber = (value) => {
    if (value === null || value === undefined) return NaN;
    const cleaned = String(value).replace(/[^\d.-]/g, "");
    return cleaned ? Number(cleaned) : NaN;
  };

  const parseScorePair = (game, bowlById) => {
    const bowlKey = getBowlKey(game);
    const bowlRow = bowlKey ? bowlById?.[bowlKey] : null;
    const keysA = ["Home Pts", "Home Points", "Home Score", "Team 1 Score", "Score 1", "Away Score", "Away Points", "Team 1 Points"];
    const keysB = ["Away Pts", "Away Points", "Away Score", "Team 2 Score", "Score 2", "Home Score", "Home Points", "Team 2 Points"];
    let a = NaN;
    let b = NaN;
    for (const k of keysA) {
      const v = parseNumber(game?.[k] ?? bowlRow?.[k]);
      if (Number.isFinite(v)) { a = v; break; }
    }
    for (const k of keysB) {
      const v = parseNumber(game?.[k] ?? bowlRow?.[k]);
      if (Number.isFinite(v)) { b = v; break; }
    }
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
    const combined = String(
      game?.Score ||
      game?.["Final"] ||
      game?.["Final Score"] ||
      bowlRow?.Score ||
      bowlRow?.["Final"] ||
      bowlRow?.["Final Score"] ||
      ""
    );
    const m = combined.match(/(\d+)\D+(\d+)/);
    if (m) return [Number(m[1]), Number(m[2])];
    return [NaN, NaN];
  };

  const weightForGame = (game) => {
    const raw = (game && game["Weight"] !== undefined) ? String(game["Weight"]).trim() : "";
    const val = raw ? Number(raw) : 1;
    return Number.isFinite(val) && val > 0 ? val : 1;
  };

  const getTeamName = (teamById, teamId) => {
    const team = teamById?.[teamId];
    const school = team?.["School Name"] || team?.School || team?.Team || team?.Name;
    return school || "Unknown";
  };

  const getTeamNickname = (teamById, teamId) => {
    const team = teamById?.[teamId];
    return team?.["Team Nickname"] || team?.Nickname || team?.Mascot || "team";
  };

  const shuffleArray = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const WrappedCard = ({ title, main, sub, line, theme, kicker, badge, detail, context, patternClass }) => {
    return (
      <div
        className={`wrapped-card ${patternClass || ""}`}
        style={{ "--card-bg": theme.bg, "--card-accent": theme.accent }}
      >
        <span className="wrapped-orb orb-a" />
        {badge ? <div className="wrapped-badge">{badge}</div> : null}
        <div className="wrapped-kicker">{kicker || "League Highlight"}</div>
        <div className="wrapped-title">{title}</div>
        <div className="wrapped-main">{main}</div>
        {sub ? <div className="wrapped-sub">{sub}</div> : null}
        {detail ? <div className="wrapped-detail">{detail}</div> : null}
        {context ? <div className="wrapped-context">{context}</div> : null}
        {line ? <div className="wrapped-line">{line}</div> : null}
      </div>
    );
  };

  const WrappedPage = () => {
    const { appSettings, schedule, bowlGames, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [cardOrder, setCardOrder] = useState(null);

    const players = useMemo(() => {
      return (picksIds || [])
        .map(p => p?.Name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }, [picksIds]);

    useEffect(() => {
      if (selectedPlayer || !players.length) return;
      const idx = Math.floor(Math.random() * players.length);
      setSelectedPlayer(players[idx]);
    }, [players, selectedPlayer]);

    const computed = useMemo(() => {
      const scheduleList = Array.isArray(schedule) ? schedule : [];
      const bowlList = Array.isArray(bowlGames) ? bowlGames : [];
      const picksList = Array.isArray(picksIds) ? picksIds : [];
      const completed = scheduleList.filter(g => normalizeId(g?.["Winner ID"]));
      const completedBowls = bowlList.filter(g => normalizeId(g?.["Winner ID"]));
      const playersCount = players.length || picksList.length;
      const truthy01 = (v) => {
        const s = String(v ?? "").trim().toLowerCase();
        return s === "1" || s === "true" || s === "yes" || s === "y" || s === "x";
      };
      const isCfpGame = (g) => truthy01(g?.["CFP?"] ?? g?.["CFP"] ?? g?.["Playoff"] ?? g?.["Playoff?"]);

      const sortedSchedule = scheduleList.slice().sort((a, b) => {
        const ad = new Date(`${a.Date || ""} ${a.Time || ""}`);
        const bd = new Date(`${b.Date || ""} ${b.Time || ""}`);
        const at = Number.isFinite(ad.getTime()) ? ad.getTime() : Number.POSITIVE_INFINITY;
        const bt = Number.isFinite(bd.getTime()) ? bd.getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });

      const pickCountsByGame = {};
      const globalPickCounts = {};
      const champPickCounts = {};
      const incorrectPickCountsByTeam = {};
      let totalPickCount = 0;
      let champPickTotal = 0;

      completed.forEach((game) => {
        const bowlKey = getBowlKey(game);
        if (!bowlKey) return;
        const counts = {};
        let total = 0;
        picksList.forEach((player) => {
          const pickId = normalizeId(player?.[bowlKey]);
          if (!pickId) return;
          counts[pickId] = (counts[pickId] || 0) + 1;
          globalPickCounts[pickId] = (globalPickCounts[pickId] || 0) + 1;
          total += 1;
          totalPickCount += 1;
        });
        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const majority = sortedCounts[0] || ["", 0];
        const runnerUp = sortedCounts[1] || ["", 0];
        pickCountsByGame[bowlKey] = {
          total,
          counts,
          majorityTeamId: majority[0],
          majorityCount: majority[1],
          runnerUpCount: runnerUp[1],
          splitDelta: total ? Math.abs((majority[1] / total) - 0.5) : 1
        };

        const winnerId = normalizeId(game?.["Winner ID"]);
        if (winnerId && !isCfpGame(game)) {
          Object.entries(counts).forEach(([teamId, count]) => {
            if (teamId !== winnerId) {
              incorrectPickCountsByTeam[teamId] = (incorrectPickCountsByTeam[teamId] || 0) + count;
            }
          });
        }
      });

      const champGame = sortedSchedule.find((g) => /national\s+championship/i.test(String(g.Bowl || "")));
      const champBowlKey = champGame ? getBowlKey(champGame) : "";
      if (champBowlKey) {
        picksList.forEach((player) => {
          const pickId = normalizeId(player?.[champBowlKey]);
          if (!pickId) return;
          champPickCounts[pickId] = (champPickCounts[pickId] || 0) + 1;
          champPickTotal += 1;
        });
      }

      const winsByPlayer = {};
      const lossesByPlayer = {};
      picksList.forEach(p => { winsByPlayer[p.Name] = 0; lossesByPlayer[p.Name] = 0; });

      completed.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        if (!bowlKey || !winnerId) return;
        const weight = weightForGame(game);
        picksList.forEach((player) => {
          const pickId = normalizeId(player?.[bowlKey]);
          if (!pickId) return;
          if (pickId === winnerId) {
            winsByPlayer[player.Name] += weight;
          } else {
            lossesByPlayer[player.Name] += weight;
          }
        });
      });

      const standings = picksList.map(p => ({
        name: p.Name,
        wins: winsByPlayer[p.Name] || 0,
        losses: lossesByPlayer[p.Name] || 0
      })).sort((a, b) => b.wins - a.wins);

      let rank = 1;
      standings.forEach((s, idx) => {
        if (idx > 0 && s.wins < standings[idx - 1].wins) rank = idx + 1;
        s.rank = rank;
      });

      const leaderWins = standings[0]?.wins ?? 0;
      const champions = standings.filter(s => s.wins === leaderWins).map(s => s.name);

      let crowdFavoriteTeamId = "";
      let crowdFavoriteCount = 0;
      Object.entries(champPickCounts).forEach(([teamId, count]) => {
        if (count > crowdFavoriteCount) {
          crowdFavoriteTeamId = teamId;
          crowdFavoriteCount = count;
        }
      });

      let heartbreakTeamId = "";
      let heartbreakCount = 0;
      Object.entries(incorrectPickCountsByTeam).forEach(([teamId, count]) => {
        if (count > heartbreakCount) {
          heartbreakTeamId = teamId;
          heartbreakCount = count;
        }
      });

      let mostPickedGame = null;
      let mostPickedCount = 0;
      completed.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const meta = pickCountsByGame[bowlKey];
        if (!meta || meta.total < 1) return;
        if (meta.majorityCount > mostPickedCount) {
          mostPickedCount = meta.majorityCount;
          mostPickedGame = game;
        }
      });

      let blowoutGame = null;
      let blowoutMargin = -1;
      completedBowls.forEach((game) => {
        const [a, b] = parseScorePair(game, bowlById);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const diff = Math.abs(a - b);
        if (diff > blowoutMargin) {
          blowoutMargin = diff;
          blowoutGame = game;
        }
      });

      let splitGame = null;
      let bestSplit = Number.POSITIVE_INFINITY;
      completed.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const meta = pickCountsByGame[bowlKey];
        if (!meta || meta.total < 2) return;
        if (meta.splitDelta < bestSplit) {
          bestSplit = meta.splitDelta;
          splitGame = game;
        }
      });

      let shockGame = null;
      let shockSpread = 0;
      completed.forEach((game) => {
        const favoriteId = normalizeId(game?.["Favorite ID"]);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const spread = Math.abs(parseNumber(game?.["Spread"]));
        if (!favoriteId || !winnerId || favoriteId === winnerId || !Number.isFinite(spread)) return;
        if (spread > shockSpread) {
          shockSpread = spread;
          shockGame = game;
        }
      });

      let nailBiterGame = null;
      let nailBiterMargin = Number.POSITIVE_INFINITY;
      completedBowls.forEach((game) => {
        const [a, b] = parseScorePair(game, bowlById);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const diff = Math.abs(a - b);
        if (diff < nailBiterMargin) {
          nailBiterMargin = diff;
          nailBiterGame = game;
        }
      });

      const confStats = {};
      const allowedConfs = new Map([
        ["acc", "ACC"],
        ["big12", "Big 12"],
        ["bigten", "Big Ten"],
        ["sec", "SEC"]
      ]);
      const normalizeConf = (name) => String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      completed.forEach((game) => {
        const winnerId = normalizeId(game?.["Winner ID"]);
        const homeId = normalizeId(game?.["Home ID"]);
        const awayId = normalizeId(game?.["Away ID"]);
        if (!winnerId || !homeId || !awayId) return;
        const loserId = winnerId === homeId ? awayId : homeId;
        const winConfRaw = teamById?.[winnerId]?.["Conference"] || teamById?.[winnerId]?.Conference || "";
        const loseConfRaw = teamById?.[loserId]?.["Conference"] || teamById?.[loserId]?.Conference || "";
        const winKey = normalizeConf(winConfRaw);
        const loseKey = normalizeConf(loseConfRaw);
        const winConf = allowedConfs.get(winKey);
        const loseConf = allowedConfs.get(loseKey);
        if (winConf) {
          confStats[winConf] = confStats[winConf] || { wins: 0, losses: 0 };
          confStats[winConf].wins += 1;
        }
        if (loseConf) {
          confStats[loseConf] = confStats[loseConf] || { wins: 0, losses: 0 };
          confStats[loseConf].losses += 1;
        }
      });
      let bestConf = "";
      let bestConfPct = -1;
      Object.entries(confStats).forEach(([conf, record]) => {
        const total = record.wins + record.losses;
        if (!total) return;
        const pct = record.wins / total;
        if (pct > bestConfPct) {
          bestConfPct = pct;
          bestConf = conf;
        }
      });

      const chaosThreshold = 7;
      let chaosTotal = 0;
      let chaosUpsets = 0;
      completed.forEach((game) => {
        const favoriteId = normalizeId(game?.["Favorite ID"]);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const spread = Math.abs(parseNumber(game?.["Spread"]));
        if (!favoriteId || !winnerId || !Number.isFinite(spread)) return;
        if (spread < chaosThreshold) return;
        chaosTotal += 1;
        if (favoriteId !== winnerId) chaosUpsets += 1;
      });

      const selectedPick = picksList.find(p => p.Name === selectedPlayer) || null;
      const playerStats = standings.find(s => s.name === selectedPlayer) || { wins: 0, losses: 0, rank: "-" };

      const playerCorrectByGame = {};
      let maxStreak = 0;
      let currentStreak = 0;
      const sharedCounts = {};
      const diffCounts = {};
      picksList.forEach((p) => {
        if (p?.Name && p.Name !== selectedPlayer) {
          sharedCounts[p.Name] = 0;
          diffCounts[p.Name] = 0;
        }
      });

      sortedSchedule.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        if (!bowlKey || !winnerId || !selectedPick) return;
        const pickId = normalizeId(selectedPick[bowlKey]);
        if (pickId) {
          picksList.forEach((other) => {
            if (!other?.Name || other.Name === selectedPlayer) return;
            const otherPick = normalizeId(other[bowlKey]);
            if (!otherPick) return;
            if (otherPick === pickId) sharedCounts[other.Name] += 1;
            if (otherPick !== pickId) diffCounts[other.Name] += 1;
          });
        }
        const correct = pickId && pickId === winnerId;
        playerCorrectByGame[bowlKey] = correct;
        if (correct) {
          currentStreak += 1;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      });

      let signatureGame = null;
      let signatureCount = Number.POSITIVE_INFINITY;
      completed.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (!winnerId || !pickId || pickId !== winnerId) return;
        const meta = pickCountsByGame[bowlKey];
        const count = meta?.counts?.[winnerId] || 0;
        if (count && count < signatureCount) {
          signatureCount = count;
          signatureGame = game;
        }
      });

      let mostSharedPlayer = "";
      let mostSharedCount = 0;
      Object.entries(sharedCounts).forEach(([name, count]) => {
        if (count > mostSharedCount) {
          mostSharedCount = count;
          mostSharedPlayer = name;
        }
      });

      let mostDifferentPlayer = "";
      let mostDifferentCount = 0;
      Object.entries(diffCounts).forEach(([name, count]) => {
        if (count > mostDifferentCount) {
          mostDifferentCount = count;
          mostDifferentPlayer = name;
        }
      });

      const earlySlice = completed.slice(0, 10);
      let earlyWins = 0;
      let earlyTotal = 0;
      earlySlice.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (!winnerId || !pickId) return;
        earlyTotal += 1;
        if (pickId === winnerId) earlyWins += 1;
      });

      let rivalryWins = 0;
      let rivalryLosses = 0;
      if (selectedPick && mostDifferentPlayer) {
        const rival = picksList.find(p => p.Name === mostDifferentPlayer) || null;
        if (rival) {
          completed.forEach((game) => {
            const bowlKey = getBowlKey(game);
            const winnerId = normalizeId(game?.["Winner ID"]);
            const pickId = normalizeId(selectedPick?.[bowlKey]);
            const rivalPick = normalizeId(rival?.[bowlKey]);
            if (!winnerId || !pickId || !rivalPick) return;
            if (pickId === rivalPick) return;
            if (pickId === winnerId) rivalryWins += 1;
            if (rivalPick === winnerId) rivalryLosses += 1;
          });
        }
      }

      let contrarianTotal = 0;
      let contrarianCount = 0;
      completed.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const meta = pickCountsByGame[bowlKey];
        if (!meta || meta.total < 2) return;
        if (meta.majorityCount === meta.runnerUpCount) return;
        if (!selectedPick) return;
        const pickId = normalizeId(selectedPick[bowlKey]);
        if (!pickId) return;
        contrarianTotal += 1;
        if (pickId !== meta.majorityTeamId) contrarianCount += 1;
      });

      let closeCallCorrect = 0;
      let closeCallTotal = 0;
      completedBowls.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (!winnerId || !pickId) return;
        const [a, b] = parseScorePair(game, bowlById);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const diff = Math.abs(a - b);
        if (diff > 7) return;
        closeCallTotal += 1;
        if (pickId === winnerId) closeCallCorrect += 1;
      });

      const recentSlice = completed.slice(-10);
      let finishWins = 0;
      recentSlice.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (winnerId && pickId && winnerId === pickId) finishWins += 1;
      });

      return {
        champions,
        leaderWins,
        standings,
        crowdFavoriteTeamId,
        crowdFavoriteCount,
        heartbreakTeamId,
        heartbreakCount,
        mostPickedGame,
        mostPickedCount,
        blowoutGame,
        blowoutMargin,
        splitGame,
        pickCountsByGame,
        shockGame,
        shockSpread,
        nailBiterGame,
        nailBiterMargin,
        bestConf,
        bestConfRecord: bestConf ? confStats[bestConf] : null,
        chaosTotal,
        chaosUpsets,
        totalPickCount,
        champPickTotal,
        playerStats,
        signatureGame,
        signatureCount,
        mostSharedPlayer,
        mostSharedCount,
        mostDifferentPlayer,
        mostDifferentCount,
        earlyWins,
        earlyTotal,
        rivalryWins,
        rivalryLosses,
        maxStreak,
        contrarianTotal,
        contrarianCount,
        closeCallTotal,
        closeCallCorrect,
        finishWins
      };
    }, [schedule, picksIds, teamById, selectedPlayer, players]);

    const settingInt = (key) => {
      const entry = appSettings && appSettings[key];
      const raw = entry && (entry.value_int ?? entry.value_text);
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const settingText = (key) => {
      const entry = appSettings && appSettings[key];
      if (!entry) return "";
      const raw = entry.value_text ?? entry.value_int ?? "";
      return String(raw || "").trim();
    };

    const seasonYear = settingText("season_year") || settingInt("season_year") || "Season";
    const totalPlayers = players.length || (picksIds ? picksIds.length : 0);

    const cardThemes = [
      { bg: "linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)", accent: "#0f172a" },
      { bg: "linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)", accent: "#0b1320" },
      { bg: "linear-gradient(135deg, #7f7bff 0%, #f9b7ff 100%)", accent: "#111827" },
      { bg: "linear-gradient(135deg, #ff8a00 0%, #ff3d81 100%)", accent: "#111827" },
      { bg: "linear-gradient(135deg, #3df7ff 0%, #b5ff3d 100%)", accent: "#0f172a" },
      { bg: "linear-gradient(135deg, #f43b86 0%, #ff9f68 100%)", accent: "#111827" },
      { bg: "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)", accent: "#0f172a" },
      { bg: "linear-gradient(135deg, #facc15 0%, #fb7185 100%)", accent: "#0f172a" }
    ];

    const themeForIndex = (idx) => cardThemes[idx % cardThemes.length];

    const leagueCards = useMemo(() => {
      const champions = computed.champions?.length ? computed.champions.join(" & ") : "TBD";
      const champRecord = computed.leaderWins ? `${computed.leaderWins} wins` : "Record pending";
      const crowdPct = computed.crowdFavoriteCount && computed.champPickTotal
        ? Math.round((computed.crowdFavoriteCount / computed.champPickTotal) * 100)
        : null;

      const mostPickedBowl = computed.mostPickedGame ? getBowlName(computed.mostPickedGame) : "Most picked game";
      const mostPickedTeamId = computed.mostPickedGame
        ? computed.pickCountsByGame?.[getBowlKey(computed.mostPickedGame)]?.majorityTeamId
        : "";
      const mostPickedTeam = mostPickedTeamId ? getTeamName(teamById, mostPickedTeamId) : "No pick leader yet";

      const blowoutBowl = computed.blowoutGame ? getBowlName(computed.blowoutGame) : "Blowout bowl";
      const blowoutWinnerId = computed.blowoutGame ? normalizeId(computed.blowoutGame?.["Winner ID"]) : "";
      const blowoutTeam = blowoutWinnerId ? getTeamName(teamById, blowoutWinnerId) : "Big win";
      const blowoutMarginText = Number.isFinite(computed.blowoutMargin) && computed.blowoutMargin >= 0
        ? `${computed.blowoutMargin}-point margin`
        : "Biggest margin";

      const splitMeta = computed.splitGame
        ? computed.pickCountsByGame?.[getBowlKey(computed.splitGame)]
        : null;
      const splitPct = splitMeta && splitMeta.total
        ? `${Math.round((splitMeta.majorityCount / splitMeta.total) * 100)}/${Math.round((splitMeta.runnerUpCount / splitMeta.total) * 100)}`
        : "50/50";

      const shockWinnerId = normalizeId(computed.shockGame?.["Winner ID"]);
      const shockFavoriteId = normalizeId(computed.shockGame?.["Favorite ID"]);
      const shockWinner = shockWinnerId ? getTeamName(teamById, shockWinnerId) : "Underdog";
      const shockFavorite = shockFavoriteId ? getTeamName(teamById, shockFavoriteId) : "Favorite";
      const shockBowl = computed.shockGame ? getBowlName(computed.shockGame) : "Upset alert";

      const nailBowl = computed.nailBiterGame ? getBowlName(computed.nailBiterGame) : "Closest finish TBD";
      const nailMargin = Number.isFinite(computed.nailBiterMargin) && computed.nailBiterMargin !== Number.POSITIVE_INFINITY
        ? `${computed.nailBiterMargin}-point finish`
        : "Score data pending";

      const bestConfRecord = computed.bestConfRecord
        ? `${computed.bestConfRecord.wins}-${computed.bestConfRecord.losses}`
        : "Record pending";

      const chaosPct = computed.chaosTotal
        ? Math.round((computed.chaosUpsets / computed.chaosTotal) * 100)
        : null;

      const crowdFavoriteTeam = computed.crowdFavoriteTeamId
        ? getTeamName(teamById, computed.crowdFavoriteTeamId)
        : "No favorite yet";

      const heartbreakTeam = computed.heartbreakTeamId
        ? getTeamName(teamById, computed.heartbreakTeamId)
        : "TBD";

      return [
        {
          title: "Champion",
          main: `${champions} took it home`,
          sub: champRecord,
          detail: totalPlayers ? `${totalPlayers} players battled all season` : "",
          context: "Every bowl counted. Every pick mattered.",
          line: "Crowned with style and a little bit of chaos.",
          badge: "🏆"
        },
        {
          title: "The Crowd Favorite",
          main: `${crowdFavoriteTeam} was picked to win it all`,
          sub: crowdPct ? `${crowdPct}% of championship picks` : `${computed.crowdFavoriteCount || 0} championship picks`,
          detail: computed.champPickTotal ? `${computed.champPickTotal} total championship picks` : "",
          context: "Your most popular title prediction.",
          line: "The trophy choice everyone loved.",
          badge: "👥"
        },
        {
          title: "Shock of the Year",
          main: `${shockWinner} upset ${shockFavorite}`,
          sub: computed.shockSpread ? `${computed.shockSpread}-point underdog` : shockBowl,
          detail: shockBowl,
          context: "This is where the bracket chaos began.",
          line: "Nobody saw it. Somebody got it.",
          badge: "⚡"
        },
        {
          title: "Most Picked Game",
          main: `${mostPickedTeam} led the picks`,
          sub: mostPickedBowl,
          detail: computed.mostPickedCount ? `${computed.mostPickedCount} picks in one game` : "Top pick total",
          context: "The biggest pile-on of the season.",
          line: "This one drew the largest crowd.",
          badge: "✅"
        },
        {
          title: "Blowout Bowl",
          main: blowoutBowl,
          sub: blowoutMarginText,
          detail: "Biggest final score gap",
          context: "One team never looked back.",
          line: `${blowoutTeam} ran away with it.`,
          badge: "💥"
        },
        {
          title: "Split the Room",
          main: `${splitPct} on ${getBowlName(computed.splitGame || {})}`,
          sub: "Closest split of the year",
          detail: "Right down the middle",
          context: "This one divided the group chat.",
          line: "Group text went quiet for a while.",
          badge: "⚖️"
        },
        {
          title: "Heartbreaker",
          main: `${heartbreakTeam} broke ${computed.heartbreakCount || 0} picks`,
          sub: "Most painful miss",
          detail: "The pick that haunted everyone",
          context: "The upset that still stings.",
          line: "We still talk about it at dinner.",
          badge: "💔"
        },
        {
          title: "So Close",
          main: nailBowl,
          sub: nailMargin,
          detail: "Closest finish on the board",
          context: "A finish you could feel in your bones.",
          line: "Cardiac bowl. Classic.",
          badge: "😅"
        },
        {
          title: "Conference Crown",
          main: `${computed.bestConf || "Conference"} went ${bestConfRecord}`,
          sub: "Best bowl record",
          detail: "Conference bragging rights",
          context: "This year’s banner goes here.",
          line: "Bragging rights secured.",
          badge: "🏰"
        },
        {
          title: "Season Chaos",
          main: `${computed.chaosUpsets || 0} big upsets`,
          sub: chaosPct ? `${chaosPct}% against the spread` : "Chaos never slept",
          detail: "The year the script broke",
          context: "The picks kept you guessing.",
          line: "Predictable? Not even close.",
          badge: "🌪️"
        }
      ];
    }, [computed, teamById, totalPlayers]);

    const playerCards = useMemo(() => {
      const signatureBowl = computed.signatureGame ? getBowlName(computed.signatureGame) : "Signature game pending";
      const signatureTeamId = normalizeId(computed.signatureGame?.["Winner ID"]);
      const signatureTeam = signatureTeamId ? getTeamName(teamById, signatureTeamId) : "that team";
      const signatureNickname = signatureTeamId ? getTeamNickname(teamById, signatureTeamId) : "team";
      const signatureCount = computed.signatureCount && Number.isFinite(computed.signatureCount) ? computed.signatureCount : null;

      const mostSharedPlayer = computed.mostSharedPlayer || "No pick twin yet";
      const mostDifferentPlayer = computed.mostDifferentPlayer || "No rival yet";
      const earlyLine = computed.earlyTotal
        ? `${computed.earlyWins} of ${computed.earlyTotal} in the first 10`
        : "Early bowls pending";
      const rivalryLine = (computed.rivalryWins || computed.rivalryLosses)
        ? `${computed.rivalryWins}-${computed.rivalryLosses} head-to-head`
        : "Rivalry record pending";

      const contrarianPct = computed.contrarianTotal
        ? Math.round((computed.contrarianCount / computed.contrarianTotal) * 100)
        : 0;

      const closeCallLine = computed.closeCallTotal
        ? `${computed.closeCallCorrect}/${computed.closeCallTotal} in one-score games`
        : "One-score data pending";

      return [
        {
          title: "Your Season",
          main: `#${computed.playerStats.rank || "-"}`,
          sub: `${computed.playerStats.wins || 0}-${computed.playerStats.losses || 0} record`,
          detail: selectedPlayer ? `Season recap for ${selectedPlayer}` : "",
          context: "Every pick told your story.",
          line: "A season to remember.",
          badge: "✨"
        },
        {
          title: "Early Bird",
          main: earlyLine,
          sub: "Fast start",
          detail: "Your opening stretch",
          context: "First 10 bowls set the tone.",
          line: "You came out swinging.",
          badge: "⏰"
        },
        {
          title: "You Called It",
          main: signatureBowl,
          sub: signatureCount ? `Only ${signatureCount} got the ${signatureNickname} right` : `Only a few got ${signatureTeam} right`,
          detail: signatureBowl,
          context: "Your boldest moment of the year.",
          line: "You saw the twist coming.",
          badge: "🔮"
        },
        {
          title: "Rode With",
          main: `Most in sync with ${mostSharedPlayer}`,
          sub: computed.mostSharedCount ? `${computed.mostSharedCount} matching picks` : "Closest matchups",
          detail: "Your closest pick partner",
          context: "Great minds picked alike.",
          line: "Your closest pick buddy.",
          badge: "🤝"
        },
        {
          title: "Nemesis",
          main: `Most different from ${mostDifferentPlayer}`,
          sub: computed.mostDifferentCount ? `${computed.mostDifferentCount} different picks` : "Opposite sides",
          detail: "Your biggest head-to-head split",
          context: "Always on the other side.",
          line: "This matchup never agreed.",
          badge: "😤"
        },
        {
          title: "Rivalry Rival",
          main: mostDifferentPlayer,
          sub: rivalryLine,
          detail: "Your toughest head-to-head",
          context: "Closest competitor all season.",
          line: "Every pick felt personal.",
          badge: "🥊"
        },
        {
          title: "Peak Form",
          main: `${computed.maxStreak || 0} straight wins`,
          sub: "Best run",
          detail: "You were locked in",
          context: "This stretch was pure magic.",
          line: "You were unstoppable.",
          badge: "🔥"
        },
        {
          title: "Go Your Own Way",
          main: `Against the crowd ${contrarianPct}%`,
          sub: "Boldest styles",
          detail: "Not afraid to zig",
          context: "Independent thinker energy.",
          line: "Independent thinker energy.",
          badge: "🧭"
        },
        {
          title: "Sweaty Picks",
          main: closeCallLine,
          sub: "Nail-biters survived",
          detail: "Your closest calls",
          context: "The games that made you pace.",
          line: "Fingernails were harmed.",
          badge: "😬"
        },
        {
          title: "Finish Strong",
          main: `${computed.finishWins || 0} out of 10 to close`,
          sub: "Clutch factor",
          detail: "The final stretch",
          context: "You brought it home late.",
          line: "Late-game heroics.",
          badge: "💪"
        }
      ];
    }, [computed, teamById, selectedPlayer]);

    const allCards = useMemo(() => {
      const league = leagueCards.map((card, idx) => ({
        ...card,
        __key: `league-${card.title}`,
        __themeIndex: idx,
        __kicker: "League highlight"
      }));
      const playersList = playerCards.map((card, idx) => ({
        ...card,
        __key: `player-${card.title}-${idx}`,
        __themeIndex: idx + 3,
        __kicker: selectedPlayer || "Player spotlight"
      }));
      return [...league, ...playersList];
    }, [leagueCards, playerCards, selectedPlayer]);

    useEffect(() => {
      if (!allCards.length) return;
      if (cardOrder && cardOrder.length === allCards.length) return;
      const championIndex = allCards.findIndex((card) => card.title === "Champion");
      const yourSeasonIndex = allCards.findIndex((card) => card.title === "Your Season");
      const indices = allCards
        .map((_, idx) => idx)
        .filter((idx) => idx !== championIndex && idx !== yourSeasonIndex);
      const shuffled = shuffleArray(indices);
      const order = [];
      if (championIndex >= 0) order.push(championIndex);
      if (yourSeasonIndex >= 0) order.push(yourSeasonIndex);
      order.push(...shuffled);
      setCardOrder(order);
    }, [allCards, cardOrder]);

    const patternClasses = [
      "pattern-waves",
      "pattern-grid",
      "pattern-burst",
      "pattern-pills",
      "pattern-stripes",
      "pattern-orbit",
      "pattern-tilt",
      "pattern-dots"
    ];

    const orderedCards = useMemo(() => {
      if (!cardOrder || cardOrder.length !== allCards.length) return allCards;
      return cardOrder.map((idx) => allCards[idx]).filter(Boolean);
    }, [allCards, cardOrder]);

    const { LoadingSpinner, ErrorMessage } = (RC.ui || {});
    const Spinner = LoadingSpinner || (() => <div className="p-6">Loading…</div>);
    const Err = ErrorMessage || (({ message }) => <div className="p-6 text-red-600">{message}</div>);

    if (loading) return <Spinner />;
    if (error) return <Err message={error?.message || "Failed to load league data."} />;

    return (
      <div className="wrapped-root">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap');
          .wrapped-root {
            background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%),
                        radial-gradient(circle at 80% 10%, rgba(255,255,255,0.3), transparent 45%),
                        linear-gradient(135deg, #0b0d12 0%, #111827 55%, #0b1020 100%);
            color: #f8fafc;
            min-height: 100vh;
            padding: 32px 16px 60px;
            position: relative;
            overflow: hidden;
          }
          .wrapped-root::after {
            content: "";
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px);
            background-size: 18px 18px;
            opacity: 0.12;
            pointer-events: none;
          }
          .wrapped-hero {
            position: relative;
            z-index: 1;
            max-width: 980px;
            margin: 0 auto 24px;
          }
          .wrapped-hero-row {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          @media (min-width: 768px) {
            .wrapped-hero-row {
              flex-direction: row;
              align-items: flex-start;
              justify-content: space-between;
            }
          }
          .wrapped-kicker-text {
            font-family: "Space Grotesk", sans-serif;
            font-size: 12px;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: rgba(248, 250, 252, 0.7);
            margin-bottom: 8px;
          }
          .wrapped-hero-title {
            font-family: "Bebas Neue", sans-serif;
            font-size: clamp(40px, 9vw, 86px);
            line-height: 0.95;
            text-transform: uppercase;
            margin: 0 0 8px;
          }
          .wrapped-hero-sub {
            font-family: "Space Grotesk", sans-serif;
            font-size: clamp(16px, 3.5vw, 22px);
            max-width: 520px;
            color: rgba(248, 250, 252, 0.8);
          }
          .wrapped-rail {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 18px;
            overflow-x: auto;
            padding: 8px 4px 18px;
            margin: 0 auto 26px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }
          .wrapped-rail::-webkit-scrollbar { display: none; }
          .wrapped-card {
            position: relative;
            flex: 0 0 auto;
            width: min(82vw, 360px);
            min-height: 500px;
            border-radius: 26px;
            padding: 24px 22px;
            background: var(--card-bg);
            color: #0b0b0b;
            scroll-snap-align: start;
            box-shadow: 0 22px 40px rgba(0,0,0,0.35);
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.4);
          }
          .wrapped-card::before,
          .wrapped-card::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
          .wrapped-card::before {
            opacity: 0.35;
            mix-blend-mode: soft-light;
          }
          .wrapped-card::after {
            opacity: 0.32;
            mix-blend-mode: overlay;
          }
          .wrapped-orb {
            background: rgba(255,255,255,0.6);
          }
          .pattern-waves::before {
            background-image:
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8) 0 6px, transparent 7px),
              repeating-linear-gradient(120deg, rgba(255,255,255,0.45) 0 10px, transparent 10px 24px);
          }
          .pattern-waves::after {
            background-image:
              repeating-radial-gradient(circle at 70% 75%, rgba(255,255,255,0.35) 0 10px, transparent 10px 24px);
          }
          .pattern-grid::before {
            background-image:
              linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .pattern-grid::after {
            background-image:
              linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px);
            background-size: 48px 48px;
            transform: rotate(12deg);
          }
          .pattern-burst::before {
            background-image:
              repeating-conic-gradient(from 15deg, rgba(255,255,255,0.55) 0 12deg, transparent 12deg 24deg);
            mask-image: radial-gradient(circle at 70% 30%, black 0 55%, transparent 70%);
          }
          .pattern-burst::after {
            background-image:
              radial-gradient(circle at 25% 80%, rgba(255,255,255,0.45) 0 120px, transparent 121px);
          }
          .pattern-pills::before {
            background-image:
              radial-gradient(circle at 15% 25%, rgba(255,255,255,0.65) 0 18px, transparent 19px),
              radial-gradient(circle at 75% 70%, rgba(255,255,255,0.55) 0 22px, transparent 23px),
              radial-gradient(circle at 45% 85%, rgba(255,255,255,0.5) 0 16px, transparent 17px);
          }
          .pattern-pills::after {
            background-image:
              radial-gradient(circle at 85% 20%, rgba(255,255,255,0.35) 0 28px, transparent 29px),
              radial-gradient(circle at 35% 60%, rgba(255,255,255,0.35) 0 34px, transparent 35px);
          }
          .pattern-stripes::before {
            background-image:
              repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 10px, transparent 10px 22px);
          }
          .pattern-stripes::after {
            background-image:
              repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 6px, transparent 6px 16px);
          }
          .pattern-orbit::before {
            background-image:
              radial-gradient(circle at 30% 30%, transparent 0 42px, rgba(255,255,255,0.5) 42px 44px, transparent 45px),
              radial-gradient(circle at 70% 70%, transparent 0 50px, rgba(255,255,255,0.45) 50px 52px, transparent 53px);
          }
          .pattern-orbit::after {
            background-image:
              radial-gradient(circle at 70% 30%, transparent 0 28px, rgba(255,255,255,0.35) 28px 30px, transparent 31px);
          }
          .pattern-tilt::before {
            background-image:
              linear-gradient(160deg, rgba(255,255,255,0.55) 0 26%, transparent 26% 100%);
          }
          .pattern-tilt::after {
            background-image:
              linear-gradient(330deg, rgba(255,255,255,0.35) 0 18%, transparent 18% 100%);
          }
          .pattern-dots::before {
            background-image:
              radial-gradient(rgba(255,255,255,0.6) 2px, transparent 2px);
            background-size: 20px 20px;
          }
          .pattern-dots::after {
            background-image:
              radial-gradient(rgba(255,255,255,0.35) 3px, transparent 3px);
            background-size: 44px 44px;
          }
          .wrapped-orb {
            position: absolute;
            border-radius: 999px;
            filter: blur(0px);
            opacity: 0.4;
          }
          .orb-a {
            width: 160px;
            height: 160px;
            background: rgba(255,255,255,0.6);
            top: -50px;
            right: -60px;
          }
          .wrapped-badge {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255,255,255,0.6);
            color: #111827;
            font-size: 22px;
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            box-shadow: 0 12px 18px rgba(0,0,0,0.2);
          }
          .wrapped-kicker {
            font-family: "Space Grotesk", sans-serif;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            opacity: 0.7;
          }
          .wrapped-title {
            font-family: "Bebas Neue", sans-serif;
            font-size: 32px;
            text-transform: uppercase;
            margin-top: 6px;
          }
          .wrapped-main {
            font-family: "Space Grotesk", sans-serif;
            font-size: 26px;
            font-weight: 700;
            margin-top: 18px;
            line-height: 1.1;
          }
          .wrapped-sub {
            font-family: "Space Grotesk", sans-serif;
            font-size: 16px;
            margin-top: 10px;
            font-weight: 500;
          }
          .wrapped-detail {
            font-family: "Space Grotesk", sans-serif;
            font-size: 14px;
            margin-top: 8px;
            opacity: 0.85;
          }
          .wrapped-context {
            font-family: "Space Grotesk", sans-serif;
            font-size: 13px;
            margin-top: 6px;
            opacity: 0.75;
          }
          .wrapped-line {
            margin-top: auto;
            padding-top: 18px;
            font-family: "Space Grotesk", sans-serif;
            font-size: 14px;
            font-weight: 500;
            opacity: 0.8;
          }
          .wrapped-select {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-family: "Space Grotesk", sans-serif;
            min-width: min(280px, 100%);
          }
          .wrapped-select label {
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.2em;
            color: rgba(248, 250, 252, 0.7);
          }
          .wrapped-select select {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.3);
            color: #f8fafc;
            border-radius: 14px;
            padding: 12px 14px;
            font-size: 16px;
          }
        `}</style>

        <div className="wrapped-hero">
          <div className="wrapped-hero-row">
            <div>
              <div className="wrapped-kicker-text">Roberts Cup Wrapped</div>
              <h1 className="wrapped-hero-title">{seasonYear} Recap</h1>
              <p className="wrapped-hero-sub">
                The season you made personal. Swipe through the league’s most memorable moments.
              </p>
            </div>
            <div className="wrapped-select">
              <label htmlFor="wrapped-player">Choose a player</label>
              <select
                id="wrapped-player"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                {players.map((player) => (
                  <option key={player} value={player}>{player}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="wrapped-rail">
          {orderedCards.map((card, idx) => (
            <WrappedCard
              key={card.__key}
              title={card.title}
              main={card.main}
              sub={card.sub}
              detail={card.detail}
              context={card.context}
              line={card.line}
              badge={card.badge}
              theme={themeForIndex(card.__themeIndex)}
              kicker={card.__kicker}
              patternClass={patternClasses[idx % patternClasses.length]}
            />
          ))}
        </div>

      </div>
    );
  };

  window.RC.pages.WrappedPage = WrappedPage;
})();
      const bowlById = {};
      bowlList.forEach((game) => {
        const id = normalizeId(game?.["Bowl ID"]);
        if (id) bowlById[id] = game;
      });
