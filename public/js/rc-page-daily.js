/* Roberts Cup - Daily Recap Page (hidden)
   Loaded as: <script type="text/babel" src="js/rc-page-daily.js"></script>
*/
(() => {
  const { useEffect, useMemo, useRef, useState } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const ET_TZ = "America/New_York";
  const BRAND_COLOR = "#0f172a";
  const POSTER_BG = "#f8fafc";

  const pad2 = (value) => String(value).padStart(2, "0");

  const normalizeId = (val) => {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined) return null;
    const raw = String(val).replace(/[^0-9.\-]/g, "").trim();
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  };

  const getFirstValue = (row, keys) => {
    for (const key of keys) {
      const val = row && row[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };

  const toEtDateKey = (dateObj) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(dateObj);
    const map = {};
    parts.forEach((p) => { map[p.type] = p.value; });
    return `${map.year}-${map.month}-${map.day}`;
  };

  const dateFromKey = (key) => {
    if (!key) return null;
    const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  };

  const normalizeDateKey = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    if (!s) return "";

    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${pad2(m)}-${pad2(d)}`;
    }

    const parts = s.split(/[^0-9]/).filter(Boolean);
    if (parts.length < 3) return "";

    let year = "";
    let month = "";
    let day = "";

    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      month = parts[0];
      day = parts[1];
      year = parts[2];
    }

    if (year.length === 2) {
      const yr = parseInt(year, 10);
      year = String(yr < 50 ? 2000 + yr : 1900 + yr);
    }

    if (!year || !month || !day) return "";
    return `${year}-${pad2(month)}-${pad2(day)}`;
  };

  const parseTimeToMinutes = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    let minutes = parseInt(timeMatch[2] || "0", 10);
    const meridian = (timeMatch[3] || "").toLowerCase();

    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;

    return (hours * 60) + minutes;
  };

  const formatDisplayDate = (dateKey) => {
    const dateObj = dateFromKey(dateKey);
    if (!dateObj) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TZ,
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(dateObj);
  };

  const formatTeamLabel = (team, fallback) => {
    if (!team) return fallback || "-";

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

    const school = pickFirst(team["School Name"], team.School, team.Team, team.Name);
    const seedRaw = pickFirst(team["Seed"], team["Team Seed"], team["Seed #"], team["Seed Number"], team["Playoff Seed"], team["CFP Seed"]);
    const rankRaw = pickFirst(team["Ranking"], team["Rank"], team["AP Rank"], team["AP Ranking"], team["Rk"]);

    const seedNum = cleanNum(seedRaw);
    const rankNum = cleanNum(rankRaw);
    const prefix = seedNum ? `#${seedNum}` : (rankNum ? `#${rankNum}` : "");

    if (!school) return fallback || "-";
    return prefix ? `${prefix} ${school}` : school;
  };

  const teamPrimaryColor = (team) => {
    const color = team && (team["Primary Color"] || team["Primary"] || team.Color || team["Hex"] || team["Hex Color"]);
    if (!color) return "";
    const c = String(color).trim();
    return c ? c : "";
  };

  const getBowlKey = (g) => {
    const bid = String(g["Bowl ID"] || "").trim();
    return bid || String(g.Bowl || "").trim();
  };

  const buildStandingsSnapshot = (games, picksRows, dateKeyInclusive) => {
    const completedGames = (games || []).filter((g) => {
      const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
      if (!winnerId) return false;
      const dateKey = g.__dateKey || normalizeDateKey(getFirstValue(g, ["Date"]));
      if (!dateKey) return false;
      if (dateKeyInclusive && dateKey > dateKeyInclusive) return false;
      return true;
    });

    const standings = (picksRows || []).map((row) => {
      let wins = 0;
      let losses = 0;

      completedGames.forEach((g) => {
        const bowlKey = getBowlKey(g);
        if (!bowlKey) return;
        const pickId = normalizeId(row[bowlKey]);
        const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
        if (!pickId || !winnerId) return;
        if (pickId === winnerId) wins += 1;
        else losses += 1;
      });

      return {
        name: row.Name || row.Player || "-",
        wins,
        losses,
        rawPicksIds: row
      };
    });

    standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });

    let rank = 1;
    for (let i = 0; i < standings.length; i++) {
      if (i > 0 && standings[i].wins < standings[i - 1].wins) rank = i + 1;
      standings[i].rank = rank;
    }

    const byName = {};
    standings.forEach((s) => { byName[s.name] = s; });

    return { rows: standings, byName };
  };

  const DailyPage = () => {
    const { schedule, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const [html2CanvasReady, setHtml2CanvasReady] = useState(Boolean(window.html2canvas));
    const yesterdayPosterRef = useRef(null);
    const todayPosterRef = useRef(null);

    useEffect(() => {
      if (window.html2canvas) {
        setHtml2CanvasReady(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => setHtml2CanvasReady(true);
      document.body.appendChild(script);

      return () => {
        script.onload = null;
      };
    }, []);

    const todayKey = useMemo(() => toEtDateKey(new Date()), []);
    const yesterdayKey = useMemo(() => {
      const todayDate = dateFromKey(todayKey);
      if (!todayDate) return "";
      const prevDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
      return toEtDateKey(prevDate);
    }, [todayKey]);

    const scheduleWithDates = useMemo(() => {
      if (!Array.isArray(schedule)) return [];
      return schedule.map((g) => ({
        ...g,
        __dateKey: normalizeDateKey(getFirstValue(g, ["Date"])),
        __timeMinutes: parseTimeToMinutes(getFirstValue(g, ["Time"]))
      })).filter(g => g.__dateKey);
    }, [schedule]);

    const pickCountsByBowl = useMemo(() => {
      const map = {};
      const rows = Array.isArray(picksIds) ? picksIds : [];
      scheduleWithDates.forEach((g) => {
        const bowlKey = getBowlKey(g);
        if (!bowlKey) return;
        const counts = {};
        let total = 0;
        rows.forEach((row) => {
          const pickId = normalizeId(row[bowlKey]);
          if (!pickId) return;
          counts[pickId] = (counts[pickId] || 0) + 1;
          total += 1;
        });
        counts._total = total;
        map[bowlKey] = counts;
      });
      return map;
    }, [scheduleWithDates, picksIds]);

    const yesterdayGames = useMemo(() => {
      return scheduleWithDates.filter((g) => g.__dateKey === yesterdayKey).filter((g) => {
        const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
        const homePts = parseNumber(getFirstValue(g, ["Home Pts", "HomePts", "Home Score", "HomeScore"]));
        const awayPts = parseNumber(getFirstValue(g, ["Away Pts", "AwayPts", "Away Score", "AwayScore"]));
        return Boolean(winnerId) && homePts !== null && awayPts !== null;
      });
    }, [scheduleWithDates, yesterdayKey]);

    const todayGames = useMemo(() => {
      return scheduleWithDates.filter((g) => g.__dateKey === todayKey);
    }, [scheduleWithDates, todayKey]);

    const standingsBeforeYesterday = useMemo(() => {
      const dayBeforeKey = yesterdayKey
        ? toEtDateKey(new Date(dateFromKey(yesterdayKey).getTime() - 24 * 60 * 60 * 1000))
        : "";
      return buildStandingsSnapshot(scheduleWithDates, picksIds, dayBeforeKey);
    }, [scheduleWithDates, picksIds, yesterdayKey]);

    const standingsAfterYesterday = useMemo(() => {
      return buildStandingsSnapshot(scheduleWithDates, picksIds, yesterdayKey);
    }, [scheduleWithDates, picksIds, yesterdayKey]);

    const currentStandings = useMemo(() => {
      return buildStandingsSnapshot(scheduleWithDates, picksIds, null);
    }, [scheduleWithDates, picksIds]);

    const computeDramaScore = (game, standingsSnapshot) => {
      const bowlKey = getBowlKey(game);
      if (!bowlKey) return 0;

      const counts = pickCountsByBowl[bowlKey] || {};
      const total = counts._total || 0;
      let score = 0;

      if (total > 0) {
        const awayId = normalizeId(getFirstValue(game, ["Away ID", "AwayID"]));
        const homeId = normalizeId(getFirstValue(game, ["Home ID", "HomeID"]));
        const countAway = awayId ? (counts[awayId] || 0) : 0;
        const pctAway = total > 0 ? countAway / total : 0;
        score += (1 - Math.abs(pctAway - 0.5) * 2);
      }

      const topRows = standingsSnapshot.rows.slice(0, 5);
      if (topRows.length >= 2) {
        const top1Pick = normalizeId(topRows[0].rawPicksIds[bowlKey]);
        const top2Pick = normalizeId(topRows[1].rawPicksIds[bowlKey]);
        if (top1Pick && top2Pick && top1Pick !== top2Pick) score += 0.5;
      }

      if (topRows.length > 1) {
        const uniquePicks = new Set();
        topRows.forEach((row) => {
          const pickId = normalizeId(row.rawPicksIds[bowlKey]);
          if (pickId) uniquePicks.add(pickId);
        });
        if (uniquePicks.size > 1) score += 0.25;
      }

      const spreadVal = parseNumber(getFirstValue(game, ["Spread", "Line", "Vegas Spread"]));
      if (spreadVal !== null && Math.abs(spreadVal) <= 3) score += 0.2;

      return score;
    };

    const summarizePickSplit = (game) => {
      const bowlKey = getBowlKey(game);
      if (!bowlKey) return null;
      const counts = pickCountsByBowl[bowlKey] || {};
      const total = counts._total || 0;
      if (!total) return null;

      const awayId = normalizeId(getFirstValue(game, ["Away ID", "AwayID"]));
      const homeId = normalizeId(getFirstValue(game, ["Home ID", "HomeID"]));
      const awayCount = awayId ? (counts[awayId] || 0) : 0;
      const homeCount = homeId ? (counts[homeId] || 0) : 0;
      const awayPct = total > 0 ? Math.round((awayCount / total) * 100) : 0;
      const homePct = total > 0 ? Math.round((homeCount / total) * 100) : 0;

      return {
        awayCount,
        homeCount,
        awayPct,
        homePct,
        total,
        awayId,
        homeId
      };
    };

    const buildYesterdayRecap = useMemo(() => {
      const completedCount = yesterdayGames.length;
      const leaderBefore = standingsBeforeYesterday.rows[0];
      const leaderAfter = standingsAfterYesterday.rows[0];

      let biggestRise = null;
      let biggestFall = null;

      standingsAfterYesterday.rows.forEach((row) => {
        const before = standingsBeforeYesterday.byName[row.name];
        if (!before) return;
        const diff = (before.rank || row.rank) - (row.rank || before.rank);
        if (diff > 0 && (!biggestRise || diff > biggestRise.diff)) {
          biggestRise = { name: row.name, diff };
        }
        if (diff < 0 && (!biggestFall || diff < biggestFall.diff)) {
          biggestFall = { name: row.name, diff };
        }
      });

      const leadChange = leaderBefore && leaderAfter && leaderBefore.name !== leaderAfter.name
        ? `Yes (${leaderBefore.name} -> ${leaderAfter.name})`
        : "No";

      const dramaGames = yesterdayGames.map((g) => ({
        game: g,
        score: computeDramaScore(g, standingsBeforeYesterday)
      })).sort((a, b) => b.score - a.score);

      const swingGame = dramaGames[0] ? dramaGames[0].game : null;

      let swingSummary = null;
      if (swingGame) {
        const winnerId = normalizeId(getFirstValue(swingGame, ["Winner ID", "WinnerID"]));
        const awayId = normalizeId(getFirstValue(swingGame, ["Away ID", "AwayID"]));
        const homeId = normalizeId(getFirstValue(swingGame, ["Home ID", "HomeID"]));
        const winnerTeam = winnerId && teamById ? teamById[winnerId] : null;
        const awayTeam = awayId && teamById ? teamById[awayId] : null;
        const homeTeam = homeId && teamById ? teamById[homeId] : null;

        const homePts = parseNumber(getFirstValue(swingGame, ["Home Pts", "HomePts", "Home Score", "HomeScore"]));
        const awayPts = parseNumber(getFirstValue(swingGame, ["Away Pts", "AwayPts", "Away Score", "AwayScore"]));

        const winnerName = formatTeamLabel(winnerTeam, getFirstValue(swingGame, ["Winner", "Winning Team"]) || "Winner");
        const loserName = winnerId === homeId
          ? formatTeamLabel(awayTeam, getFirstValue(swingGame, ["Team 1"]))
          : formatTeamLabel(homeTeam, getFirstValue(swingGame, ["Team 2"]));
        const winnerPts = winnerId === homeId ? homePts : awayPts;
        const loserPts = winnerId === homeId ? awayPts : homePts;

        const split = summarizePickSplit(swingGame);
        let splitText = "Pick split: n/a";
        if (split) {
          const winnerPct = winnerId === split.awayId ? split.awayPct : split.homePct;
          const loserPct = winnerId === split.awayId ? split.homePct : split.awayPct;
          splitText = `Pick split: ${winnerPct}% / ${loserPct}%`;
        }

        swingSummary = {
          bowlName: getFirstValue(swingGame, ["Bowl", "Bowl Name"]) || "Swing Game",
          scoreLine: `${winnerName} ${winnerPts} - ${loserPts} ${loserName}`,
          splitText,
          accent: teamPrimaryColor(winnerTeam),
          impact: "This game moved the leaderboard."
        };
      }

      const crowdCandidates = yesterdayGames.map((g) => {
        const split = summarizePickSplit(g);
        if (!split || !split.total) return null;
        const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
        const awayId = split.awayId;
        const homeId = split.homeId;
        if (!winnerId || (!awayId && !homeId)) return null;

        const awayPct = split.awayPct;
        const homePct = split.homePct;
        const leaderPickId = awayPct >= homePct ? awayId : homeId;
        const leaderPct = awayPct >= homePct ? awayPct : homePct;
        if (leaderPct < 80) return null;

        return {
          game: g,
          leaderPickId,
          leaderPct,
          winnerId,
          isWin: leaderPickId === winnerId
        };
      }).filter(Boolean);

      const crowdBurn = crowdCandidates
        .filter(c => !c.isWin)
        .sort((a, b) => b.leaderPct - a.leaderPct)[0] || null;

      const crowdWin = crowdCandidates
        .filter(c => c.isWin)
        .sort((a, b) => b.leaderPct - a.leaderPct)[0] || null;

      const crowdMoment = crowdBurn || crowdWin;

      let crowdSummary = null;
      if (crowdMoment) {
        const team = crowdMoment.leaderPickId && teamById ? teamById[crowdMoment.leaderPickId] : null;
        crowdSummary = {
          label: crowdMoment.isWin ? "Public win" : "Crowd got burned",
          bowlName: getFirstValue(crowdMoment.game, ["Bowl", "Bowl Name"]) || "Crowd Moment",
          pctText: `${crowdMoment.leaderPct}% picked ${formatTeamLabel(team, "that side")}`,
          accent: teamPrimaryColor(team)
        };
      }

      let bestNonPush = null;
      let bestAny = null;
      yesterdayGames.forEach((g) => {
        const line = parseNumber(getFirstValue(g, ["O/U", "Over/Under", "Total", "O-U", "OU"]));
        const homePts = parseNumber(getFirstValue(g, ["Home Pts", "HomePts", "Home Score", "HomeScore"]));
        const awayPts = parseNumber(getFirstValue(g, ["Away Pts", "AwayPts", "Away Score", "AwayScore"]));
        if (line === null || homePts === null || awayPts === null) return;
        const total = homePts + awayPts;
        const diff = Math.abs(total - line);
        if (diff > 3) return;
        if (!bestAny || diff < bestAny.diff) {
          bestAny = { game: g, line, total, diff };
        }
        if (diff > 0 && (!bestNonPush || diff < bestNonPush.diff)) {
          bestNonPush = { game: g, line, total, diff };
        }
      });

      const badBeat = bestNonPush || bestAny;
      let badBeatSummary = null;
      if (badBeat) {
        const status = badBeat.total === badBeat.line
          ? "Push"
          : (badBeat.total > badBeat.line ? "Over" : "Under");
        badBeatSummary = {
          text: `Missed by ${badBeat.diff}: O/U ${badBeat.line}, final ${badBeat.total} (${status})`,
          bowlName: getFirstValue(badBeat.game, ["Bowl", "Bowl Name"]) || "Total Watch"
        };
      }

      return {
        completedCount,
        leadChange,
        biggestRise,
        biggestFall,
        swingSummary,
        crowdSummary,
        badBeatSummary
      };
    }, [yesterdayGames, standingsBeforeYesterday, standingsAfterYesterday, pickCountsByBowl, teamById]);

    const todayData = useMemo(() => {
      const todayBowlKeys = todayGames.map(getBowlKey).filter(Boolean);
      const dramaScores = todayGames.map((g) => ({
        game: g,
        score: computeDramaScore(g, currentStandings)
      }));

      const sortedByTime = [...todayGames].sort((a, b) => {
        const aTime = a.__timeMinutes ?? 9999;
        const bTime = b.__timeMinutes ?? 9999;
        if (aTime !== bTime) return aTime - bTime;
        return String(a.Bowl || "").localeCompare(String(b.Bowl || ""));
      });

      const sortedByDrama = [...dramaScores].sort((a, b) => b.score - a.score).map(d => d.game);

      const gamesForList = todayGames.length > 5 ? sortedByDrama.slice(0, 5) : sortedByTime;
      const moreCount = todayGames.length > 5 ? todayGames.length - 5 : 0;

      const topDrama = sortedByDrama.slice(0, 3).map((g) => {
        const split = summarizePickSplit(g);
        const spreadVal = parseNumber(getFirstValue(g, ["Spread", "Line", "Vegas Spread"]));
        const bowlKey = getBowlKey(g);
        const topRows = currentStandings.rows.slice(0, 2);
        const leadersOppose = Boolean(
          bowlKey &&
          topRows[0] &&
          topRows[1] &&
          normalizeId(topRows[0].rawPicksIds[bowlKey]) &&
          normalizeId(topRows[1].rawPicksIds[bowlKey]) &&
          normalizeId(topRows[0].rawPicksIds[bowlKey]) !== normalizeId(topRows[1].rawPicksIds[bowlKey])
        );
        const reason = split
          ? "Closest split"
          : (leadersOppose
            ? "Leaders picked opposite sides"
            : (spreadVal !== null && Math.abs(spreadVal) <= 3 ? "Upset watch" : "High-impact game"));
        return {
          game: g,
          reason
        };
      });

      const stakeLines = (() => {
        const lines = [];
        const rows = currentStandings.rows;
        if (!todayGames.length) return ["No games today - standings hold steady."];
        if (!rows.length) return ["Fresh slate today - watch the leaderboard unfold."];

        const leader = rows[0];
        const second = rows[1];
        const third = rows[2];
        const fourth = rows[3];
        const last = rows[rows.length - 1];

        if (leader && second) {
          const diff = leader.wins - second.wins;
          const leaderDiffs = todayBowlKeys.reduce((acc, key) => {
            const p1 = normalizeId(leader.rawPicksIds[key]);
            const p2 = normalizeId(second.rawPicksIds[key]);
            return acc + (p1 && p2 && p1 !== p2 ? 1 : 0);
          }, 0);
          if (leaderDiffs > 0) {
            lines.push(`${leader.name} is protecting 1st - a split with ${second.name} keeps it tight.`);
          } else if (diff <= todayGames.length) {
            lines.push(`${leader.name} is protecting 1st - one wrong pick opens the door.`);
          }
        }

        if (third && fourth) {
          const diff = third.wins - fourth.wins;
          if (diff <= todayGames.length) {
            lines.push(`${fourth.name} can jump into the Top 3 with a strong day.`);
          }
        }

        if (second && leader) {
          const diff = leader.wins - second.wins;
          if (diff <= todayGames.length) {
            lines.push(`${second.name} can chase down 1st with a big day.`);
          }
        }

        if (last && rows.length > 4) {
          const above = rows[rows.length - 2];
          const diff = above.wins - last.wins;
          if (diff <= todayGames.length) {
            lines.push(`${last.name} can climb out of last with a clean day.`);
          }
        }

        return lines.slice(0, 5);
      })();

      return {
        gamesForList,
        moreCount,
        topDrama,
        stakeLines,
        dramaScores
      };
    }, [todayGames, currentStandings, pickCountsByBowl]);

    const exportPoster = async (node, filename) => {
      if (!node || !window.html2canvas) return;
      const scale = Math.min(2.5, Math.max(2, window.devicePixelRatio || 1));
      const canvas = await window.html2canvas(node, {
        backgroundColor: POSTER_BG,
        scale,
        useCORS: true
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    if (loading) {
      return RC.ui && RC.ui.LoadingSpinner
        ? <RC.ui.LoadingSpinner text="Loading daily recap..." />
        : <div className="p-8 text-center">Loading...</div>;
    }

    if (error) {
      return RC.ui && RC.ui.ErrorMessage
        ? <RC.ui.ErrorMessage message={error.message || "Failed to load league data."} />
        : <div className="p-8 text-center text-red-600">Failed to load league data.</div>;
    }

    const posterStyle = {
      width: "1080px",
      height: "1920px",
      background: POSTER_BG
    };

    const cardBase = "rounded-3xl bg-white shadow-md border border-slate-100";

    const renderCard = (title, accentColor, body) => (
      <div
        className={`${cardBase} p-8 flex flex-col gap-3`}
        style={{ borderLeft: `8px solid ${accentColor || BRAND_COLOR}` }}
      >
        <div className="text-2xl font-semibold text-slate-900">{title}</div>
        {body}
      </div>
    );

    const renderEmptyLine = (text) => (
      <div className="text-xl text-slate-500">{text}</div>
    );

    return (
      <div className="min-h-screen bg-slate-100 pt-16 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4">
            <div>
              <div className="text-3xl font-serif text-slate-900">Daily Recap Export</div>
              <div className="text-slate-600">Hidden route for generating phone-friendly recap images.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow disabled:opacity-40"
                onClick={() => exportPoster(yesterdayPosterRef.current, `RobertsCup_Recap_${yesterdayKey}.png`)}
                disabled={!html2CanvasReady}
              >
                Download Yesterday PNG
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow disabled:opacity-40"
                onClick={() => exportPoster(todayPosterRef.current, `RobertsCup_Today_${todayKey}.png`)}
                disabled={!html2CanvasReady}
              >
                Download Today PNG
              </button>
              {!html2CanvasReady && (
                <span className="text-sm text-slate-500 self-center">Loading export tools...</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-12 items-start">
            <div ref={yesterdayPosterRef} style={posterStyle} className="rounded-[36px] overflow-hidden">
              <div className="h-full w-full flex flex-col p-12 gap-8">
                <div className="rounded-3xl bg-slate-900 text-white px-10 py-10 shadow-lg">
                  <div className="text-4xl font-serif tracking-wide">Roberts Cup</div>
                  <div className="text-3xl font-semibold">Daily Recap - {formatDisplayDate(yesterdayKey)}</div>
                  <div className="text-xl opacity-90">Games completed: {buildYesterdayRecap.completedCount}</div>
                </div>

                {renderCard(
                  "Standings Movers",
                  BRAND_COLOR,
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : (
                      <div className="flex flex-col gap-2 text-xl text-slate-700">
                        <div>Biggest riser: {buildYesterdayRecap.biggestRise ? `${buildYesterdayRecap.biggestRise.name} (+${buildYesterdayRecap.biggestRise.diff})` : "-"}</div>
                        <div>Biggest faller: {buildYesterdayRecap.biggestFall ? `${buildYesterdayRecap.biggestFall.name} (${buildYesterdayRecap.biggestFall.diff})` : "-"}</div>
                        <div>Lead change: {buildYesterdayRecap.leadChange}</div>
                      </div>
                    )
                )}

                {renderCard(
                  "Swing Game of the Day",
                  buildYesterdayRecap.swingSummary ? buildYesterdayRecap.swingSummary.accent : BRAND_COLOR,
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : buildYesterdayRecap.swingSummary
                      ? (
                        <div className="flex flex-col gap-2 text-xl text-slate-700">
                          <div className="text-2xl font-semibold text-slate-900">{buildYesterdayRecap.swingSummary.bowlName}</div>
                          <div>{buildYesterdayRecap.swingSummary.scoreLine}</div>
                          <div>{buildYesterdayRecap.swingSummary.splitText}</div>
                          <div className="text-slate-600">{buildYesterdayRecap.swingSummary.impact}</div>
                        </div>
                      )
                      : renderEmptyLine("No swing game found.")
                )}

                {renderCard(
                  "Crowd Moment",
                  buildYesterdayRecap.crowdSummary ? buildYesterdayRecap.crowdSummary.accent : BRAND_COLOR,
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : buildYesterdayRecap.crowdSummary
                      ? (
                        <div className="flex flex-col gap-2 text-xl text-slate-700">
                          <div className="text-2xl font-semibold text-slate-900">{buildYesterdayRecap.crowdSummary.bowlName}</div>
                          <div className="text-slate-600">{buildYesterdayRecap.crowdSummary.label}</div>
                          <div>{buildYesterdayRecap.crowdSummary.pctText}</div>
                        </div>
                      )
                      : renderEmptyLine("No big crowd swing yesterday.")
                )}

                {renderCard(
                  "Bad Beat (Totals)",
                  BRAND_COLOR,
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : buildYesterdayRecap.badBeatSummary
                      ? (
                        <div className="flex flex-col gap-2 text-xl text-slate-700">
                          <div className="text-2xl font-semibold text-slate-900">{buildYesterdayRecap.badBeatSummary.bowlName}</div>
                          <div>{buildYesterdayRecap.badBeatSummary.text}</div>
                        </div>
                      )
                      : renderEmptyLine("No close totals yesterday.")
                )}

                <div className="mt-auto text-center text-slate-500 text-lg">Made for phone screenshots</div>
              </div>
            </div>

            <div ref={todayPosterRef} style={posterStyle} className="rounded-[36px] overflow-hidden">
              <div className="h-full w-full flex flex-col p-12 gap-8">
                <div className="rounded-3xl bg-slate-900 text-white px-10 py-10 shadow-lg">
                  <div className="text-4xl font-serif tracking-wide">Roberts Cup</div>
                  <div className="text-3xl font-semibold">Today's Watch List - {formatDisplayDate(todayKey)}</div>
                  <div className="text-xl opacity-90">Games today: {todayGames.length}</div>
                </div>

                {renderCard(
                  "Games Today",
                  BRAND_COLOR,
                  todayGames.length === 0
                    ? renderEmptyLine("No games today.")
                    : (
                      <div className="flex flex-col gap-4 text-xl text-slate-700">
                        {todayData.gamesForList.map((g) => {
                          const awayId = normalizeId(getFirstValue(g, ["Away ID", "AwayID"]));
                          const homeId = normalizeId(getFirstValue(g, ["Home ID", "HomeID"]));
                          const awayTeam = awayId && teamById ? teamById[awayId] : null;
                          const homeTeam = homeId && teamById ? teamById[homeId] : null;
                          const matchup = `${formatTeamLabel(awayTeam, getFirstValue(g, ["Team 1"]))} vs ${formatTeamLabel(homeTeam, getFirstValue(g, ["Team 2"]))}`;

                          const timeLabel = getFirstValue(g, ["Time"]) || "TBD";
                          const network = getFirstValue(g, ["Network", "TV"]) || "";
                          const split = summarizePickSplit(g);
                          const splitText = split ? `Pick split: ${split.awayPct}% / ${split.homePct}%` : "Pick split: n/a";
                          const spreadVal = getFirstValue(g, ["Spread", "Line"]);
                          const totalVal = getFirstValue(g, ["O/U", "Over/Under", "Total"]);
                          const oddsText = spreadVal || totalVal ? `${spreadVal ? `Spread ${spreadVal}` : ""}${spreadVal && totalVal ? " - " : ""}${totalVal ? `O/U ${totalVal}` : ""}` : "";

                          return (
                            <div key={getBowlKey(g)} className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                              <div className="text-slate-500">{timeLabel}{network ? ` - ${network}` : ""}</div>
                              <div className="text-2xl font-semibold text-slate-900">{getFirstValue(g, ["Bowl", "Bowl Name"]) || "Bowl Game"}</div>
                              <div>{matchup}</div>
                              <div className="text-slate-600">{splitText}</div>
                              {oddsText && <div className="text-slate-500 text-lg">{oddsText}</div>}
                            </div>
                          );
                        })}
                        {todayData.moreCount > 0 && (
                          <div className="text-slate-500">+{todayData.moreCount} more games</div>
                        )}
                      </div>
                    )
                )}

                {renderCard(
                  "What's At Stake",
                  BRAND_COLOR,
                  (
                    <div className="flex flex-col gap-2 text-xl text-slate-700">
                      {todayData.stakeLines.map((line, idx) => (
                        <div key={`${idx}-${line}`}>{line}</div>
                      ))}
                    </div>
                  )
                )}

                {renderCard(
                  "Must-Watch Games",
                  BRAND_COLOR,
                  todayGames.length === 0
                    ? renderEmptyLine("No games today.")
                    : (
                      <div className="flex flex-col gap-3 text-xl text-slate-700">
                        {todayData.topDrama.map((item) => (
                          <div key={getBowlKey(item.game)} className="flex flex-col">
                            <div className="text-2xl font-semibold text-slate-900">{getFirstValue(item.game, ["Bowl", "Bowl Name"]) || "Bowl Game"}</div>
                            <div className="text-slate-600">{item.reason}</div>
                          </div>
                        ))}
                      </div>
                    )
                )}

                <div className="mt-auto text-center text-slate-500 text-lg">Made for phone screenshots</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  RC.pages.DailyPage = DailyPage;
})();
