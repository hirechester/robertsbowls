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

  const formatRankLabel = (rank) => {
    const s = ["th", "st", "nd", "rd"];
    const v = rank % 100;
    return `${rank}${(s[(v - 20) % 10] || s[v] || s[0])}`;
  };

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

  const formatDisplayDateNoYear = (dateKey) => {
    const dateObj = dateFromKey(dateKey);
    if (!dateObj) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TZ,
      month: "long",
      day: "numeric"
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

  const getTeamSchoolName = (team, fallback) => {
    const school = team ? getFirstValue(team, ["School Name", "School", "Team", "Name"]) : "";
    return school || fallback || "-";
  };

  const teamPrimaryColor = (team) => {
    const color = team && (team["Primary Color"] || team["Primary"] || team.Color || team["Hex"] || team["Hex Color"]);
    if (!color) return "";
    const c = String(color).trim();
    return c ? c : "";
  };

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    const { schedule, bowlGames, picksIds, teamById, loading, error } = RC.data.useLeagueData();
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

    const posterMode = useMemo(() => {
      const params = new URLSearchParams(window.location.search || "");
      const mode = (params.get("poster") || "").toLowerCase();
      return (mode === "yesterday" || mode === "today") ? mode : "";
    }, []);

    const isPosterOnly = Boolean(posterMode);

    const [viewportSize, setViewportSize] = useState(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    useEffect(() => {
      if (!isPosterOnly) return;

      const updateViewport = () => {
        const viewport = window.visualViewport;
        const width = viewport ? viewport.width : window.innerWidth;
        const height = viewport ? viewport.height : window.innerHeight;
        setViewportSize({ width, height });
      };

      updateViewport();
      window.addEventListener("resize", updateViewport);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", updateViewport);
        window.visualViewport.addEventListener("scroll", updateViewport);
      }

      return () => {
        window.removeEventListener("resize", updateViewport);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", updateViewport);
          window.visualViewport.removeEventListener("scroll", updateViewport);
        }
      };
    }, [isPosterOnly]);

    const posterScale = useMemo(() => {
      if (!isPosterOnly) return 1;
      const availableWidth = Math.max(1, viewportSize.width);
      const scale = availableWidth / 1080;
      return Math.max(0.2, Math.min(1, scale));
    }, [isPosterOnly, viewportSize]);

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
        __dateKey: normalizeDateKey(getFirstValue(g, ["Date", "Game Date", "Date ET", "Date (ET)", "Date (EST)", "GameDay"])),
        __timeMinutes: parseTimeToMinutes(getFirstValue(g, ["Time", "Time ET", "Time (ET)", "Kickoff", "Kickoff Time"]))
      })).filter(g => g.__dateKey);
    }, [schedule]);

    const bowlGamesWithDates = useMemo(() => {
      if (!Array.isArray(bowlGames)) return [];
      return bowlGames.map((g) => ({
        ...g,
        __dateKey: normalizeDateKey(getFirstValue(g, ["Date", "Game Date", "Date ET", "Date (ET)", "Date (EST)", "GameDay"])),
        __timeMinutes: parseTimeToMinutes(getFirstValue(g, ["Time", "Time ET", "Time (ET)", "Kickoff", "Kickoff Time"]))
      })).filter(g => g.__dateKey);
    }, [bowlGames]);

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
        return Boolean(winnerId);
      });
    }, [scheduleWithDates, yesterdayKey]);

    const scoreboardData = useMemo(() => {
      const homeIdKeys = ["Home ID", "HomeID", "Home Team ID", "HomeTeamID", "Home Team Id"];
      const awayIdKeys = ["Away ID", "AwayID", "Away Team ID", "AwayTeamID", "Away Team Id"];
      const homeNameKeys = ["Home Team", "Home", "Home School", "Team 1", "Team1", "Home Name"];
      const awayNameKeys = ["Away Team", "Away", "Away School", "Team 2", "Team2", "Away Name"];
      const formatPts = (raw) => (raw ? raw : "-");
      const formatSeededName = (team, fallbackName) => {
        const name = getFirstValue(team, ["School", "School Name", "Team", "Team Name", "Name"]) || fallbackName || "-";
        const seedRaw = getFirstValue(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
        const seedMatch = String(seedRaw || "").match(/(\d+)/);
        if (!seedMatch) return name;
        return `#${seedMatch[1]} ${name}`;
      };
      const yesterdayMatches = bowlGamesWithDates
        .map((g, idx) => ({ g, idx }))
        .filter(({ g }) => {
          if (g.__dateKey !== yesterdayKey) return false;
          return true;
        })
        .sort((a, b) => {
          const aTime = Number.isFinite(a.g.__timeMinutes) ? a.g.__timeMinutes : null;
          const bTime = Number.isFinite(b.g.__timeMinutes) ? b.g.__timeMinutes : null;
          if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;
          if (aTime !== null && bTime === null) return -1;
          if (aTime === null && bTime !== null) return 1;
          return a.idx - b.idx;
        });

      const lines = [];
      yesterdayMatches.forEach(({ g }) => {
        const homeId = normalizeId(getFirstValue(g, homeIdKeys));
        const awayId = normalizeId(getFirstValue(g, awayIdKeys));
        const homePtsStr = String(g["Home Pts"] ?? "").trim();
        const awayPtsStr = String(g["Away Pts"] ?? "").trim();
        const homePtsRaw = parseNumber(homePtsStr);
        const awayPtsRaw = parseNumber(awayPtsStr);

        const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
        const homeNameFallback = getFirstValue(g, homeNameKeys) || (homeId ? `Team ${homeId}` : "Home");
        const awayNameFallback = getFirstValue(g, awayNameKeys) || (awayId ? `Team ${awayId}` : "Away");
        let homePts = homePtsRaw;
        let awayPts = awayPtsRaw;
        let winnerIsHome = Number.isFinite(homePts) && Number.isFinite(awayPts)
          ? homePts >= awayPts
          : true;
        if (winnerId) {
          winnerIsHome = winnerId === homeId;
          if (!winnerIsHome && winnerId !== awayId) {
            winnerIsHome = Number.isFinite(homePts) && Number.isFinite(awayPts)
              ? homePts >= awayPts
              : true;
          }
        }

        const winnerTeam = winnerIsHome ? (teamById ? teamById[homeId] : null) : (teamById ? teamById[awayId] : null);
        const loserTeam = winnerIsHome ? (teamById ? teamById[awayId] : null) : (teamById ? teamById[homeId] : null);
        const winnerName = formatSeededName(
          winnerTeam,
          winnerIsHome ? homeNameFallback : awayNameFallback
        );
        const loserName = formatSeededName(
          loserTeam,
          winnerIsHome ? awayNameFallback : homeNameFallback
        );
        const winnerPts = winnerIsHome ? homePts : awayPts;
        const loserPts = winnerIsHome ? awayPts : homePts;
        const winnerPtsStr = winnerIsHome ? formatPts(homePtsStr) : formatPts(awayPtsStr);
        const loserPtsStr = winnerIsHome ? formatPts(awayPtsStr) : formatPts(homePtsStr);
        lines.push(`${winnerName} def. ${loserName} ${winnerPtsStr}-${loserPtsStr}`);
      });

      if (!lines.length) {
        return { lines: ["No finals yesterday."] };
      }
      return { lines };
    }, [bowlGamesWithDates, yesterdayKey, teamById]);

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

      const getLeaderNames = (standings) => {
        const rows = Array.isArray(standings.rows) ? standings.rows : [];
        if (!rows.length) return [];
        const hasRank = rows.every((row) => Number.isFinite(row.rank));
        if (hasRank) {
          const topRank = rows.reduce((best, row) => Math.min(best, row.rank), Infinity);
          return rows.filter((row) => row.rank === topRank).map((row) => row.name);
        }
        const topWins = rows.reduce((best, row) => {
          const wins = Number(row.wins);
          return Number.isFinite(wins) ? Math.max(best, wins) : best;
        }, -Infinity);
        if (!Number.isFinite(topWins)) return [];
        return rows.filter((row) => Number(row.wins) === topWins).map((row) => row.name);
      };

      const leadersBefore = getLeaderNames(standingsBeforeYesterday);
      const leadersAfter = getLeaderNames(standingsAfterYesterday);
      const sameLeaders = leadersBefore.length === leadersAfter.length &&
        leadersBefore.every((name) => leadersAfter.includes(name));

      let leadChange = "No";
      let leadChangeInfo = { type: "none" };
      if (!sameLeaders && leadersAfter.length) {
        if (leadersAfter.length > 1) {
          if (leadersBefore.length === 1 && leadersAfter.includes(leadersBefore[0])) {
            const joiners = leadersAfter.filter((name) => name !== leadersBefore[0]);
            leadChange = `Tie at the Top — ${joiners.join(" & ")} joined ${leadersBefore[0]}`;
            leadChangeInfo = { type: "tie-join", joiners, leader: leadersBefore[0] };
          } else {
            leadChange = `Tie at the Top — ${leadersAfter.join(" & ")}`;
            leadChangeInfo = { type: "tie", leaders: leadersAfter };
          }
        } else if (leadersAfter.length === 1) {
          if (leadersBefore.length > 1 && leadersBefore.includes(leadersAfter[0])) {
            leadChange = `Solo Leader — ${leadersAfter[0]}`;
            leadChangeInfo = { type: "solo", leader: leadersAfter[0] };
          } else {
            const beforeLabel = leadersBefore.length ? leadersBefore.join(" & ") : "No leader";
            leadChange = `Yes (${beforeLabel} -> ${leadersAfter[0]})`;
            leadChangeInfo = { type: "swap", before: leadersBefore, after: leadersAfter[0] };
          }
        }
      }

      const standingsRows = Array.isArray(standingsAfterYesterday.rows) ? standingsAfterYesterday.rows : [];
      const topCount = Math.min(5, standingsRows.length);
      const topRows = standingsRows.slice(0, topCount);
      const leaderScore = topRows.length ? topRows[0].wins : null;
      const hasLeaderScore = Number.isFinite(leaderScore);
      const leaderCount = hasLeaderScore
        ? topRows.filter((row) => Number.isFinite(row.wins) && row.wins === leaderScore).length
        : 0;
      const snapshotItems = topRows.map((row, index) => {
        const scoreValue = Number.isFinite(row.wins) ? row.wins : null;
        const behindLeader = (hasLeaderScore && Number.isFinite(scoreValue)) ? (leaderScore - scoreValue) : null;
        const isLeader = hasLeaderScore && Number.isFinite(scoreValue) && scoreValue === leaderScore;
        return {
          rank: row.rank || (index + 1),
          name: row.name,
          score: scoreValue,
          gb: behindLeader,
          isLeader,
          leaderCount
        };
      });
      const lastScore = topRows.length ? topRows[topRows.length - 1].wins : null;
      const spreadTop = (hasLeaderScore && Number.isFinite(lastScore)) ? (leaderScore - lastScore) : null;
      const spreadLine = (spreadTop === null || topRows.length < 2)
        ? ""
        : `The top five are only separated by ${spreadTop} wins`;

      const streakGames = scheduleWithDates
        .filter((g) => {
          const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
          if (!winnerId) return false;
          if (!g.__dateKey) return false;
          return g.__dateKey <= yesterdayKey;
        })
        .sort((a, b) => {
          if (a.__dateKey !== b.__dateKey) return a.__dateKey.localeCompare(b.__dateKey);
          const aTime = Number.isFinite(a.__timeMinutes) ? a.__timeMinutes : 9999;
          const bTime = Number.isFinite(b.__timeMinutes) ? b.__timeMinutes : 9999;
          return aTime - bTime;
        });

      const streakStats = (picksIds || []).map((row) => {
        let winStreak = 0;
        let missStreak = 0;
        let lastResult = "";

        streakGames.forEach((g) => {
          const bowlKey = getBowlKey(g);
          if (!bowlKey) return;
          const pickId = normalizeId(row[bowlKey]);
          if (!pickId) return;
          const winnerId = normalizeId(getFirstValue(g, ["Winner ID", "WinnerID"]));
          if (!winnerId) return;
          const isWin = pickId === winnerId;
          if (isWin) {
            winStreak = lastResult === "win" ? winStreak + 1 : 1;
            missStreak = 0;
            lastResult = "win";
          } else {
            missStreak = lastResult === "loss" ? missStreak + 1 : 1;
            winStreak = 0;
            lastResult = "loss";
          }
        });

        return {
          name: row.Name || row.Player || "-",
          currentWinStreak: lastResult === "win" ? winStreak : 0,
          currentMissStreak: lastResult === "loss" ? missStreak : 0
        };
      });

      const maxWinStreak = streakStats.reduce((max, cur) => (
        Math.max(max, cur.currentWinStreak || 0)
      ), 0);
      const maxMissStreak = streakStats.reduce((max, cur) => (
        Math.max(max, cur.currentMissStreak || 0)
      ), 0);
      const hotHands = maxWinStreak > 0
        ? streakStats.filter((row) => row.currentWinStreak === maxWinStreak)
        : [];
      const coldStreaks = maxMissStreak > 0
        ? streakStats.filter((row) => row.currentMissStreak === maxMissStreak)
        : [];

      const excitementCandidates = yesterdayGames.map((g) => {
        const excitement = parseNumber(getFirstValue(g, ["Excitement"]));
        if (excitement === null) return null;
        return { game: g, excitement };
      }).filter(Boolean);

      let bigGame = null;
      if (excitementCandidates.length) {
        const top = excitementCandidates.reduce((best, cur) => (
          cur.excitement > best.excitement ? cur : best
        ));
        bigGame = top.game;
      } else {
        const recent = yesterdayGames.reduce((best, g) => {
          const time = Number.isFinite(g.__timeMinutes) ? g.__timeMinutes : -1;
          if (!best || time > best.time) return { game: g, time };
          return best;
        }, null);
        bigGame = recent ? recent.game : null;
      }

      let bigGameSummary = null;
      if (bigGame) {
        const winnerId = normalizeId(getFirstValue(bigGame, ["Winner ID", "WinnerID"]));
        const awayId = normalizeId(getFirstValue(bigGame, ["Away ID", "AwayID"]));
        const homeId = normalizeId(getFirstValue(bigGame, ["Home ID", "HomeID"]));
        const winnerTeam = winnerId && teamById ? teamById[winnerId] : null;
        const awayTeam = awayId && teamById ? teamById[awayId] : null;
        const homeTeam = homeId && teamById ? teamById[homeId] : null;

        const homePts = parseNumber(getFirstValue(bigGame, ["Home Pts", "HomePts", "Home Score", "HomeScore"]));
        const awayPts = parseNumber(getFirstValue(bigGame, ["Away Pts", "AwayPts", "Away Score", "AwayScore"]));

        const winnerFallback = winnerId ? `Team ${winnerId}` : "Winner";
        const loserId = winnerId === homeId ? awayId : homeId;
        const loserFallback = loserId ? `Team ${loserId}` : "Loser";
        const winnerName = winnerTeam ? formatTeamLabel(winnerTeam, winnerFallback) : winnerFallback;
        const loserTeam = winnerId === homeId ? awayTeam : homeTeam;
        const loserName = loserTeam ? formatTeamLabel(loserTeam, loserFallback) : loserFallback;
        const winnerPts = winnerId === homeId ? homePts : awayPts;
        const loserPts = winnerId === homeId ? awayPts : homePts;
        const hasScore = winnerPts !== null && loserPts !== null;

        const bowlKey = getBowlKey(bigGame);
        const counts = bowlKey ? (pickCountsByBowl[bowlKey] || {}) : {};
        const winnerPicks = winnerId ? (counts[winnerId] || 0) : 0;
        const loserPicks = loserId ? (counts[loserId] || 0) : 0;
        const splitText = (winnerPicks + loserPicks) > 0
          ? `Pick Split: ${winnerPicks} got it right, and ${loserPicks} missed the mark`
          : null;

        bigGameSummary = {
          bowlName: getFirstValue(bigGame, ["Bowl", "Bowl Name"]) || "Big Game",
          scoreLine: hasScore
            ? `Final: ${winnerName} ${winnerPts}, ${loserName} ${loserPts}`
            : `Final: ${winnerName} over ${loserName}`,
          splitText,
          accent: teamPrimaryColor(winnerTeam),
          line: null
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
        leadChangeInfo,
        biggestRise,
        biggestFall,
        standingsSnapshot: {
          items: snapshotItems,
          spreadLine
        },
        streakWatch: {
          hotHands,
          coldStreaks,
          maxWinStreak,
          maxMissStreak
        },
        bigGameSummary,
        crowdSummary,
        badBeatSummary
      };
    }, [yesterdayGames, standingsBeforeYesterday, standingsAfterYesterday, pickCountsByBowl, teamById, yesterdayKey, scheduleWithDates, picksIds]);

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

        return lines.slice(0, 5).map((line) => String(line || "").replace(/\.$/, ""));
      })();

      return {
        gamesForList,
        moreCount,
        topDrama,
        stakeLines,
        dramaScores
      };
    }, [todayGames, currentStandings, pickCountsByBowl]);

    const todayTop5Breakdown = useMemo(() => {
      const topRows = (currentStandings.rows || []).slice(0, 5);
      const topCount = topRows.length;
      const sortedByTime = [...todayGames].sort((a, b) => {
        const aTime = a.__timeMinutes ?? 9999;
        const bTime = b.__timeMinutes ?? 9999;
        if (aTime !== bTime) return aTime - bTime;
        return String(a.Bowl || "").localeCompare(String(b.Bowl || ""));
      });

      const games = sortedByTime.map((g) => {
        const bowlKey = getBowlKey(g);
        const bowlName = getFirstValue(g, ["Bowl", "Bowl Name"]) || "Bowl Game";
        const awayId = normalizeId(getFirstValue(g, ["Away ID", "AwayID"]));
        const homeId = normalizeId(getFirstValue(g, ["Home ID", "HomeID"]));
        const awayTeam = awayId && teamById ? teamById[awayId] : null;
        const homeTeam = homeId && teamById ? teamById[homeId] : null;
        const awayLabel = formatTeamLabel(awayTeam, getFirstValue(g, ["Team 1"]));
        const homeLabel = formatTeamLabel(homeTeam, getFirstValue(g, ["Team 2"]));

        const homePickers = [];
        const awayPickers = [];
        topRows.forEach((row) => {
          const pickId = bowlKey ? normalizeId(row.rawPicksIds[bowlKey]) : "";
          if (!pickId) return;
          if (pickId === homeId) homePickers.push(row.name);
          else if (pickId === awayId) awayPickers.push(row.name);
        });

        const presentCount = homePickers.length + awayPickers.length;
        let statusLine = "";
        if (!presentCount) {
          statusLine = topCount ? `No Top ${topCount} picks yet.` : "No leaderboard data yet.";
        } else if (homePickers.length === presentCount) {
          statusLine = `Top ${presentCount} all picked ${homeLabel} 🧠`;
        } else if (awayPickers.length === presentCount) {
          statusLine = `Top ${presentCount} all picked ${awayLabel} 🧠`;
        }

        return {
          game: g,
          bowlName,
          homeLabel,
          awayLabel,
          homePickers,
          awayPickers,
          statusLine,
          topCount
        };
      });

      return {
        games,
        topCount
      };
    }, [todayGames, currentStandings, teamById]);

    const stakeNameData = useMemo(() => {
      const names = (currentStandings.rows || []).map((row) => row.name).filter(Boolean);
      if (!names.length) {
        return { names: [], nameSet: new Set(), regex: null };
      }
      const sorted = [...new Set(names)].sort((a, b) => b.length - a.length);
      const pattern = sorted.map(escapeRegExp).join("|");
      return {
        names: sorted,
        nameSet: new Set(sorted),
        regex: pattern ? new RegExp(`(${pattern})`, "g") : null
      };
    }, [currentStandings]);

    const renderStakeLine = (line) => {
      if (!stakeNameData.regex) return line;
      const parts = String(line || "").split(stakeNameData.regex);
      if (parts.length === 1) return line;
      return parts.map((part, idx) => (
        stakeNameData.nameSet.has(part)
          ? <span key={`${idx}-${part}`} className="font-semibold">{part}</span>
          : <span key={`${idx}-${part}`}>{part}</span>
      ));
    };

    const wrapTextLines = (ctx, text, maxWidth) => {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const lines = [];
      let cur = "";
      words.forEach((word) => {
        const next = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = next;
        }
      });
      if (cur) lines.push(cur);
      return lines.length ? lines : [""];
    };

    const roundedRectPath = (ctx, x, y, w, h, r) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    const drawTrackingText = (ctx, text, x, y, spacing) => {
      let cursor = x;
      String(text || "").split("").forEach((ch) => {
        ctx.fillText(ch, cursor, y);
        cursor += ctx.measureText(ch).width + spacing;
      });
    };

    const mixHex = (hex, mixHexColor, amount) => {
      const clamp = (v) => Math.max(0, Math.min(255, v));
      const toRgb = (h) => {
        const clean = String(h || "").replace("#", "");
        if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
        return {
          r: parseInt(clean.slice(0, 2), 16),
          g: parseInt(clean.slice(2, 4), 16),
          b: parseInt(clean.slice(4, 6), 16)
        };
      };
      const a = toRgb(hex);
      const b = toRgb(mixHexColor);
      const t = Math.max(0, Math.min(1, amount));
      const r = clamp(Math.round(a.r + (b.r - a.r) * t));
      const g = clamp(Math.round(a.g + (b.g - a.g) * t));
      const bVal = clamp(Math.round(a.b + (b.b - a.b) * t));
      return `rgb(${r}, ${g}, ${bVal})`;
    };

    const buildSections = (mode) => {
      const sections = [];
      if (mode === "yesterday") {
        const leadChangeLine = buildYesterdayRecap.leadChange === "No"
          ? "No movement at the top yesterday"
          : `Lead change: ${buildYesterdayRecap.leadChange}`;

        sections.push({
          title: "Standings Movers 📈",
          accent: BRAND_COLOR,
          lines: buildYesterdayRecap.completedCount === 0
            ? ["No games yesterday."]
            : [
              `Biggest Rise: ${buildYesterdayRecap.biggestRise ? `${buildYesterdayRecap.biggestRise.name} (+${buildYesterdayRecap.biggestRise.diff})` : "-"}`,
              `Biggest Drop: ${buildYesterdayRecap.biggestFall ? `${buildYesterdayRecap.biggestFall.name} (${buildYesterdayRecap.biggestFall.diff})` : "-"}`,
              leadChangeLine
            ]
        });
        sections.push({
          title: "Big Game of the Day 🎭",
          accent: buildYesterdayRecap.bigGameSummary ? buildYesterdayRecap.bigGameSummary.accent : BRAND_COLOR,
          lines: buildYesterdayRecap.completedCount === 0
            ? ["No games yesterday."]
            : buildYesterdayRecap.bigGameSummary
              ? [
                buildYesterdayRecap.bigGameSummary.bowlName,
                buildYesterdayRecap.bigGameSummary.scoreLine,
                buildYesterdayRecap.bigGameSummary.splitText
              ].filter(Boolean)
              : ["No big game found."]
        });
        sections.push({
          title: "Scoreboard Watching 🏈",
          accent: "#16a34a",
          lines: buildYesterdayRecap.completedCount === 0
            ? ["No games yesterday."]
            : scoreboardData.lines
        });
        const snapshotLines = (buildYesterdayRecap.standingsSnapshot.items || []).map((item) => {
          const rankText = formatRankLabel(item.rank);
          const scoreText = Number.isFinite(item.score) ? `${item.score} wins` : "-";
          let suffix = "";
          if (item.isLeader) {
            const leaderLabel = item.leaderCount > 1 ? "Co-Leader" : "Leader";
            suffix = ` (${leaderLabel})`;
          } else if (item.gb !== null && item.gb !== undefined) {
            suffix = ` (${item.gb} GB)`;
          }
          return `${rankText} ${item.name} — ${scoreText}${suffix}`;
        });

        sections.push({
          title: "Standings Snapshot 🥇",
          accent: "#fbbf24",
          lines: buildYesterdayRecap.completedCount === 0
            ? ["No games yesterday."]
            : [
              ...snapshotLines,
              buildYesterdayRecap.standingsSnapshot.spreadLine
            ].filter(Boolean)
        });
        const hotHands = buildYesterdayRecap.streakWatch.hotHands || [];
        const coldStreaks = buildYesterdayRecap.streakWatch.coldStreaks || [];
        const maxWinStreak = buildYesterdayRecap.streakWatch.maxWinStreak || 0;
        const maxMissStreak = buildYesterdayRecap.streakWatch.maxMissStreak || 0;
        const hotNames = hotHands.map((row) => row.name).join(" & ");
        const coldNames = coldStreaks.map((row) => row.name).join(" & ");
        const hotLine = hotHands.length && maxWinStreak >= 2
          ? `Hot Hand: ${hotNames} — ${maxWinStreak} straight wins 🔥`
          : "Hot Hand: no big streaks right now";
        const coldLine = coldStreaks.length && maxMissStreak >= 2
          ? `Ice Cold: ${coldNames} — ${maxMissStreak} straight losses 🧊`
          : "Ice Cold: nobody’s spiraling (yet)";

        sections.push({
          title: "Streak Watch 👀",
          accent: "#2563eb",
          lines: buildYesterdayRecap.completedCount === 0
            ? ["No games yesterday."]
            : [hotLine, coldLine]
        });
      } else {
        sections.push({
          title: "Games Today 📺",
          accent: "#16a34a",
          lines: todayGames.length === 0
            ? ["No games today."]
            : todayData.gamesForList.flatMap((g) => {
              const awayId = normalizeId(getFirstValue(g, ["Away ID", "AwayID"]));
              const homeId = normalizeId(getFirstValue(g, ["Home ID", "HomeID"]));
              const awayTeam = awayId && teamById ? teamById[awayId] : null;
              const homeTeam = homeId && teamById ? teamById[homeId] : null;
              const matchup = `${formatTeamLabel(awayTeam, getFirstValue(g, ["Team 1"]))} vs ${formatTeamLabel(homeTeam, getFirstValue(g, ["Team 2"]))}`;

              const timeLabel = getFirstValue(g, ["Time"]) || "TBD";
              const network = getFirstValue(g, ["Network", "TV"]) || "";
              const split = summarizePickSplit(g);
              const splitText = split ? `Pick Split: ${split.awayPct}% / ${split.homePct}%` : "Pick Split: n/a";
              const spreadVal = getFirstValue(g, ["Spread", "Line"]);
              const totalVal = getFirstValue(g, ["O/U", "Over/Under", "Total"]);
              const favoriteId = normalizeId(getFirstValue(g, ["Favorite ID", "FavoriteID"]));
              const favoriteTeam = favoriteId && teamById ? teamById[favoriteId] : null;
              const favoriteLabel = getTeamSchoolName(favoriteTeam, "Favorite");
              const oddsText = spreadVal || totalVal ? `${spreadVal ? `${favoriteLabel} ${spreadVal}` : ""}${spreadVal && totalVal ? " - " : ""}${totalVal ? `O/U ${totalVal}` : ""}` : "";

              return [
                `${timeLabel}${network ? ` - ${network}` : ""} - ${getFirstValue(g, ["Bowl", "Bowl Name"]) || "Bowl Game"}`,
                matchup,
                splitText,
                oddsText ? oddsText : null
              ].filter(Boolean);
            }).concat(todayData.moreCount > 0 ? [`+${todayData.moreCount} more games`] : [])
        });
        sections.push({
          title: "What's At Stake ⚡",
          accent: "#f97316",
          lines: todayData.stakeLines
        });
        sections.push({
          title: "Where the Top 5 Split 🍌",
          accent: "#fbbf24",
          lines: todayTop5Breakdown.games.length
            ? todayTop5Breakdown.games.flatMap((item) => {
              if (item.statusLine) {
                return [
                  item.bowlName,
                  item.statusLine
                ];
              }
              const homeNames = item.homePickers.length ? item.homePickers.join(", ") : "none";
              const awayNames = item.awayPickers.length ? item.awayPickers.join(", ") : "none";
              return [
                item.bowlName,
                `${item.homeLabel}: ${homeNames}`,
                `${item.awayLabel}: ${awayNames}`
              ];
            })
            : [todayTop5Breakdown.topCount ? `No games today.` : "No leaderboard data yet."]
        });
      }
      return sections;
    };

    const exportCanvasPoster = async (mode, filename) => {
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }

      const width = 1080;
      const height = 1920;
      const headerHeight = 320;
      const paddingX = 60;
      const cardGap = 26;
      const cardRadius = 34;
      const cardWidth = width - paddingX * 2;

      const scale = Math.min(2.5, Math.max(2, window.devicePixelRatio || 1));
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(0.5, "#0b1220");
      bg.addColorStop(1, "#111827");
      ctx.fillStyle = bg;
      roundedRectPath(ctx, 0, 0, width, height, 36);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      roundedRectPath(ctx, 24, 24, width - 48, height - 48, 32);
      ctx.stroke();

      const headerGrad = ctx.createLinearGradient(40, 40, width - 40, headerHeight);
      headerGrad.addColorStop(0, "#0b1220");
      headerGrad.addColorStop(0.6, "#111827");
      headerGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = headerGrad;
      roundedRectPath(ctx, 40, 40, width - 80, headerHeight - 40, 28);
      ctx.fill();

      const headerGlow = ctx.createRadialGradient(240, 140, 40, 240, 140, 300);
      headerGlow.addColorStop(0, "rgba(245,158,11,0.18)");
      headerGlow.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = headerGlow;
      roundedRectPath(ctx, 40, 40, width - 80, headerHeight - 40, 28);
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(40, headerHeight, width - 80, 6);

      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      const pillGrad = ctx.createLinearGradient(64, 64, 320, 92);
      pillGrad.addColorStop(0, "rgba(251,191,36,0.2)");
      pillGrad.addColorStop(1, "rgba(251,191,36,0.0)");
      ctx.fillStyle = pillGrad;
      const seasonLabel = "2025-26 SEASON";
      const seasonTextWidth = ctx.measureText(seasonLabel).width;
      const seasonPillWidth = Math.ceil(seasonTextWidth + 40);
      roundedRectPath(ctx, 64, 64, seasonPillWidth, 28, 14);
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "800 14px 'Chivo', sans-serif";
      drawTrackingText(ctx, seasonLabel, 80, 85, 4);

      const gold = ctx.createLinearGradient(72, 110, 360, 200);
      gold.addColorStop(0, "#fde68a");
      gold.addColorStop(0.45, "#fbbf24");
      gold.addColorStop(1, "#f59e0b");
      ctx.fillStyle = gold;
      ctx.font = "900 68px 'Patua One', serif";
      ctx.fillText("Roberts Cup", 72, 158);

      const subtitle = mode === "yesterday"
        ? `Daily Digest - ${formatDisplayDateNoYear(yesterdayKey)}`
        : `Today's Watch List - ${formatDisplayDateNoYear(todayKey)}`;
      const meta = "";

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 30px 'Chivo', sans-serif";
      ctx.fillText(subtitle, 72, 212);
      if (meta) {
        ctx.fillStyle = "#cbd5f1";
        ctx.font = "500 22px 'Chivo', sans-serif";
        ctx.fillText(meta, 72, 248);
      }

      const trophyPath = new Path2D("M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z");
      ctx.save();
      ctx.translate(width - 170, 90);
      ctx.scale(88 / 24, 88 / 24);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(251,191,36,0.45)";
      ctx.shadowBlur = 12;
      ctx.stroke(trophyPath);
      ctx.restore();

      let currentY = headerHeight + 40;
      const sections = buildSections(mode);
      ctx.font = "500 22px 'Chivo', sans-serif";

      sections.forEach((section) => {
        const titleX = paddingX + 22;
        const titleY = currentY + 48;
        const bodyStartY = currentY + 92;
        const maxWidth = cardWidth - 60;
        const lineHeight = 30;

        const wrappedLines = section.lines.flatMap((line) => wrapTextLines(ctx, line, maxWidth));
        const bodyHeight = wrappedLines.length * lineHeight;
        const cardHeight = Math.max(160, bodyHeight + 110);

        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,0.25)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = "#f8fafc";
        roundedRectPath(ctx, paddingX, currentY, cardWidth, cardHeight, cardRadius);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = section.accent || BRAND_COLOR;
        roundedRectPath(ctx, paddingX, currentY, 12, cardHeight, cardRadius);
        ctx.fill();
        ctx.fillStyle = mixHex(section.accent || BRAND_COLOR, "#ffffff", 0.35);
        roundedRectPath(ctx, paddingX + 8, currentY + 4, 4, cardHeight - 8, cardRadius);
        ctx.fill();

        const pillX = paddingX + 22;
        const pillY = currentY + 24;
        const pillW = Math.min(420, cardWidth - 44);
        const pillH = 44;
        const skew = -8 * Math.PI / 180;
        const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
        pillGrad.addColorStop(0, "#0f172a");
        pillGrad.addColorStop(1, "#111827");
        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,0.35)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;
        ctx.translate(pillX, pillY);
        ctx.transform(1, 0, Math.tan(skew), 1, 0, 0);
        ctx.fillStyle = pillGrad;
        roundedRectPath(ctx, 0, 0, pillW, pillH, 16);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "800 22px 'Chivo', sans-serif";
        ctx.fillText(section.title, titleX + 18, titleY);

        ctx.fillStyle = "#0f172a";
        ctx.font = "500 22px 'Chivo', sans-serif";
        wrappedLines.forEach((line, idx) => {
          ctx.fillText(line, paddingX + 30, bodyStartY + idx * lineHeight);
        });

        currentY += cardHeight + cardGap;
      });

      // footer removed

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
      height: "1920px"
    };

    const posterInnerStyle = isPosterOnly
      ? { transform: `scale(${posterScale})`, transformOrigin: "top left" }
      : null;

    const posterFrameStyle = isPosterOnly
      ? { width: `${1080 * posterScale}px`, height: `${1920 * posterScale}px` }
      : null;

    const renderCard = (title, accentColor, body) => (
      <div
        className="daily-section"
        style={{ borderLeft: `10px solid ${accentColor || "#f59e0b"}` }}
      >
        <div className="daily-cutout"></div>
        <div className="daily-banner">
          <div className="daily-banner-title">{title}</div>
        </div>
        <div className="daily-section-body">
          {body}
        </div>
      </div>
    );

    const renderEmptyLine = (text) => (
      <div className="text-xl text-slate-500">{text}</div>
    );

    const renderRankPill = (rank) => {
      const text = formatRankLabel(rank);
      if (rank === 1) return <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold text-sm whitespace-nowrap">{text}</span>;
      if (rank === 2) return <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-bold text-sm whitespace-nowrap">{text}</span>;
      if (rank === 3) return <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-sm whitespace-nowrap">{text}</span>;
      return <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm whitespace-nowrap">{text}</span>;
    };

    const showYesterdayPoster = !isPosterOnly || posterMode === "yesterday";
    const showTodayPoster = !isPosterOnly || posterMode === "today";

    return (
      <div className={isPosterOnly ? "poster-only min-h-screen bg-slate-900 flex items-start justify-center p-0 overflow-y-auto" : "min-h-screen bg-slate-100 pt-16 pb-16"}>
        <div className={isPosterOnly ? "" : "max-w-6xl mx-auto px-4"}>
          {!isPosterOnly && (
            <div className="mb-8 flex flex-col gap-4">
            <div>
              <div className="text-3xl font-serif text-slate-900">Daily Digest Export</div>
              <div className="text-slate-600">Hidden route for generating phone-friendly recap images.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow disabled:opacity-40"
                onClick={() => exportCanvasPoster("yesterday", `RobertsCup_Recap_${yesterdayKey}.png`)}
                disabled={!html2CanvasReady}
              >
                Download Yesterday PNG
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow disabled:opacity-40"
                onClick={() => exportCanvasPoster("today", `RobertsCup_Today_${todayKey}.png`)}
                disabled={!html2CanvasReady}
              >
                Download Today PNG
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold shadow"
                onClick={() => {
                  const base = `${window.location.origin}${window.location.pathname}`;
                  window.open(`${base}?poster=yesterday#daily`, "_blank", "noopener,noreferrer");
                }}
              >
                Open Yesterday Fullscreen
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold shadow"
                onClick={() => {
                  const base = `${window.location.origin}${window.location.pathname}`;
                  window.open(`${base}?poster=today#daily`, "_blank", "noopener,noreferrer");
                }}
              >
                Open Today Fullscreen
              </button>
              {!html2CanvasReady && (
                <span className="text-sm text-slate-500 self-center">Loading export tools...</span>
              )}
            </div>
          </div>
          )}

          <div className={isPosterOnly ? "flex items-center justify-center" : "flex flex-col gap-12 items-start"}>
            <style>{`
              .daily-poster {
                position: relative;
                background:
                  radial-gradient(circle at 15% 20%, rgba(14, 116, 144, 0.25), transparent 45%),
                  radial-gradient(circle at 85% 10%, rgba(245, 158, 11, 0.25), transparent 40%),
                  radial-gradient(circle at 20% 85%, rgba(30, 64, 175, 0.22), transparent 45%),
                  linear-gradient(135deg, #0f172a 0%, #111827 35%, #1f2937 100%);
                overflow: hidden;
              }
              .daily-poster::before {
                content: "";
                position: absolute;
                inset: 24px;
                border-radius: 36px;
                border: 2px solid rgba(248, 250, 252, 0.18);
                pointer-events: none;
              }
              .daily-poster::after {
                content: "";
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 10px);
                opacity: 0.4;
                pointer-events: none;
                mix-blend-mode: screen;
              }
              .daily-poster.exporting::after {
                opacity: 0;
              }
              .daily-glow {
                box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
              }
              .daily-header {
                position: relative;
                background: #0f172a;
                color: #f8fafc;
                border-bottom: 6px solid #f59e0b;
                overflow: hidden;
              }
              .daily-poster.exporting .daily-header {
                background: #0f172a;
              }
              .daily-header-orb {
                position: absolute;
                width: 320px;
                height: 320px;
                border-radius: 999px;
                filter: blur(50px);
                opacity: 0.6;
                pointer-events: none;
              }
              .daily-poster.exporting .daily-header-orb {
                opacity: 0.2;
                filter: none;
              }
              .daily-header-orb.left {
                background: rgba(59, 130, 246, 0.35);
                bottom: -160px;
                left: -120px;
              }
              .daily-header-orb.right {
                background: rgba(245, 158, 11, 0.35);
                top: -160px;
                right: -120px;
              }
              .daily-header-title {
                background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 45%, #f59e0b 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                text-shadow: 0 6px 22px rgba(15, 23, 42, 0.4);
              }
              .daily-badge {
                display: inline-block;
                align-self: flex-start;
                background: #1f2937;
                color: #fbbf24;
                border: 1px solid rgba(251, 191, 36, 0.35);
                padding: 4px 14px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 0.2em;
                text-transform: uppercase;
              }
              .daily-card {
                backdrop-filter: blur(6px);
              }
              .daily-poster.exporting .daily-card {
                backdrop-filter: none;
              }
              .daily-section {
                position: relative;
                background: rgba(255, 255, 255, 0.92);
                border-radius: 28px;
                padding: 24px 28px 28px;
                box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.7);
                overflow: hidden;
              }
              .daily-poster.exporting .daily-section {
                background: #ffffff !important;
                box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
              }
              .daily-section::after {
                content: "";
                position: absolute;
                right: -60px;
                top: -60px;
                width: 160px;
                height: 160px;
                border-radius: 50%;
                background: rgba(245, 158, 11, 0.15);
                filter: blur(4px);
              }
              .daily-poster.exporting .daily-section::after {
                opacity: 0.2;
                filter: none;
              }
              .daily-banner {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(120deg, #111827 0%, #1f2937 60%, #0f172a 100%);
                color: #f8fafc;
                padding: 10px 22px;
                border-radius: 18px;
                transform: skew(-8deg);
                box-shadow: 0 14px 28px rgba(15, 23, 42, 0.35);
                border: 1px solid rgba(248, 250, 252, 0.2);
              }
              .daily-poster.exporting .daily-banner {
                transform: none;
                background: #111827 !important;
              }
              .daily-banner-title {
                transform: skew(8deg);
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 0.04em;
              }
              .daily-poster.exporting .daily-banner-title {
                transform: none;
                color: #f8fafc !important;
                text-shadow: none;
              }
              .daily-cutout {
                position: absolute;
                left: -26px;
                bottom: -26px;
                width: 90px;
                height: 90px;
                border-radius: 20px;
                background: rgba(15, 23, 42, 0.08);
                transform: rotate(12deg);
              }
              .daily-section-body {
                margin-top: 18px;
              }
              .daily-poster.exporting .daily-section-body,
              .daily-poster.exporting .daily-section-body * {
                color: #0f172a !important;
                text-shadow: none;
              }
              .daily-divider {
                height: 2px;
                width: 140px;
                background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0));
              }
              .daily-fade-in {
                animation: dailyFade 0.8s ease-out both;
              }
              @keyframes dailyFade {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .poster-only .daily-header .daily-badge {
                font-size: 15.6px;
              }
              .poster-only .daily-header .text-5xl { font-size: 3.9rem; }
              .poster-only .daily-header .text-3xl { font-size: 2.4375rem; }
              .poster-only .daily-header .text-xl { font-size: 1.95rem; }
              .poster-only .daily-banner-title {
                font-size: 33.6px;
              }
              .poster-only .daily-section .text-2xl { font-size: 2.1rem; }
              .poster-only .daily-section .text-xl { font-size: 1.75rem; }
              .poster-only .daily-section .text-lg { font-size: 1.575rem; }
              .poster-only .daily-section .text-sm { font-size: 1.225rem; }
            `}</style>
            {showYesterdayPoster && (
              <div style={isPosterOnly ? posterFrameStyle : null}>
                <div ref={yesterdayPosterRef} style={isPosterOnly ? { ...posterStyle, ...posterInnerStyle } : posterStyle} className="daily-poster rounded-[36px] overflow-hidden daily-glow">
              <div className="h-full w-full flex flex-col p-12 gap-8 daily-fade-in">
                <div className="daily-header rounded-[32px] px-10 py-10 shadow-2xl">
                  <div className="daily-header-orb left"></div>
                  <div className="daily-header-orb right"></div>
                  <div className="relative z-10 flex items-center justify-between gap-8">
                    <div className="flex flex-col gap-3">
                      <div className="daily-badge">2025-26 Season</div>
                      <div className="text-5xl font-black tracking-tight daily-header-title">Roberts Cup</div>
                      <div className="text-3xl font-semibold">Yesterday's Recap - {formatDisplayDateNoYear(yesterdayKey)}</div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-20 rounded-full"></div>
                      <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.45)] relative z-10">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {renderCard(
                  "Standings Movers 📈",
                  "#ef4444",
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : (
                      <div className="flex flex-col gap-2 text-xl text-slate-700">
                        <div>
                          Biggest Rise:{" "}
                          {buildYesterdayRecap.biggestRise ? (
                            <>
                              <span className="font-semibold">{buildYesterdayRecap.biggestRise.name}</span>
                              {` (+${buildYesterdayRecap.biggestRise.diff})`}
                            </>
                          ) : "-"}
                        </div>
                        <div>
                          Biggest Drop:{" "}
                          {buildYesterdayRecap.biggestFall ? (
                            <>
                              <span className="font-semibold">{buildYesterdayRecap.biggestFall.name}</span>
                              {` (${buildYesterdayRecap.biggestFall.diff})`}
                            </>
                          ) : "-"}
                        </div>
                        <div>
                          {buildYesterdayRecap.leadChange === "No"
                            ? "No movement at the top yesterday"
                            : (() => {
                              const info = buildYesterdayRecap.leadChangeInfo || { type: "swap" };
                              if (info.type === "tie-join") {
                                return (
                                  <>
                                    <span>Lead Change: Tie at the Top — </span>
                                    {info.joiners.map((name, index) => (
                                      <span key={name} className="font-semibold">
                                        {name}{index < info.joiners.length - 1 ? " & " : ""}
                                      </span>
                                    ))}
                                    <span> joined </span>
                                    <span className="font-semibold">{info.leader}</span>
                                  </>
                                );
                              }
                              if (info.type === "tie") {
                                return (
                                  <>
                                    <span>Lead Change: Tie at the Top — </span>
                                    {(info.leaders || []).map((name, index) => (
                                      <span key={name} className="font-semibold">
                                        {name}{index < (info.leaders || []).length - 1 ? " & " : ""}
                                      </span>
                                    ))}
                                  </>
                                );
                              }
                              if (info.type === "solo") {
                                return (
                                  <>
                                    <span>Lead Change: Solo Leader — </span>
                                    <span className="font-semibold">{info.leader}</span>
                                  </>
                                );
                              }
                              return `Lead Change: ${buildYesterdayRecap.leadChange}`;
                            })()}
                        </div>
                      </div>
                    )
                )}

                {renderCard(
                  "Big Game of the Day 🎭",
                  buildYesterdayRecap.bigGameSummary ? buildYesterdayRecap.bigGameSummary.accent : BRAND_COLOR,
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : buildYesterdayRecap.bigGameSummary
                      ? (
                        <div className="flex flex-col gap-2 text-xl text-slate-700">
                          <div className="text-xl font-semibold text-slate-900">{buildYesterdayRecap.bigGameSummary.bowlName}</div>
                          <div>{buildYesterdayRecap.bigGameSummary.scoreLine}</div>
                          {buildYesterdayRecap.bigGameSummary.splitText ? (
                            <div>{buildYesterdayRecap.bigGameSummary.splitText}</div>
                          ) : null}
                        </div>
                      )
                      : renderEmptyLine("No big game found.")
                )}

                {renderCard(
                  "Scoreboard Watching 🏈",
                  "#16a34a",
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : (
                      <div className="flex flex-col gap-2 text-xl text-slate-700">
                        {(scoreboardData.lines || []).map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    )
                )}

                {renderCard(
                  "Standings Snapshot 🥇",
                  "#fbbf24",
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : (
                      <div className="flex flex-col gap-2 text-xl text-slate-700">
                        {(buildYesterdayRecap.standingsSnapshot.items || []).map((item) => {
                          const scoreText = Number.isFinite(item.score) ? `${item.score} wins` : "-";
                          let suffix = "";
                          if (item.isLeader) {
                            const leaderLabel = item.leaderCount > 1 ? "Co-Leader" : "Leader";
                            suffix = ` (${leaderLabel})`;
                          } else if (item.gb !== null && item.gb !== undefined) {
                            suffix = ` (${item.gb} GB)`;
                          }

                          return (
                            <div key={`${item.rank}-${item.name}`} className="flex items-center gap-3">
                              {renderRankPill(item.rank)}
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-semibold text-slate-900">{item.name}</span>
                                <span className="text-slate-700">— {scoreText}{suffix}</span>
                              </div>
                            </div>
                          );
                        })}
                        {buildYesterdayRecap.standingsSnapshot.spreadLine ? (
                          <div className="text-slate-600">{buildYesterdayRecap.standingsSnapshot.spreadLine}</div>
                        ) : null}
                      </div>
                    )
                )}

                {renderCard(
                  "Streak Watch 👀",
                  "#2563eb",
                  buildYesterdayRecap.completedCount === 0
                    ? renderEmptyLine("No games yesterday.")
                    : (() => {
                      const hotHands = buildYesterdayRecap.streakWatch.hotHands || [];
                      const coldStreaks = buildYesterdayRecap.streakWatch.coldStreaks || [];
                      const maxWinStreak = buildYesterdayRecap.streakWatch.maxWinStreak || 0;
                      const maxMissStreak = buildYesterdayRecap.streakWatch.maxMissStreak || 0;
                      const hotLine = hotHands.length && maxWinStreak >= 2
                        ? (
                          <div>
                            Hot hand:{" "}
                            <span className="font-semibold">
                              {hotHands.map((row) => row.name).join(" & ")}
                            </span>{" "}
                            — {maxWinStreak} straight wins 🔥
                          </div>
                        )
                        : <div>Hot hand: no big streaks right now</div>;
                      const coldLine = coldStreaks.length && maxMissStreak >= 2
                        ? (
                          <div>
                            Ice cold:{" "}
                            <span className="font-semibold">
                              {coldStreaks.map((row) => row.name).join(" & ")}
                            </span>{" "}
                            — {maxMissStreak} straight losses 🧊
                          </div>
                        )
                        : <div>Cold streak: nobody’s spiraling (yet)</div>;
                      return (
                        <div className="flex flex-col gap-2 text-xl text-slate-700">
                          {hotLine}
                          {coldLine}
                        </div>
                      );
                    })()
                )}

                <div className="mt-auto"></div>
              </div>
                </div>
              </div>
            )}

            {showTodayPoster && (
              <div style={isPosterOnly ? posterFrameStyle : null}>
                <div ref={todayPosterRef} style={isPosterOnly ? { ...posterStyle, ...posterInnerStyle } : posterStyle} className="daily-poster rounded-[36px] overflow-hidden daily-glow">
              <div className="h-full w-full flex flex-col p-12 gap-8 daily-fade-in">
                <div className="daily-header rounded-[32px] px-10 py-10 shadow-2xl">
                  <div className="daily-header-orb left"></div>
                  <div className="daily-header-orb right"></div>
                  <div className="relative z-10 flex items-center justify-between gap-8">
                    <div className="flex flex-col gap-3">
                      <div className="daily-badge">2025-26 Season</div>
                      <div className="text-5xl font-black tracking-tight daily-header-title">Roberts Cup</div>
                      <div className="text-3xl font-semibold">Today's Watch List - {formatDisplayDateNoYear(todayKey)}</div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-20 rounded-full"></div>
                      <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.45)] relative z-10">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {renderCard(
                  "Games Today 📺",
                  "#16a34a",
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
                          const splitText = split ? `Pick Split: ${split.awayPct}% / ${split.homePct}%` : "Pick Split: n/a";
                          const spreadVal = getFirstValue(g, ["Spread", "Line"]);
                          const totalVal = getFirstValue(g, ["O/U", "Over/Under", "Total"]);
                          const favoriteId = normalizeId(getFirstValue(g, ["Favorite ID", "FavoriteID"]));
                          const favoriteTeam = favoriteId && teamById ? teamById[favoriteId] : null;
                          const favoriteLabel = getTeamSchoolName(favoriteTeam, "Favorite");
                          const oddsText = spreadVal || totalVal ? `${spreadVal ? `${favoriteLabel} ${spreadVal}` : ""}${spreadVal && totalVal ? " - " : ""}${totalVal ? `O/U ${totalVal}` : ""}` : "";

                          return (
                            <div key={getBowlKey(g)} className="rounded-2xl border-2 border-amber-200/70 p-4 bg-white/90 shadow-xl">
                              <div className="text-slate-500 tracking-wide">{timeLabel}{network ? ` - ${network}` : ""}</div>
                              <div className="text-2xl font-semibold text-slate-900">{getFirstValue(g, ["Bowl", "Bowl Name"]) || "Bowl Game"}</div>
                              <div className="text-slate-700">{matchup}</div>
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
                  "What's At Stake ⚡",
                  "#f97316",
                  (
                    <div className="flex flex-col gap-2 text-xl text-slate-700">
                      {todayData.stakeLines.map((line, idx) => (
                        <div key={`${idx}-${line}`}>{renderStakeLine(line)}</div>
                      ))}
                    </div>
                  )
                )}

                {renderCard(
                  "Where the Top 5 Split 🍌",
                  "#fbbf24",
                  todayTop5Breakdown.games.length === 0
                    ? renderEmptyLine(todayTop5Breakdown.topCount ? "No games today." : "No leaderboard data yet.")
                    : (
                      <div className="flex flex-col gap-4 text-xl text-slate-700">
                        {todayTop5Breakdown.games.map((item, idx) => {
                          const homeNames = item.homePickers.length ? item.homePickers.join(", ") : "none";
                          const awayNames = item.awayPickers.length ? item.awayPickers.join(", ") : "none";
                          return (
                            <div key={`${getBowlKey(item.game) || "split"}-${idx}`} className="flex flex-col gap-1">
                              <div className="font-semibold text-slate-900">{item.bowlName}</div>
                              {item.statusLine ? (
                                <div className="text-slate-600">{item.statusLine}</div>
                              ) : (
                                <>
                                  <div className="text-slate-600">{item.homeLabel}: {homeNames}</div>
                                  <div className="text-slate-600">{item.awayLabel}: {awayNames}</div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                )}

                <div className="mt-auto"></div>
              </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  RC.pages.DailyPage = DailyPage;
})();
