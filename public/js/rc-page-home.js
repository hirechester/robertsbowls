/* Roberts Cup - Home Page (extracted from index.html)
   Loaded as: <script type="text/babel" src="js/rc-page-home.js"></script>
*/
(() => {
  const { useState, useEffect, useMemo } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  // Local aliases (so the moved code stays unchanged)

  // --- HOME PAGE ---
  const HomePage = () => {
            const [headlines, setHeadlines] = useState([]);
            const [slateGames, setSlateGames] = useState([]);
            const [loading, setLoading] = useState(true);
            const networkLogoMap = {
                ESPN: "images/networks/espn.png",
                ESPN2: "images/networks/espn2.png",
                FOX: "images/networks/fox.png",
                CBS: "images/networks/cbs.png",
                ABC: "images/networks/abc.png",
                "HBO MAX": "images/networks/max.png",
                MAX: "images/networks/max.png",
                "THE CW NETWORK": "images/networks/cw.png",
                "THE CW": "images/networks/cw.png",
                CW: "images/networks/cw.png",
            };
            const getNetworkLogo = (network) => {
                if (!network) return null;
                const key = network.trim().toUpperCase();
                return networkLogoMap[key] || null;
            };
            const normalizeId = (value) => {
                const s = String(value ?? "").trim();
                if (!s) return "";
                const n = parseInt(s, 10);
                return Number.isFinite(n) ? String(n) : s;
            };
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
            const getTeamLabel = (team, fallback) => {
                const school = pickFirst(team?.["School Name"], team?.School, team?.Team, team?.Name, fallback);
                const seedRaw = pickFirst(
                    team?.["Seed"], team?.["Team Seed"], team?.["Seed #"], team?.["Seed Number"], team?.["Playoff Seed"], team?.["CFP Seed"]
                );
                const rankRaw = pickFirst(
                    team?.["Ranking"], team?.["Rank"], team?.["AP Rank"], team?.["AP Ranking"], team?.["Rk"]
                );
                const seedNum = cleanNum(seedRaw);
                const rankNum = cleanNum(rankRaw);
                const prefix = seedNum ? `#${seedNum}` : (rankNum ? `#${rankNum}` : "");
                return { name: school || fallback || "-", prefix };
            };

            // Shared league data (fetched once per session by rc-data.js)
            const { appSettings, schedule: scheduleData, picks: picksData, picksIds: picksIdsData, teams: teamsData, teamById: teamByIdData, loading: dataLoading, error: dataError } = RC.data.useLeagueData();
            const seasonYear = useMemo(() => {
                const entry = appSettings && appSettings["season_year"];
                const raw = entry && (entry.value_int ?? entry.value_text);
                const parsed = parseInt(raw, 10);
                return Number.isFinite(parsed) ? parsed : null;
            }, [appSettings]);
            const seasonLabel = useMemo(() => {
                if (!seasonYear) return "Season";
                const endTwo = String(seasonYear).slice(-2);
                return `${seasonYear - 1}-${endTwo} Season`;
            }, [seasonYear]);
            const timeTravelerYear = seasonYear ? String(seasonYear) : "the future";
            const teamByIdMap = useMemo(() => {
                const map = new Map();
                (teamsData || []).forEach((team) => {
                    const id = normalizeId(team?.["Team ID"] ?? team?.["ID"] ?? team?.["Id"] ?? team?.Id);
                    if (id) map.set(id, team);
                });
                return map;
            }, [teamsData]);

            useEffect(() => {
                if (dataLoading) {
                    setLoading(true);
                    return;
                }
                if (dataError) {
                    console.error("HomePage: failed to load league data", dataError);
                    setLoading(false);
                    return;
                }
                    if (!scheduleData || !picksData) return;

                try {
                        const schedule = scheduleData;
                        const picks = picksData;
                        const picksIds = picksIdsData || [];
                        const teams = teamsData || [];

                        // 1. Process Schedule
                        const sortedSchedule = schedule
                            .filter(g => g.Date && g.Time)
                            .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                        const unplayedGames = sortedSchedule.filter(g => !g.Winner);
                        const playedGames = sortedSchedule.filter(g => g.Winner);
                        const lastQuarterCount = Math.max(1, Math.ceil(playedGames.length * 0.25));
                        const lastQuarterGames = playedGames.slice(-lastQuarterCount);
                        const lastQuarterBowls = new Set(lastQuarterGames.map(g => g.Bowl));
                        const getBowlKey = (g) => {
                            const bid = String(g["Bowl ID"] || "").trim();
                            return bid || String(g.Bowl || "").trim();
                        };
                        const truthy01 = (v) => {
                            const s = String(v ?? "").trim().toLowerCase();
                            return s === "1" || s === "true" || s === "yes" || s === "y" || s === "x";
                        };
                        const getFirstValue = (obj, keys) => {
                            if (!obj) return "";
                            for (const key of keys) {
                                const raw = obj[key];
                                const s = (raw === null || raw === undefined) ? "" : String(raw).trim();
                                if (s) return s;
                            }
                            return "";
                        };
                        const isCfpGame = (g) => truthy01(g["CFP?"] ?? g["CFP"] ?? g["Playoff"] ?? g["Playoff?"]);
                        const weightForGame = (g) => {
                            const raw = (g && g["Weight"] !== undefined) ? String(g["Weight"]).trim() : "";
                            const val = raw ? Number(raw) : 1;
                            return Number.isFinite(val) && val > 0 ? val : 1;
                        };

                        // 2. Identify "On The Slate" Games (Today & Tomorrow)
                        const today = new Date();
                        const tomorrow = new Date();
                        tomorrow.setDate(today.getDate() + 1);

                        const isMatch = (gameDateStr, targetDate) => {
                            const gd = new Date(gameDateStr);
                            return gd.getDate() === targetDate.getDate() &&
                                   gd.getMonth() === targetDate.getMonth() &&
                                   gd.getFullYear() === targetDate.getFullYear();
                        };

                        const slate = sortedSchedule.filter(g => {
                            const isToday = isMatch(g.Date, today);
                            const isTomorrow = isMatch(g.Date, tomorrow);
                            if (isToday) g.dayLabel = "TODAY";
                            if (isTomorrow) g.dayLabel = "TOMORROW";
                            return isToday || isTomorrow;
                        });
                        setSlateGames(slate);

                        // 3. Stats Calculation (Simulation)
                        const SIMULATIONS = 2000;
                        const playerSimWins = {};
                        picks.forEach(p => playerSimWins[p.Name] = 0);

                        for (let i = 0; i < SIMULATIONS; i++) {
                            const simOutcomes = {};
                            unplayedGames.forEach(g => {
                                simOutcomes[g.Bowl] = Math.random() < 0.5 ? g["Team 1"] : g["Team 2"];
                            });
                            let maxWins = -1;
                            const currentSimScores = {};
                            picks.forEach(player => {
                                let sWins = 0;
                                sortedSchedule.forEach(g => {
                                    const pick = player[g.Bowl];
                                    let winner = g.Winner || simOutcomes[g.Bowl];
                                    if (pick && winner && pick.toLowerCase() === winner.toLowerCase()) sWins++;
                                });
                                currentSimScores[player.Name] = sWins;
                                if (sWins > maxWins) maxWins = sWins;
                            });
                            picks.forEach(player => {
                                if (currentSimScores[player.Name] === maxWins) playerSimWins[player.Name]++;
                            });
                        }

                        const normalize = (value) => (value || "").toString().trim().toLowerCase();
                        const parseSpread = (value) => {
                            if (value === undefined || value === null) return NaN;
                            const cleaned = value.toString().replace(/[^\d.-]/g, "");
                            return parseFloat(cleaned);
                        };
                        const teamNameKey = (name) => normalize(name);
                        const confKey = (name) => normalize(name).replace(/\s+/g, " ");
                        const teamNameToConf = new Map();
                        teams.forEach((team) => {
                            const rawName = team["School"] || team.School || team["Team"] || team.Team || team["Name"] || team.Name;
                            const rawConf = team["Conference"] || team.Conference || team["Conf"] || team.Conf || team["League"] || team.League;
                            if (rawName && rawConf) {
                                teamNameToConf.set(teamNameKey(rawName), confKey(rawConf));
                            }
                        });

                        let stats = picks.map(player => {
                            let wins = 0; let losses = 0; let currentStreak = 0; let tempWinStreak = 0; let maxWinStreak = 0;
                            let earlyLosses = 0; let seenWin = false;
                            let favoritePicks = 0; let favoriteWins = 0; let upsetWins = 0;
                            let oneScoreTotal = 0; let oneScoreWins = 0;
                            let conferenceTotal = 0; let conferenceWins = 0;
                            let lateTotal = 0; let lateWins = 0;
                            sortedSchedule.forEach(game => {
                                const winner = game.Winner;
                                const pick = player[game.Bowl];
                                if (winner) {
                                    if (pick && pick.toLowerCase() === winner.toLowerCase()) {
                                        wins++;
                                        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
                                        tempWinStreak++;
                                        if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
                                    } else {
                                        losses++;
                                        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
                                        tempWinStreak = 0;
                                    }

                                    if (!seenWin && pick) {
                                        if (normalize(pick) === normalize(winner)) {
                                            seenWin = true;
                                        } else {
                                            earlyLosses++;
                                        }
                                    }

                                    const favorite = game.Favorite || game["Favorite"];
                                    if (favorite && pick) {
                                        if (normalize(pick) === normalize(favorite)) {
                                            favoritePicks++;
                                            if (normalize(winner) === normalize(favorite)) favoriteWins++;
                                        } else if (normalize(winner) === normalize(pick)) {
                                            upsetWins++;
                                        }
                                    }

                                    const spreadVal = parseSpread(game.Spread || game["Spread"]);
                                    if (Number.isFinite(spreadVal) && Math.abs(spreadVal) <= 3 && pick) {
                                        oneScoreTotal++;
                                        if (normalize(pick) === normalize(winner)) oneScoreWins++;
                                    }

                                    const t1Conf = teamNameToConf.get(teamNameKey(game["Team 1"]));
                                    const t2Conf = teamNameToConf.get(teamNameKey(game["Team 2"]));
                                    if (t1Conf && t2Conf && t1Conf === t2Conf && pick) {
                                        conferenceTotal++;
                                        if (normalize(pick) === normalize(winner)) conferenceWins++;
                                    }

                                    if (lastQuarterBowls.has(game.Bowl) && pick) {
                                        lateTotal++;
                                        if (normalize(pick) === normalize(winner)) lateWins++;
                                    }
                                }
                            });
                            const winProb = (playerSimWins[player.Name] / SIMULATIONS * 100);
                            return {
                                name: player.Name, wins, losses, currentStreak, maxWinStreak, winProb,
                                rawPicks: player, champPick: player["National Championship"], tiebreaker: parseInt(player["Tiebreaker Score"] || 0),
                                earlyLosses, favoritePicks, favoriteWins, upsetWins, oneScoreTotal, oneScoreWins,
                                conferenceTotal, conferenceWins, lateTotal, lateWins
                            };
                        });

                        stats.sort((a, b) => b.wins - a.wins);
                        const leader = stats[0];

                        // Calculate Swing Games for headlines
                        stats = stats.map(player => {
                            let swingGames = 0;
                            if (player.name !== leader.name) {
                                sortedSchedule.forEach(game => {
                                    if (!game.Winner) {
                                        const lp = leader.rawPicks[game.Bowl];
                                        const pp = player.rawPicks[game.Bowl];
                                        if (lp && pp && lp !== pp) swingGames++;
                                    }
                                });
                            }
                            return { ...player, swingGames };
                        });

                        // 4. Generate Dynamic Headlines
                        const dynamicPool = new Map();
                        const addHl = (key, data) => { if (!dynamicPool.has(key)) dynamicPool.set(key, data); };

                        // Simulation Odds HL
                        const highestProb = stats.reduce((prev, current) => (prev.winProb > current.winProb) ? prev : current);
                        if (highestProb && highestProb.winProb > 0) {
                            addHl("simulation", { Emoji: "🤖", Headline: "Simulation Says...", Content: `The supercomputer is crushing on ${highestProb.name}, giving them a ${highestProb.winProb.toFixed(1)}% chance to take the crown. Do you trust the machine?` });
                        }

                        // Streaks HL
                        const heaters = stats.filter(p => p.currentStreak > 3).sort((a,b) => b.currentStreak - a.currentStreak);
                        if (heaters.length > 0) {
                            addHl("heater", { Emoji: "🔥", Headline: "Heater Alert", Content: `${heaters[0].name} has rattled off ${heaters[0].currentStreak} straight wins. Someone get a fire extinguisher.` });
                        }

                        // Miracles HL
                        const miraclePlayer = stats.find(p => p.winProb > 0 && p.winProb < 1);
                        if (miraclePlayer) {
                            addHl("miracle", { Emoji: "🎰", Headline: "So You're Saying There's a Chance", Content: `${miraclePlayer.name} is holding onto a thread with a ${miraclePlayer.winProb.toFixed(1)}% win probability.` });
                        }

                        // Against the Grain HL
                        const rebel = stats.reduce((prev, current) => (prev.swingGames > current.swingGames) ? prev : current);
                        if (rebel && rebel.swingGames > 0) {
                            addHl("rebel", { Emoji: "🌾", Headline: "Against the Grain", Content: `${rebel.name} has ${rebel.swingGames} picks different from the leader in the remaining games. Playing their own game.` });
                        }

                        // Mirror HL
                        if (stats.length > 1 && (stats[0].wins - stats[1].wins) === 1) {
                            addHl("mirror", { Emoji: "👀", Headline: "Rearview Mirror", Content: `Objects in mirror are closer than they appear. ${stats[0].name} is clinging to a narrow 1-game lead over ${stats[1].name}.` });
                        }

                        // Tiebreaker HL
                        const moon = stats.reduce((prev, current) => (prev.tiebreaker > current.tiebreaker) ? prev : current);
                        if (moon && moon.tiebreaker > 0) {
                            addHl("moon", { Emoji: "🚀", Headline: "To The Moon", Content: `${moon.name} is predicting a massive ${moon.tiebreaker} points in the title game shootout.` });
                        }

                        // Cold Snap HL
                        const coldSnap = stats.filter(p => p.currentStreak <= -3).sort((a, b) => a.currentStreak - b.currentStreak);
                        if (coldSnap.length > 0) {
                            const streak = Math.abs(coldSnap[0].currentStreak);
                            addHl("coldSnap", { Emoji: "❄️", Headline: "Cold Snap", Content: `${coldSnap[0].name} has dropped ${streak} straight. The picks are frozen solid.` });
                        }

                        // Upset Magnet HL
                        const upsetMagnet = stats.reduce((prev, current) => (prev.upsetWins > current.upsetWins) ? prev : current);
                        if (upsetMagnet && upsetMagnet.upsetWins >= 2) {
                            addHl("upsetMagnet", { Emoji: "🧲", Headline: "Upset Magnet", Content: `${upsetMagnet.name} has the most underdog hits with ${upsetMagnet.upsetWins}. Chaos follows them.` });
                        }

                        // Fortress Favorites HL
                        const fortressCandidates = stats.filter(p => p.favoritePicks >= 5 && p.favoritePicks === p.favoriteWins)
                            .sort((a, b) => b.favoritePicks - a.favoritePicks);
                        if (fortressCandidates.length > 0) {
                            addHl("fortress", { Emoji: "🛡️", Headline: "Fortress Favorites", Content: `${fortressCandidates[0].name} is perfect when backing the chalk (${fortressCandidates[0].favoritePicks} for ${fortressCandidates[0].favoritePicks}).` });
                        }

                        // Fire Drill HL
                        if (leader) {
                            const closeCount = stats.filter(p => p.wins >= leader.wins - 2).length;
                            if (closeCount >= 4) {
                                addHl("fireDrill", { Emoji: "🧯", Headline: "Fire Drill", Content: `${closeCount} players are within two games of the lead. Chaos is one bowl away.` });
                            }
                        }

                        // Late-Blooming HL
                        const lateBloomers = stats.filter(p => p.currentStreak >= 3 && p.earlyLosses >= 3)
                            .sort((a, b) => b.currentStreak - a.currentStreak || b.earlyLosses - a.earlyLosses);
                        if (lateBloomers.length > 0) {
                            addHl("lateBlooming", { Emoji: "🛎️", Headline: "Late-Blooming", Content: `${lateBloomers[0].name} opened with ${lateBloomers[0].earlyLosses} straight misses but is now scorching hot.` });
                        }

                        // Ice in Veins HL
                        const clutchCandidates = stats.filter(p => p.oneScoreTotal >= 3)
                            .map(p => ({ ...p, oneScoreRate: p.oneScoreWins / p.oneScoreTotal }))
                            .sort((a, b) => b.oneScoreRate - a.oneScoreRate || b.oneScoreTotal - a.oneScoreTotal);
                        if (clutchCandidates.length > 0 && clutchCandidates[0].oneScoreRate > 0) {
                            addHl("iceVeins", { Emoji: "🧊", Headline: "Ice in Veins", Content: `${clutchCandidates[0].name} is ${Math.round(clutchCandidates[0].oneScoreRate * 100)}% in one-score games. Cold-blooded.` });
                        }

                        // Chess Match HL
                        if (stats.length > 1) {
                            const leaderPick = stats[0];
                            const runnerPick = stats[1];
                            let sameRemaining = 0;
                            sortedSchedule.forEach(game => {
                                if (!game.Winner) {
                                    const lp = leaderPick.rawPicks[game.Bowl];
                                    const rp = runnerPick.rawPicks[game.Bowl];
                                    if (lp && rp && normalize(lp) === normalize(rp)) sameRemaining++;
                                }
                            });
                            if (sameRemaining >= 4) {
                            addHl("chessMatch", { Emoji: "♟️", Headline: "Chess Match", Content: `${leaderPick.name} and ${runnerPick.name} match on ${sameRemaining} remaining picks. One bold move could decide it.` });
                            }
                        }

                        // Pick Split HL (future games only)
                        const upcomingSplits = [];
                        sortedSchedule.forEach(game => {
                            if (game.Winner) return;
                            const counts = new Map();
                            picks.forEach(player => {
                                const pick = player[game.Bowl];
                                if (!pick) return;
                                const key = normalize(pick);
                                const existing = counts.get(key);
                                if (existing) {
                                    existing.count += 1;
                                } else {
                                    counts.set(key, { count: 1, label: pick });
                                }
                            });
                            if (counts.size < 2) return;
                            const total = Array.from(counts.values()).reduce((sum, val) => sum + val.count, 0);
                            const sortedCounts = Array.from(counts.values()).sort((a, b) => b.count - a.count);
                            const top = sortedCounts[0];
                            const second = sortedCounts[1];
                            const diff = Math.abs(top.count - second.count);
                            const topPct = (top.count / total) * 100;
                            const secondPct = (second.count / total) * 100;
                            upcomingSplits.push({
                                bowl: game.Bowl,
                                topName: top.label,
                                secondName: second.label,
                                topPct,
                                secondPct,
                                diff
                            });
                        });
                        if (upcomingSplits.length > 0) {
                            upcomingSplits.sort((a, b) => a.diff - b.diff);
                            const split = upcomingSplits[0];
                            addHl("pickSplit", { Emoji: "🧭", Headline: "Pick Split", Content: `The room is split on ${split.bowl}: ${split.topName} ${Math.round(split.topPct)}% vs ${split.secondName} ${Math.round(split.secondPct)}%.` });
                        }

                        // Homework Pays HL
                        const conferencePerfect = stats.filter(p => p.conferenceTotal >= 2 && p.conferenceTotal === p.conferenceWins)
                            .sort((a, b) => b.conferenceTotal - a.conferenceTotal);
                        if (conferencePerfect.length > 0) {
                            addHl("homeworkPays", { Emoji: "📚", Headline: "Homework Pays", Content: `${conferencePerfect[0].name} is perfect in conference matchups (${conferencePerfect[0].conferenceWins} for ${conferencePerfect[0].conferenceTotal}).` });
                        }

                        // Tug of War HL
                        if (sortedSchedule.length > 0) {
                            const runningWins = {};
                            picks.forEach(player => { runningWins[player.Name] = 0; });
                            let lastLeaders = null;
                            let leaderFlips = 0;
                            sortedSchedule.forEach(game => {
                                if (!game.Winner) return;
                                picks.forEach(player => {
                                    const pick = player[game.Bowl];
                                    if (pick && normalize(pick) === normalize(game.Winner)) {
                                        runningWins[player.Name]++;
                                    }
                                });
                                const maxWins = Math.max(...Object.values(runningWins));
                                const leaders = Object.keys(runningWins).filter(name => runningWins[name] === maxWins).sort();
                                const leaderKey = leaders.join("|");
                                if (lastLeaders && leaderKey !== lastLeaders) leaderFlips++;
                                lastLeaders = leaderKey;
                            });
                            if (leaderFlips >= 2) {
                                addHl("tugOfWar", { Emoji: "🧵", Headline: "Tug of War", Content: `The lead has changed hands ${leaderFlips} times so far. Nobody can hold the rope.` });
                            }
                        }

                        // Panic Button HL
                        const unplayedGamesById = sortedSchedule.filter(g => !normalizeId(g["Winner ID"]));
                        const gamesLeft = unplayedGamesById.length;
                        let aliveCount = stats.filter(p => p.winProb > 0).length;
                        if (picksIds.length > 0) {
                            const alivePlayoffTeams = new Set();
                            const seedKeys = ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"];
                            const teamByIdSource = teamByIdData || {};
                            Object.keys(teamByIdSource).forEach(id => {
                                const team = teamByIdSource[id];
                                const seedVal = getFirstValue(team, seedKeys);
                                const normId = normalizeId(id);
                                if (normId && seedVal) alivePlayoffTeams.add(normId);
                            });
                            sortedSchedule.forEach(game => {
                                if (!isCfpGame(game)) return;
                                const winnerId = normalizeId(game["Winner ID"]);
                                if (!winnerId) return;
                                const homeId = normalizeId(game["Home ID"]);
                                const awayId = normalizeId(game["Away ID"]);
                                if (homeId && winnerId !== homeId) alivePlayoffTeams.delete(homeId);
                                if (awayId && winnerId !== awayId) alivePlayoffTeams.delete(awayId);
                            });

                            const isAlivePickForGame = (game, pickId) => {
                                if (!pickId) return false;
                                if (!isCfpGame(game)) return true;
                                return alivePlayoffTeams.has(pickId);
                            };

                            const eliminationStats = picksIds.map(playerIds => {
                                let wins = 0;
                                sortedSchedule.forEach(game => {
                                    const winnerId = normalizeId(game["Winner ID"]);
                                    if (!winnerId) return;
                                    const bowlKey = getBowlKey(game);
                                    const pickId = normalizeId(playerIds[bowlKey]);
                                    if (pickId && pickId === winnerId) wins += weightForGame(game);
                                });

                                const remainingWins = unplayedGamesById.reduce((acc, game) => {
                                    const bowlKey = getBowlKey(game);
                                    const pickId = normalizeId(playerIds[bowlKey]);
                                    return isAlivePickForGame(game, pickId) ? acc + weightForGame(game) : acc;
                                }, 0);
                                return {
                                    name: playerIds.Name,
                                    wins,
                                    maxPossibleWins: wins + remainingWins,
                                    rawPicksIds: playerIds
                                };
                            });

                            eliminationStats.sort((a, b) => b.wins - a.wins);
                            let currentRank = 1;
                            let aliveStatuses = 0;

                            for (let i = 0; i < eliminationStats.length; i++) {
                                if (i > 0 && eliminationStats[i].wins < eliminationStats[i - 1].wins) currentRank = i + 1;
                                let status = "alive";
                                if (currentRank === 1) {
                                    status = "leading";
                                } else {
                                    let maxOpponentWins = 0;
                                    eliminationStats.forEach(other => {
                                        if (other.name === eliminationStats[i].name) return;
                                        let scenarioWins = other.wins;
                                        unplayedGamesById.forEach(game => {
                                            const bowlKey = getBowlKey(game);
                                            const candidatePick = normalizeId(eliminationStats[i].rawPicksIds[bowlKey]);
                                            if (!isAlivePickForGame(game, candidatePick)) return;
                                            const otherPick = normalizeId(other.rawPicksIds[bowlKey]);
                                            if (otherPick && otherPick === candidatePick) scenarioWins += weightForGame(game);
                                        });
                                        if (scenarioWins > maxOpponentWins) maxOpponentWins = scenarioWins;
                                    });
                                    if (eliminationStats[i].maxPossibleWins < maxOpponentWins) status = "eliminated";
                                }
                                if (status === "leading" || status === "alive") aliveStatuses++;
                            }

                            aliveCount = aliveStatuses;
                        }
                        if (gamesLeft > 0 && aliveCount > 0) {
                            addHl("panicButton", { Emoji: "😱", Headline: "Panic Button", Content: `Only ${gamesLeft} games left and ${aliveCount} players still alive. Hold onto your sheet.` });
                        }

                        // Photo Finish HL
                        if (lastQuarterGames.length > 0) {
                            const lateLeaders = stats.filter(p => p.lateTotal > 0)
                                .sort((a, b) => b.lateWins - a.lateWins || b.wins - a.wins);
                            if (lateLeaders.length > 0 && lateLeaders[0].lateWins > 0) {
                                addHl("photoFinish", { Emoji: "🏁", Headline: "Photo Finish", Content: `${lateLeaders[0].name} leads the late stretch with ${lateLeaders[0].lateWins} wins in the last ${lastQuarterGames.length} games.` });
                            }
                        }

                        // Final Headlines Selection
                        const dynamicHls = Array.from(dynamicPool.values());
                        const shuffledDynamic = dynamicHls.sort(() => 0.5 - Math.random());
                        const shuffledStatic = [...STATIC_HEADLINES].sort(() => 0.5 - Math.random());

                        let finalHeadlines = [];
                        finalHeadlines.push(shuffledStatic[0]);
                        const dCount = Math.min(shuffledDynamic.length, 5);
                        finalHeadlines.push(...shuffledDynamic.slice(0, dCount));

                        if (finalHeadlines.length < 6) {
                            const needed = 6 - finalHeadlines.length;
                            finalHeadlines.push(...shuffledStatic.slice(1, 1 + needed));
                        }
                        finalHeadlines.sort(() => 0.5 - Math.random());

                        setHeadlines(finalHeadlines);
                        setLoading(false);
                } catch (error) {
                    console.error("HomePage: error building home data", error);
                    setLoading(false);
                }
            }, [dataLoading, dataError, scheduleData, picksData, picksIdsData, teamsData, teamByIdData]);

            // Static Bank
            const STATIC_HEADLINES = [
                { type: "STATIC", Emoji: "👮‍♂️", Headline: "League Office Update", Content: "The Commissioner has issued a formal warning: trash talk is mandatory, accuracy is optional." },
                { type: "STATIC", Emoji: "📉", Headline: "Market Crash", Content: "Confidence points are plummeting faster than crypto. Who bet the house on that 6-6 MAC team?" },
                { type: "STATIC", Emoji: "🦃", Headline: "Family Feud", Content: "Thanksgiving was weeks ago, but the real family drama is happening on the leaderboard right now." },
                { type: "STATIC", Emoji: "🥶", Headline: "Ice Cold", Content: "A chilly wind blows through the bottom of the standings. Better bundle up, it's freezing down there." },
                { type: "STATIC", Emoji: "👀", Headline: "Sleeping Giant", Content: "They started slow, but the analytics (and their ego) say a comeback is statistically probable." },
                { type: "STATIC", Emoji: "🥔", Headline: "Bowl SZN", Content: "Nothing says 'Happy Holidays' like sweating out a meaningless 4th quarter in the Famous Idaho Potato Bowl." },
                { type: "STATIC", Emoji: "📊", Headline: "The Analytics", Content: "The numbers don't lie, but they might hurt your feelings. Check the probability charts if you dare." },
                { type: "STATIC", Emoji: "👑", Headline: "Heavy is the Head", Content: "The leader looks comfortable, but the chasing pack is hungry. Can they hold the Iron Throne?" },
                { type: "STATIC", Emoji: "🤔", Headline: "Questionable Call", Content: "That pick was... bold. Let's see if it pays off big or ends in total, hilarious tragedy." },
                { type: "STATIC", Emoji: "🚑", Headline: "Critical Condition", Content: "The elimination line is creeping closer. Time to make a move or start planning your concession speech." },
                { type: "STATIC", Emoji: "🎲", Headline: "Rolling the Dice", Content: "High risk, high reward. Someone is swinging for the fences while everyone else plays it safe." },
                { type: "STATIC", Emoji: "📺", Headline: "Glued to the Screen", Content: "4 games, 3 screens, 1 champion. The remote control is the true MVP of the Roberts Cup." },
                { type: "STATIC", Emoji: "💔", Headline: "Heartbreaker", Content: "That sure-thing lock just lost on a last-second field goal. There goes the perfect weekend." },
                { type: "STATIC", Emoji: "📈", Headline: "Stock Rising", Content: "Moving up the leaderboard like a rocket. The dark horse has officially entered the chat." },
                { type: "STATIC", Emoji: "🔮", Headline: "Crystal Ball", Content: `Predicted the upset perfectly. Are they a football genius or a time traveler from ${timeTravelerYear}?` },
                { type: "STATIC", Emoji: "🧂", Headline: "Salty", Content: "The group chat is getting spicy. Rivalries are heating up as the games wind down." },
                { type: "STATIC", Emoji: "🏆", Headline: "Eye on the Prize", Content: "The Roberts Cup is gleaming. Polish your shelf, or prepare your excuses." },
                { type: "STATIC", Emoji: "🏹", Headline: "Chaos Theory", Content: "Absolute mayhem in the late games. No lead is safe when the Pac-12 (RIP) plays after dark." },
                { type: "STATIC", Emoji: "🐢", Headline: "Slow and Steady", Content: "Picking favorites might be boring, but it might just win the race. Don't be a hero." },
                { type: "STATIC", Emoji: "🦁", Headline: "King of the Jungle", Content: "A dominant performance so far. Is this the start of a dynasty, or a fluke?" },
                { type: "STATIC", Emoji: "🏚️", Headline: "Rebuilding Year", Content: "\"I'm just playing for fun this year.\" — Every loser, ever." },
                { type: "STATIC", Emoji: "⚡", Headline: "Shock the World", Content: "The pick nobody saw coming just cashed. The standings are in shambles." },
                { type: "STATIC", Emoji: "🎯", Headline: "Bullseye", Content: "Precision picking. While others panic, the leader stays cool under pressure." },
                { type: "STATIC", Emoji: "📉", Headline: "Fading Fast", Content: "Started strong, now fading down the stretch. Can they stop the bleeding before it's too late?" },
                { type: "STATIC", Emoji: "🍿", Headline: "Get the Popcorn", Content: "The tiebreaker scenarios are getting wild. We might need a NASA supercomputer for this finish." }
            ];

            if (loading) return <LoadingSpinner text="Loading your home experience..." />;

            return (
                <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                    {/* Grand Header */}
                    <div className="bg-slate-900 text-white p-8 md:p-12 rounded-b-3xl shadow-2xl mb-8 relative overflow-hidden border-b-4 border-yellow-500 pb-16">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-yellow-500/20 to-amber-600/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                            <div>
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                                    <span className="bg-slate-800 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30 uppercase tracking-widest shadow-sm">
                                        {seasonLabel}
                                    </span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black mb-2 tracking-tight">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 drop-shadow-sm">
                                        Roberts Cup
                                    </span>
                                </h1>
                                <p className="text-slate-400 text-lg font-medium">The quest for family glory begins.</p>
                            </div>

                            <div className="relative mt-2 md:mt-0 group">
                                <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-10 rounded-full group-hover:opacity-20 transition-opacity duration-700"></div>
                                <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.4)] relative z-10">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Top Headlines Section */}
                    <div className="px-4 max-w-4xl mx-auto w-full relative z-20 pb-8">
                        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-4 ml-1">Top Headlines</h2>
                         <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {headlines.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-1 p-5 hover:bg-blue-50/30 transition-colors group">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl flex-shrink-0">{item.Emoji}</span>
                                            <h4 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-900 transition-colors">{item.Headline}</h4>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">{item.Content}</p>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>

                    {/* On The Slate Section */}
                    <div className="px-4 max-w-4xl mx-auto w-full relative z-20 pb-12">
                        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-4 ml-1">On The Slate</h2>
                        {slateGames.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {slateGames.map((game, idx) => {
                                    const logoSrc = getNetworkLogo(game.Network);
                                    const homeId = normalizeId(game["Home ID"]);
                                    const awayId = normalizeId(game["Away ID"]);
                                    const homeLabel = getTeamLabel(teamByIdMap.get(homeId), game["Team 1"]);
                                    const awayLabel = getTeamLabel(teamByIdMap.get(awayId), game["Team 2"]);
                                    return (
                                    <div key={idx} className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 flex flex-col justify-between hover:shadow-2xl transition-shadow group">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                {game.dayLabel === "TODAY" ? (
                                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                                        TODAY
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        TOMORROW
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {game.Date}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <div className="text-lg font-black text-gray-800 leading-tight">
                                                    <span className="inline-flex items-baseline">
                                                        {homeLabel.prefix ? (
                                                            <span className="text-xs font-semibold text-gray-400 mr-1">{homeLabel.prefix}</span>
                                                        ) : null}
                                                        <span>{homeLabel.name}</span>
                                                    </span>
                                                    <span className="text-gray-300 font-normal mx-1">vs</span>
                                                    <span className="inline-flex items-baseline">
                                                        {awayLabel.prefix ? (
                                                            <span className="text-xs font-semibold text-gray-400 mr-1">{awayLabel.prefix}</span>
                                                        ) : null}
                                                        <span>{awayLabel.name}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {game.Bowl}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-bold">{game.Time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <img
                                                    src={logoSrc}
                                                    alt={`${game.Network} logo`}
                                                    className="h-4 w-auto object-contain"
                                                    loading="lazy"
                                                />
                                                <span className="sr-only">{game.Network}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                                <p className="text-gray-500 font-medium">
                                    No games found in the next two days. <br />
                                    <span className="text-sm font-normal">Check the Picks page for the next available matchup.</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

  // Export
  RC.pages.HomePage = HomePage;
})();
