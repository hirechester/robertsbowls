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
    return String(game?.Bowl || game?.["Bowl"] || "").trim() || "Bowl";
  };

  const parseNumber = (value) => {
    if (value === null || value === undefined) return NaN;
    const cleaned = String(value).replace(/[^\d.-]/g, "");
    return cleaned ? Number(cleaned) : NaN;
  };

  const parseScorePair = (game) => {
    const keysA = ["Team 1 Score", "Score 1", "Away Score", "Away Points", "Team 1 Points", "Home Score"];
    const keysB = ["Team 2 Score", "Score 2", "Home Score", "Home Points", "Team 2 Points", "Away Score"];
    let a = NaN;
    let b = NaN;
    for (const k of keysA) {
      const v = parseNumber(game?.[k]);
      if (Number.isFinite(v)) { a = v; break; }
    }
    for (const k of keysB) {
      const v = parseNumber(game?.[k]);
      if (Number.isFinite(v)) { b = v; break; }
    }
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
    const combined = String(game?.Score || game?.["Final"] || game?.["Final Score"] || "");
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

  const WrappedCard = ({ title, main, sub, line, theme, kicker, badge }) => {
    return (
      <div className="wrapped-card" style={{ "--card-bg": theme.bg, "--card-accent": theme.accent }}>
        <span className="wrapped-orb orb-a" />
        <span className="wrapped-orb orb-b" />
        {badge ? <div className="wrapped-badge">{badge}</div> : null}
        <div className="wrapped-kicker">{kicker || "League Highlight"}</div>
        <div className="wrapped-title">{title}</div>
        <div className="wrapped-main">{main}</div>
        {sub ? <div className="wrapped-sub">{sub}</div> : null}
        {line ? <div className="wrapped-line">{line}</div> : null}
      </div>
    );
  };

  const WrappedPage = () => {
    const { appSettings, schedule, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const [selectedPlayer, setSelectedPlayer] = useState("");

    const players = useMemo(() => {
      return (picksIds || []).map(p => p?.Name).filter(Boolean);
    }, [picksIds]);

    useEffect(() => {
      if (!selectedPlayer && players.length) setSelectedPlayer(players[0]);
    }, [players, selectedPlayer]);

    const computed = useMemo(() => {
      const scheduleList = Array.isArray(schedule) ? schedule : [];
      const picksList = Array.isArray(picksIds) ? picksIds : [];
      const completed = scheduleList.filter(g => normalizeId(g?.["Winner ID"]));
      const playersCount = players.length || picksList.length;

      const sortedSchedule = scheduleList.slice().sort((a, b) => {
        const ad = new Date(`${a.Date || ""} ${a.Time || ""}`);
        const bd = new Date(`${b.Date || ""} ${b.Time || ""}`);
        const at = Number.isFinite(ad.getTime()) ? ad.getTime() : Number.POSITIVE_INFINITY;
        const bt = Number.isFinite(bd.getTime()) ? bd.getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });

      const pickCountsByGame = {};
      const globalPickCounts = {};
      const correctPickCountsByTeam = {};
      const incorrectPickCountsByTeam = {};
      let totalPickCount = 0;

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
        if (winnerId) {
          const winnerCount = counts[winnerId] || 0;
          correctPickCountsByTeam[winnerId] = (correctPickCountsByTeam[winnerId] || 0) + winnerCount;
          Object.entries(counts).forEach(([teamId, count]) => {
            if (teamId !== winnerId) {
              incorrectPickCountsByTeam[teamId] = (incorrectPickCountsByTeam[teamId] || 0) + count;
            }
          });
        }
      });

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
      Object.entries(globalPickCounts).forEach(([teamId, count]) => {
        if (count > crowdFavoriteCount) {
          crowdFavoriteTeamId = teamId;
          crowdFavoriteCount = count;
        }
      });

      let mvpTeamId = "";
      let mvpCount = 0;
      Object.entries(correctPickCountsByTeam).forEach(([teamId, count]) => {
        if (count > mvpCount) {
          mvpTeamId = teamId;
          mvpCount = count;
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

      let cleanSweepGame = null;
      completed.forEach((game) => {
        if (cleanSweepGame) return;
        const bowlKey = getBowlKey(game);
        const meta = pickCountsByGame[bowlKey];
        if (meta && meta.total > 0 && meta.majorityCount === meta.total) cleanSweepGame = game;
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
      completed.forEach((game) => {
        const [a, b] = parseScorePair(game);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const diff = Math.abs(a - b);
        if (diff < nailBiterMargin) {
          nailBiterMargin = diff;
          nailBiterGame = game;
        }
      });

      const confStats = {};
      completed.forEach((game) => {
        const winnerId = normalizeId(game?.["Winner ID"]);
        const homeId = normalizeId(game?.["Home ID"]);
        const awayId = normalizeId(game?.["Away ID"]);
        if (!winnerId || !homeId || !awayId) return;
        const loserId = winnerId === homeId ? awayId : homeId;
        const winConf = teamById?.[winnerId]?.["Conference"] || teamById?.[winnerId]?.Conference || "";
        const loseConf = teamById?.[loserId]?.["Conference"] || teamById?.[loserId]?.Conference || "";
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

      const playerPickCounts = {};
      const playerWrongCounts = {};
      const playerCorrectByGame = {};
      let maxStreak = 0;
      let currentStreak = 0;

      sortedSchedule.forEach((game) => {
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        if (!bowlKey || !winnerId || !selectedPick) return;
        const pickId = normalizeId(selectedPick[bowlKey]);
        if (pickId) {
          playerPickCounts[pickId] = (playerPickCounts[pickId] || 0) + 1;
        }
        const correct = pickId && pickId === winnerId;
        playerCorrectByGame[bowlKey] = correct;
        if (correct) {
          currentStreak += 1;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
          if (pickId) {
            playerWrongCounts[pickId] = (playerWrongCounts[pickId] || 0) + 1;
          }
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

      let swingGame = null;
      let swingDelta = -1;
      completed.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (!winnerId || !pickId || pickId !== winnerId) return;
        const meta = pickCountsByGame[bowlKey];
        const count = meta?.counts?.[winnerId] || 0;
        const delta = (meta?.total || 0) - count;
        if (delta > swingDelta) {
          swingDelta = delta;
          swingGame = game;
        }
      });

      let favoriteTeamId = "";
      let favoriteTeamCount = 0;
      Object.entries(playerPickCounts).forEach(([teamId, count]) => {
        if (count > favoriteTeamCount) {
          favoriteTeamCount = count;
          favoriteTeamId = teamId;
        }
      });

      let nemesisTeamId = "";
      let nemesisCount = 0;
      Object.entries(playerWrongCounts).forEach(([teamId, count]) => {
        if (count > nemesisCount) {
          nemesisCount = count;
          nemesisTeamId = teamId;
        }
      });

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
      completed.forEach((game) => {
        if (!selectedPick) return;
        const bowlKey = getBowlKey(game);
        const winnerId = normalizeId(game?.["Winner ID"]);
        const pickId = normalizeId(selectedPick?.[bowlKey]);
        if (!winnerId || !pickId) return;
        const [a, b] = parseScorePair(game);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const diff = Math.abs(a - b);
        if (diff > 7) return;
        closeCallTotal += 1;
        if (pickId === winnerId) closeCallCorrect += 1;
      });

      const recentSlice = completed.slice(-5);
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
        mvpTeamId,
        mvpCount,
        heartbreakTeamId,
        heartbreakCount,
        cleanSweepGame,
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
        playerStats,
        signatureGame,
        signatureCount,
        favoriteTeamId,
        favoriteTeamCount,
        nemesisTeamId,
        nemesisCount,
        maxStreak,
        contrarianTotal,
        contrarianCount,
        closeCallTotal,
        closeCallCorrect,
        swingGame,
        swingDelta,
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
      const crowdPct = computed.crowdFavoriteCount && computed.totalPickCount
        ? Math.round((computed.crowdFavoriteCount / computed.totalPickCount) * 100)
        : null;

      const cleanBowl = computed.cleanSweepGame ? getBowlName(computed.cleanSweepGame) : "Everyone stayed split";
      const cleanTeamId = computed.cleanSweepGame
        ? computed.pickCountsByGame?.[getBowlKey(computed.cleanSweepGame)]?.majorityTeamId
        : "";
      const cleanTeam = cleanTeamId ? getTeamName(teamById, cleanTeamId) : "No sweep yet";

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

      const mvpTeam = computed.mvpTeamId
        ? getTeamName(teamById, computed.mvpTeamId)
        : "TBD";

      const heartbreakTeam = computed.heartbreakTeamId
        ? getTeamName(teamById, computed.heartbreakTeamId)
        : "TBD";

      return [
        {
          title: "Champion",
          main: `${champions} took it home`,
          sub: champRecord,
          line: "Crowned with style and a little bit of chaos.",
          badge: "🏆"
        },
        {
          title: "The Crowd Favorite",
          main: `${crowdFavoriteTeam} was picked the most`,
          sub: crowdPct ? `${crowdPct}% of all picks` : `${computed.crowdFavoriteCount || 0} total picks`,
          line: "Family hive-mind, activated."
        },
        {
          title: "Shock of the Year",
          main: `${shockWinner} upset ${shockFavorite}`,
          sub: computed.shockSpread ? `${computed.shockSpread}-point underdog` : shockBowl,
          line: "Nobody saw it. Somebody got it."
        },
        {
          title: "Everyone Agreed",
          main: `${cleanTeam} was a clean sweep`,
          sub: cleanBowl,
          line: "Unanimous... and still stressful."
        },
        {
          title: "Split the Room",
          main: `${splitPct} on ${getBowlName(computed.splitGame || {})}`,
          sub: "Closest split of the year",
          line: "Group text went quiet for a while."
        },
        {
          title: "League MVP",
          main: `${mvpTeam} paid out ${computed.mvpCount || 0} times`,
          sub: "Most correct picks",
          line: "You’ll be buying their merch by now."
        },
        {
          title: "Heartbreaker",
          main: `${heartbreakTeam} broke ${computed.heartbreakCount || 0} picks`,
          sub: "Most painful miss",
          line: "We still talk about it at dinner."
        },
        {
          title: "So Close",
          main: nailBowl,
          sub: nailMargin,
          line: "Cardiac bowl. Classic."
        },
        {
          title: "Conference Crown",
          main: `${computed.bestConf || "Conference"} went ${bestConfRecord}`,
          sub: "Best bowl record",
          line: "Bragging rights secured."
        },
        {
          title: "Season Chaos",
          main: `${computed.chaosUpsets || 0} big upsets`,
          sub: chaosPct ? `${chaosPct}% against the spread` : "Chaos never slept",
          line: "Predictable? Not even close."
        }
      ];
    }, [computed, teamById, totalPlayers]);

    const playerCards = useMemo(() => {
      const signatureBowl = computed.signatureGame ? getBowlName(computed.signatureGame) : "Signature game pending";
      const signatureTeamId = normalizeId(computed.signatureGame?.["Winner ID"]);
      const signatureTeam = signatureTeamId ? getTeamName(teamById, signatureTeamId) : "that team";
      const signatureNickname = signatureTeamId ? getTeamNickname(teamById, signatureTeamId) : "team";
      const signatureCount = computed.signatureCount && Number.isFinite(computed.signatureCount) ? computed.signatureCount : null;

      const favoriteTeam = computed.favoriteTeamId
        ? getTeamName(teamById, computed.favoriteTeamId)
        : "No favorite yet";

      const nemesisTeam = computed.nemesisTeamId
        ? getTeamName(teamById, computed.nemesisTeamId)
        : "No nemesis yet";

      const contrarianPct = computed.contrarianTotal
        ? Math.round((computed.contrarianCount / computed.contrarianTotal) * 100)
        : 0;

      const closeCallLine = computed.closeCallTotal
        ? `${computed.closeCallCorrect}/${computed.closeCallTotal} in one-score games`
        : "One-score data pending";

      const swingBowl = computed.swingGame ? getBowlName(computed.swingGame) : "Moment pending";

      return [
        {
          title: "Your Season",
          main: `#${computed.playerStats.rank || "-"}`,
          sub: `${computed.playerStats.wins || 0}-${computed.playerStats.losses || 0} record`,
          line: "A season to remember.",
          badge: "✨"
        },
        {
          title: "You Called It",
          main: signatureBowl,
          sub: signatureCount ? `Only ${signatureCount} got the ${signatureNickname} right` : `Only a few got ${signatureTeam} right`,
          line: "You saw the twist coming."
        },
        {
          title: "Rode With",
          main: `${favoriteTeam} ${computed.favoriteTeamCount || 0} times`,
          sub: "Most-picked team",
          line: "Loyalty pays... sometimes."
        },
        {
          title: "Nemesis",
          main: `${nemesisTeam} hurt you ${computed.nemesisCount || 0} times`,
          sub: "Most wrong picks",
          line: "We all have that one team."
        },
        {
          title: "Peak Form",
          main: `${computed.maxStreak || 0} straight wins`,
          sub: "Best run",
          line: "You were unstoppable."
        },
        {
          title: "Go Your Own Way",
          main: `Against the crowd ${contrarianPct}%`,
          sub: "Boldest styles",
          line: "Independent thinker energy."
        },
        {
          title: "Sweaty Picks",
          main: closeCallLine,
          sub: "Nail-biters survived",
          line: "Fingernails were harmed."
        },
        {
          title: "Your Moment",
          main: swingBowl,
          sub: computed.swingDelta > 0 ? `You beat ${computed.swingDelta} picks here` : "Season-swinger",
          line: "The moment that moved you."
        },
        {
          title: "Finish Strong",
          main: `${computed.finishWins || 0}/5 to close`,
          sub: "Clutch factor",
          line: "Late-game heroics."
        }
      ];
    }, [computed, teamById]);

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
            min-height: 360px;
            border-radius: 26px;
            padding: 24px 22px;
            background: var(--card-bg);
            color: #0b0b0b;
            scroll-snap-align: start;
            box-shadow: 0 22px 40px rgba(0,0,0,0.35);
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.4);
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
          .orb-b {
            width: 120px;
            height: 120px;
            background: rgba(0,0,0,0.2);
            bottom: -40px;
            left: -20px;
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
            max-width: 980px;
            margin: 0 auto 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-family: "Space Grotesk", sans-serif;
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
          .wrapped-footer {
            position: relative;
            z-index: 1;
            max-width: 980px;
            margin: 28px auto 0;
            font-family: "Space Grotesk", sans-serif;
            color: rgba(248, 250, 252, 0.8);
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: space-between;
          }
          .wrapped-pill {
            background: rgba(248, 250, 252, 0.12);
            border: 1px solid rgba(248, 250, 252, 0.2);
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 14px;
          }
        `}</style>

        <div className="wrapped-hero">
          <div className="wrapped-kicker-text">Roberts Cup Wrapped</div>
          <h1 className="wrapped-hero-title">{seasonYear} Recap</h1>
          <p className="wrapped-hero-sub">
            The season you made personal. Swipe through the league’s loudest moments.
          </p>
        </div>

        <div className="wrapped-rail">
          {leagueCards.map((card, idx) => (
            <WrappedCard
              key={card.title}
              title={card.title}
              main={card.main}
              sub={card.sub}
              line={card.line}
              badge={card.badge}
              theme={themeForIndex(idx)}
              kicker="League highlight"
            />
          ))}
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

        <div className="wrapped-rail">
          {playerCards.map((card, idx) => (
            <WrappedCard
              key={`${card.title}-${idx}`}
              title={card.title}
              main={card.main}
              sub={card.sub}
              line={card.line}
              badge={card.badge}
              theme={themeForIndex(idx + 3)}
              kicker={selectedPlayer || "Player spotlight"}
            />
          ))}
        </div>

        <div className="wrapped-footer">
          <div className="wrapped-pill">Swipe for more</div>
          <div className="wrapped-pill">Family picks, legendary vibes</div>
        </div>
      </div>
    );
  };

  window.RC.pages.WrappedPage = WrappedPage;
})();
