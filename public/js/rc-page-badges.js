(() => {
  const { useState, useEffect, useMemo } = React;
  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;
  const { SCHEDULE_URL, PICKS_URL, HISTORY_URL, csvToJson } = RC;

// 4. BADGES PAGE (New)
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
            const { schedule, picks, history, loading, error, refresh } = RC.data.useLeagueData();
            const [badges, setBadges] = useState([]);

            // Theme palette for random assignment
            const THEMES = useMemo(() => [
                { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
                { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
                { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
                { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
                { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
                { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
            ], []);
            useEffect(() => {
                // Badges are computed from shared league data (loaded once in rc-data.js).
                if (loading || error) return;
                if (!Array.isArray(schedule) || !Array.isArray(picks) || !Array.isArray(history)) return;
                try {
                const calculatedBadges = [];
                
                // ----------------------------------------------------
                // BADGE 1: NIGHT OWL
                // Most wins in games starting 7 PM or later
                // ----------------------------------------------------
                try {
                    const nightGames = schedule.filter(g => {
                        if (!g.Winner || !g.Time) return false;
                        const timeStr = g.Time.trim().toUpperCase();
                        let [timePart, modifier] = timeStr.split(' ');
                        if (!modifier) {
                            if (timeStr.includes('PM')) { modifier = 'PM'; timePart = timeStr.replace('PM',''); }
                            else if (timeStr.includes('AM')) { modifier = 'AM'; timePart = timeStr.replace('AM',''); }
                        }
                        let [hours, minutes] = timePart.split(':').map(Number);
                        if (modifier === 'PM' && hours !== 12) hours += 12;
                        if (modifier === 'AM' && hours === 12) hours = 0;
                        return hours >= 19;
                    });
                
                    if (nightGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                        nightGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) playerWins[p.Name]++;
                            });
                        });
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                        calculatedBadges.push({
                            emoji: "🦉",
                            title: "Night Owl",
                            winners: winners,
                            description: `Thrives in the dark. Most wins (${maxWins}) in games starting 7 PM or later.`,
                            colorTheme: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🦉",
                            title: "Night Owl",
                            winners: [],
                            description: "Thrives in the dark. Most wins in games starting 7 PM or later.",
                            colorTheme: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" }
                        });
                    }
                } catch (e) { console.error("Night Owl Error", e); }
                
                // ----------------------------------------------------
                // BADGE 2: EARLY RISER
                // Most wins in games starting 2 PM (14:00) or earlier
                // ----------------------------------------------------
                try {
                    const earlyGames = schedule.filter(g => {
                        if (!g.Winner || !g.Time) return false;
                        const timeStr = g.Time.trim().toUpperCase();
                        let [timePart, modifier] = timeStr.split(' ');
                        if (!modifier) {
                            if (timeStr.includes('PM')) { modifier = 'PM'; timePart = timeStr.replace('PM',''); }
                            else if (timeStr.includes('AM')) { modifier = 'AM'; timePart = timeStr.replace('AM',''); }
                        }
                        let [hours, minutes] = timePart.split(':').map(Number);
                        if (modifier === 'PM' && hours !== 12) hours += 12;
                        if (modifier === 'AM' && hours === 12) hours = 0;
                
                        // 14:00 is 2 PM
                        return (hours < 14) || (hours === 14 && minutes === 0);
                    });
                
                    if (earlyGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                        earlyGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) playerWins[p.Name]++;
                            });
                        });
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                        calculatedBadges.push({
                            emoji: "🌅",
                            title: "Early Riser",
                            winners: winners,
                            description: `Catches the worm. Most wins (${maxWins}) in games starting 2 PM or earlier.`,
                            colorTheme: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🌅",
                            title: "Early Riser",
                            winners: [],
                            description: "Catches the worm. Most wins in games starting 2 PM or earlier.",
                            colorTheme: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" }
                        });
                    }
                } catch (e) { console.error("Early Riser Error", e); }
                
                // ----------------------------------------------------
                // BADGE 3: THE TWINS
                // Longest streak of identical picks between 2 players
                // ----------------------------------------------------
                try {
                    // 1. Sort Schedule Chronologically
                    const chronoSchedule = schedule
                        .filter(g => g.Date && g.Time)
                        .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                
                    let maxTwinStreak = 0;
                    let twinWinners = []; // Array of strings like "Alice & Bob"
                    const playerNames = picks.map(p => p.Name);
                
                    // 2. Iterate all unique pairs
                    for (let i = 0; i < playerNames.length; i++) {
                        for (let j = i + 1; j < playerNames.length; j++) {
                            const p1 = playerNames[i];
                            const p2 = playerNames[j];
                            const p1Picks = picks.find(p => p.Name === p1);
                            const p2Picks = picks.find(p => p.Name === p2);
                
                            let currentStreak = 0;
                            let pairMax = 0;
                
                            chronoSchedule.forEach(game => {
                                const pick1 = p1Picks[game.Bowl];
                                const pick2 = p2Picks[game.Bowl];
                
                                // Check if both made a pick and they are identical (case-insensitive)
                                if (pick1 && pick2 && pick1.trim().toLowerCase() === pick2.trim().toLowerCase()) {
                                    currentStreak++;
                                } else {
                                    if (currentStreak > pairMax) pairMax = currentStreak;
                                    currentStreak = 0;
                                }
                            });
                            // Final check
                            if (currentStreak > pairMax) pairMax = currentStreak;
                
                            // Update global stats
                            if (pairMax > maxTwinStreak) {
                                maxTwinStreak = pairMax;
                                twinWinners = [`${p1} & ${p2}`];
                            } else if (pairMax === maxTwinStreak && pairMax > 0) {
                                twinWinners.push(`${p1} & ${p2}`);
                            }
                        }
                    }
                
                    calculatedBadges.push({
                        emoji: "👯",
                        title: "The Twins",
                        winners: twinWinners.length > 0 ? twinWinners : [],
                        description: `In sync. Longest streak of identical picks (${maxTwinStreak > 0 ? maxTwinStreak : 0} games).`,
                        colorTheme: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" }
                    });
                
                } catch (e) {
                    console.error("The Twins Error", e);
                    calculatedBadges.push({
                        emoji: "👯",
                        title: "The Twins",
                        winners: [],
                        description: "In sync. Longest streak of identical picks.",
                        colorTheme: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 4: THE JINX
                // Most shared losses on identical picks between 2 players
                // ----------------------------------------------------
                try {
                     let maxSharedLosses = 0;
                     let jinxWinners = [];
                     const playerNames = picks.map(p => p.Name);
                
                     // Iterate all unique pairs
                     for (let i = 0; i < playerNames.length; i++) {
                         for (let j = i + 1; j < playerNames.length; j++) {
                             const p1 = playerNames[i];
                             const p2 = playerNames[j];
                             const p1Picks = picks.find(p => p.Name === p1);
                             const p2Picks = picks.find(p => p.Name === p2);
                
                             let currentSharedLosses = 0;
                
                             schedule.forEach(game => {
                                 // Only count if game is finished
                                 if (!game.Winner) return;
                
                                 const pick1 = p1Picks[game.Bowl];
                                 const pick2 = p2Picks[game.Bowl];
                                 const winner = game.Winner;
                
                                 // Check if identical picks and both lost
                                 if (pick1 && pick2 &&
                                     pick1.trim().toLowerCase() === pick2.trim().toLowerCase() &&
                                     pick1.trim().toLowerCase() !== winner.trim().toLowerCase()) {
                                     currentSharedLosses++;
                                 }
                             });
                
                             if (currentSharedLosses > maxSharedLosses) {
                                 maxSharedLosses = currentSharedLosses;
                                 jinxWinners = [`${p1} & ${p2}`];
                             } else if (currentSharedLosses === maxSharedLosses && maxSharedLosses > 0) {
                                 jinxWinners.push(`${p1} & ${p2}`);
                             }
                         }
                     }
                
                     calculatedBadges.push({
                         emoji: "🐈‍⬛",
                         title: "The Jinx",
                         winners: jinxWinners.length > 0 ? jinxWinners : [],
                         description: `Misery loves company. Most shared losses on identical picks (${maxSharedLosses} games).`,
                         colorTheme: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-400" }
                     });
                
                } catch (e) {
                    console.error("The Jinx Error", e);
                    calculatedBadges.push({
                         emoji: "🐈‍⬛",
                         title: "The Jinx",
                         winners: [],
                         description: "Misery loves company. Most shared losses on identical picks.",
                         colorTheme: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-400" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 5: THE HEATER
                // Longest winning streak of the season
                // ----------------------------------------------------
                try {
                    // Get strictly chronological completed games
                    const completedSchedule = schedule
                        .filter(g => g.Date && g.Time && g.Winner)
                        .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                
                    let globalMaxStreak = 0;
                    const playerMaxStreaks = {}; // name -> maxStreak
                
                    picks.forEach(player => {
                        let currentStreak = 0;
                        let maxStreak = 0;
                
                        completedSchedule.forEach(game => {
                            const pick = player[game.Bowl];
                            const winner = game.Winner;
                
                            if (pick && pick.toLowerCase() === winner.toLowerCase()) {
                                currentStreak++;
                            } else {
                                // Streak broken
                                if (currentStreak > maxStreak) maxStreak = currentStreak;
                                currentStreak = 0;
                            }
                        });
                        // Check if streak was active at the end
                        if (currentStreak > maxStreak) maxStreak = currentStreak;
                
                        playerMaxStreaks[player.Name] = maxStreak;
                        if (maxStreak > globalMaxStreak) globalMaxStreak = maxStreak;
                    });
                
                    const winners = Object.keys(playerMaxStreaks).filter(name => playerMaxStreaks[name] === globalMaxStreak && globalMaxStreak > 0);
                
                    calculatedBadges.push({
                        emoji: "🔥",
                        title: "The Heater",
                        winners: winners.length > 0 ? winners : [],
                        description: `Can't miss. Longest winning streak of the season (${globalMaxStreak} games).`,
                        colorTheme: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" }
                    });
                
                } catch (e) {
                    console.error("The Heater Error", e);
                    calculatedBadges.push({
                        emoji: "🔥",
                        title: "The Heater",
                        winners: [],
                        description: "Can't miss. Longest winning streak of the season.",
                        colorTheme: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 6: B1G WINNER
                // Most wins in B1G designated games
                // ----------------------------------------------------
                try {
                    const bigTenGames = schedule.filter(g => g.Winner && g['B1G']);
                
                    if (bigTenGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                
                        bigTenGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    playerWins[p.Name]++;
                                }
                            });
                        });
                
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                
                        calculatedBadges.push({
                            emoji: "🌰",
                            title: "B1G Winner",
                            winners: winners,
                            description: `Dominating the conference. Most wins (${maxWins}) in Big Ten matchups.`,
                            colorTheme: { bg: "bg-[#ba0c2f]/10", text: "text-[#ba0c2f]", border: "border-[#ba0c2f]/30" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🌰",
                            title: "B1G Winner",
                            winners: [],
                            description: "Dominating the conference. Most wins in Big Ten matchups.",
                            colorTheme: { bg: "bg-[#ba0c2f]/10", text: "text-[#ba0c2f]", border: "border-[#ba0c2f]/30" }
                        });
                    }
                } catch (e) {
                    console.error("B1G Winner Error", e);
                    calculatedBadges.push({
                        emoji: "🌰",
                        title: "B1G Winner",
                        winners: [],
                        description: "Dominating the conference. Most wins in Big Ten matchups.",
                        colorTheme: { bg: "bg-[#ba0c2f]/10", text: "text-[#ba0c2f]", border: "border-[#ba0c2f]/30" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 7: IT JUST MEANS MORE (SEC)
                // Most wins in SEC designated games
                // ----------------------------------------------------
                try {
                    const secGames = schedule.filter(g => g.Winner && g['SEC']);
                
                    if (secGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                
                        secGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    playerWins[p.Name]++;
                                }
                            });
                        });
                
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                
                        calculatedBadges.push({
                            emoji: "🐶",
                            title: "It Just Means More",
                            winners: winners,
                            description: `SEC supremacy. Most wins (${maxWins}) in SEC matchups.`,
                            colorTheme: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🐶",
                            title: "It Just Means More",
                            winners: [],
                            description: "SEC supremacy. Most wins in SEC matchups.",
                            colorTheme: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" }
                        });
                    }
                } catch (e) {
                    console.error("SEC Winner Error", e);
                    calculatedBadges.push({
                        emoji: "🐶",
                        title: "It Just Means More",
                        winners: [],
                        description: "SEC supremacy. Most wins in SEC matchups.",
                        colorTheme: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 8: THE SHEEP
                // Player that most often follows the herd
                // ----------------------------------------------------
                try {
                    const sheepScores = {};
                    picks.forEach(p => sheepScores[p.Name] = 0);
                
                    schedule.forEach(game => {
                        // 1. Tally picks for this game
                        const counts = {};
                        picks.forEach(p => {
                            const pick = p[game.Bowl];
                            if (pick) {
                                const normPick = pick.trim();
                                counts[normPick] = (counts[normPick] || 0) + 1;
                            }
                        });
                
                        // 2. Find Majority
                        let maxCount = 0;
                        let majorityPick = null;
                        let isTie = false;
                
                        Object.entries(counts).forEach(([pick, count]) => {
                            if (count > maxCount) {
                                maxCount = count;
                                majorityPick = pick;
                                isTie = false;
                            } else if (count === maxCount) {
                                isTie = true;
                            }
                        });
                
                        // 3. Award points if player picked majority
                        if (majorityPick && !isTie) {
                            picks.forEach(p => {
                                const pick = p[game.Bowl];
                                if (pick && pick.trim() === majorityPick) {
                                    sheepScores[p.Name]++;
                                }
                            });
                        }
                    });
                
                    let maxSheepScore = -1;
                    Object.values(sheepScores).forEach(s => { if (s > maxSheepScore) maxSheepScore = s; });
                
                    let winners = maxSheepScore > 0 ? Object.keys(sheepScores).filter(n => sheepScores[n] === maxSheepScore) : [];
                
                    calculatedBadges.push({
                        emoji: "🐑",
                        title: "The Sheep",
                        winners: winners,
                        description: `Baaaaa. Followed the group majority in ${maxSheepScore} games.`,
                        colorTheme: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" }
                    });
                
                } catch (e) {
                    console.error("The Sheep Error", e);
                    calculatedBadges.push({
                        emoji: "🐑",
                        title: "The Sheep",
                        winners: [],
                        description: "Baaaaa. Follows the group majority most often.",
                        colorTheme: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 9: SUB-ZERO
                // Longest losing streak of the season
                // ----------------------------------------------------
                try {
                    // Reuse completedSchedule from "The Heater" logic if scope allows, otherwise redefine
                    const completedSchedule = schedule
                        .filter(g => g.Date && g.Time && g.Winner)
                        .sort((a, b) => new Date(`${a.Date} ${a.Time}`) - new Date(`${b.Date} ${b.Time}`));
                
                    let globalMaxLosingStreak = 0;
                    const playerMaxLossStreaks = {};
                
                    picks.forEach(player => {
                        let currentStreak = 0;
                        let maxStreak = 0;
                
                        completedSchedule.forEach(game => {
                            const pick = player[game.Bowl];
                            const winner = game.Winner;
                
                            // If pick exists and matches winner -> WIN. Anything else (wrong pick or no pick) -> LOSS
                            if (pick && pick.toLowerCase() === winner.toLowerCase()) {
                                // Win breaks the losing streak
                                if (currentStreak > maxStreak) maxStreak = currentStreak;
                                currentStreak = 0;
                            } else {
                                // Loss increments the losing streak
                                currentStreak++;
                            }
                        });
                        // Check active streak at end
                        if (currentStreak > maxStreak) maxStreak = currentStreak;
                
                        playerMaxLossStreaks[player.Name] = maxStreak;
                        if (maxStreak > globalMaxLosingStreak) globalMaxLosingStreak = maxStreak;
                    });
                
                    const winners = Object.keys(playerMaxLossStreaks).filter(name => playerMaxLossStreaks[name] === globalMaxLosingStreak && globalMaxLosingStreak > 0);
                
                    calculatedBadges.push({
                        emoji: "🥶",
                        title: "Sub-Zero",
                        winners: winners.length > 0 ? winners : [],
                        description: `Ice cold. Longest losing streak of the season (${globalMaxLosingStreak} games).`,
                        colorTheme: { bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" }
                    });
                
                } catch (e) {
                    console.error("Sub-Zero Error", e);
                    calculatedBadges.push({
                        emoji: "🥶",
                        title: "Sub-Zero",
                        winners: [],
                        description: "Ice cold. Longest losing streak of the season.",
                        colorTheme: { bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 11: THE SNIPER
                // Player(s) who correctly picked a game that the smallest amount of the total group picked correctly
                // ----------------------------------------------------
                try {
                    // 1. Calculate correct pick counts for every completed game
                    let minCorrectCount = Infinity;
                    let hardestGames = []; // Stores { bowlName: string, winningTeam: string, winners: string[] }
                
                    schedule.forEach(game => {
                        if (!game.Winner) return;
                
                        const correctPickers = [];
                        picks.forEach(p => {
                            const pick = p[game.Bowl];
                            if (pick && pick.toLowerCase() === game.Winner.toLowerCase()) {
                                correctPickers.push(p.Name);
                            }
                        });
                
                        const count = correctPickers.length;
                
                        // We are looking for the lowest non-zero count (if count is 0, nobody sniped it)
                        if (count > 0) {
                            if (count < minCorrectCount) {
                                minCorrectCount = count;
                                hardestGames = [{ bowl: game.Bowl, winningTeam: game.Winner, winners: correctPickers }];
                            } else if (count === minCorrectCount) {
                                hardestGames.push({ bowl: game.Bowl, winningTeam: game.Winner, winners: correctPickers });
                            }
                        }
                    });
                
                    // Flatten winners list (handle duplicates if a player sniped multiple hard games)
                    const allSnipers = [...new Set(hardestGames.flatMap(g => g.winners))];
                
                    // Construct description
                    let descText = "Precision picking.";
                    if (hardestGames.length === 1) {
                        descText = `Lone wolf. Correctly picked ${hardestGames[0].winningTeam} when only ${minCorrectCount} person${minCorrectCount > 1 ? 's' : ''} got it right.`;
                    } else if (hardestGames.length > 1) {
                        descText = `Eagle eye. Correctly picked the hardest games of the season (only ${minCorrectCount} correct picks).`;
                    } else {
                        descText = "Precision picking. Correctly picked the game that fooled everyone else.";
                    }
                
                    calculatedBadges.push({
                        emoji: "🎯",
                        title: "The Sniper",
                        winners: allSnipers.length > 0 ? allSnipers : [],
                        description: descText,
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                
                } catch (e) {
                    console.error("The Sniper Error", e);
                    calculatedBadges.push({
                        emoji: "🎯",
                        title: "The Sniper",
                        winners: [],
                        description: "Precision picking. Correctly picked the game that fooled everyone else.",
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 12: MIND MELD
                // Highest agreement rate between two players
                // ----------------------------------------------------
                try {
                    let maxAgreementRate = -1;
                    let mindMeldWinners = [];
                    let bestPercentageStr = "0%";
                
                    const playerNames = picks.map(p => p.Name);
                
                    // Iterate unique pairs
                    for (let i = 0; i < playerNames.length; i++) {
                        for (let j = i + 1; j < playerNames.length; j++) {
                            const p1 = playerNames[i];
                            const p2 = playerNames[j];
                            const p1Picks = picks.find(p => p.Name === p1);
                            const p2Picks = picks.find(p => p.Name === p2);
                
                            let agreements = 0;
                            let commonGames = 0;
                
                            schedule.forEach(game => {
                                const pick1 = p1Picks[game.Bowl];
                                const pick2 = p2Picks[game.Bowl];
                
                                // Only count if both made a pick
                                if (pick1 && pick2) {
                                    commonGames++;
                                    if (pick1.trim().toLowerCase() === pick2.trim().toLowerCase()) {
                                        agreements++;
                                    }
                                }
                            });
                
                            if (commonGames > 0) {
                                const rate = agreements / commonGames;
                
                                if (rate > maxAgreementRate) {
                                    maxAgreementRate = rate;
                                    mindMeldWinners = [`${p1} & ${p2}`];
                                    bestPercentageStr = (rate * 100).toFixed(1) + "%";
                                } else if (Math.abs(rate - maxAgreementRate) < 0.0001) { // Handle floating point equality
                                    mindMeldWinners.push(`${p1} & ${p2}`);
                                }
                            }
                        }
                    }
                
                    calculatedBadges.push({
                        emoji: "♥️",
                        title: "Mind Meld",
                        winners: mindMeldWinners.length > 0 ? mindMeldWinners : [],
                        description: `Great minds think alike. Highest agreement rate on picks (${bestPercentageStr}).`,
                        colorTheme: { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300" }
                    });
                
                } catch (e) {
                    console.error("Mind Meld Error", e);
                    calculatedBadges.push({
                        emoji: "♥️",
                        title: "Mind Meld",
                        winners: [],
                        description: "Great minds think alike. Highest agreement rate between two players.",
                        colorTheme: { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 13: MORTAL ENEMIES
                // Lowest agreement rate between two players
                // ----------------------------------------------------
                try {
                    let minAgreementRate = 2; // Start higher than 100%
                    let mortalEnemiesWinners = [];
                    let worstPercentageStr = "100%";
                
                    const playerNames = picks.map(p => p.Name);
                
                    // Iterate unique pairs
                    for (let i = 0; i < playerNames.length; i++) {
                        for (let j = i + 1; j < playerNames.length; j++) {
                            const p1 = playerNames[i];
                            const p2 = playerNames[j];
                            const p1Picks = picks.find(p => p.Name === p1);
                            const p2Picks = picks.find(p => p.Name === p2);
                
                            let agreements = 0;
                            let commonGames = 0;
                
                            schedule.forEach(game => {
                                const pick1 = p1Picks[game.Bowl];
                                const pick2 = p2Picks[game.Bowl];
                
                                // Only count if both made a pick
                                if (pick1 && pick2) {
                                    commonGames++;
                                    if (pick1.trim().toLowerCase() === pick2.trim().toLowerCase()) {
                                        agreements++;
                                    }
                                }
                            });
                
                            if (commonGames > 0) {
                                const rate = agreements / commonGames;
                
                                if (rate < minAgreementRate) {
                                    minAgreementRate = rate;
                                    mortalEnemiesWinners = [`${p1} & ${p2}`];
                                    worstPercentageStr = (rate * 100).toFixed(1) + "%";
                                } else if (Math.abs(rate - minAgreementRate) < 0.0001) {
                                    mortalEnemiesWinners.push(`${p1} & ${p2}`);
                                }
                            }
                        }
                    }
                
                    calculatedBadges.push({
                        emoji: "⚔️",
                        title: "Mortal Enemies",
                        winners: mortalEnemiesWinners.length > 0 ? mortalEnemiesWinners : [],
                        description: `Total opposites. Lowest agreement rate on picks (${worstPercentageStr}).`,
                        colorTheme: { bg: "bg-gray-300", text: "text-gray-900", border: "border-gray-400" }
                    });
                
                } catch (e) {
                    console.error("Mortal Enemies Error", e);
                    calculatedBadges.push({
                        emoji: "⚔️",
                        title: "Mortal Enemies",
                        winners: [],
                        description: "Total opposites. Lowest agreement rate between two players.",
                        colorTheme: { bg: "bg-gray-300", text: "text-gray-900", border: "border-gray-400" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 14: KING SLAYER
                // Most wins in games where the current leader(s) lost
                // ----------------------------------------------------
                try {
                    // 1. Determine Current Leader(s)
                    const currentWins = {};
                    picks.forEach(p => currentWins[p.Name] = 0);
                
                    schedule.forEach(game => {
                        if (!game.Winner) return;
                        picks.forEach(p => {
                            const pick = p[game.Bowl];
                            if (pick && pick.toLowerCase() === game.Winner.toLowerCase()) {
                                currentWins[p.Name]++;
                            }
                        });
                    });
                
                    let maxTotalWins = -1;
                    Object.values(currentWins).forEach(w => { if (w > maxTotalWins) maxTotalWins = w; });
                    const leaders = Object.keys(currentWins).filter(n => currentWins[n] === maxTotalWins);
                
                    // 2. Identify games where ALL leaders lost
                    const vulnerableGames = schedule.filter(game => {
                        if (!game.Winner) return false;
                        // Check if every leader picked incorrectly (or didn't pick)
                        return leaders.every(leaderName => {
                            const p = picks.find(i => i.Name === leaderName);
                            const pick = p[game.Bowl];
                            return !pick || pick.toLowerCase() !== game.Winner.toLowerCase();
                        });
                    });
                
                    // 3. Count wins in those specific games
                    if (vulnerableGames.length > 0) {
                        const slayerScores = {};
                        picks.forEach(p => slayerScores[p.Name] = 0);
                
                        vulnerableGames.forEach(game => {
                            picks.forEach(p => {
                                const pick = p[game.Bowl];
                                if (pick && pick.toLowerCase() === game.Winner.toLowerCase()) {
                                    slayerScores[p.Name]++;
                                }
                            });
                        });
                
                        let maxSlayerScore = -1;
                        Object.values(slayerScores).forEach(s => { if (s > maxSlayerScore) maxSlayerScore = s; });
                
                        let winners = maxSlayerScore > 0 ? Object.keys(slayerScores).filter(n => slayerScores[n] === maxSlayerScore) : [];
                
                        calculatedBadges.push({
                            emoji: "👑",
                            title: "King Slayer",
                            winners: winners,
                            description: `Takes down the giants. Won ${maxSlayerScore} games where the leader(s) stumbled.`,
                            colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                        });
                    } else {
                        // Leaders haven't lost a game collectively yet
                        calculatedBadges.push({
                            emoji: "👑",
                            title: "King Slayer",
                            winners: [],
                            description: "Takes down the giants. Most wins in games where the leader(s) lost.",
                            colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                        });
                    }
                
                } catch (e) {
                    console.error("King Slayer Error", e);
                    calculatedBadges.push({
                        emoji: "👑",
                        title: "King Slayer",
                        winners: [],
                        description: "Takes down the giants. Most wins in games where the leader(s) lost.",
                        colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 15: THE AVENGERS
                // Most shared wins together between two players
                // ----------------------------------------------------
                try {
                    let maxSharedWins = 0;
                    let wonderTwinsWinners = [];
                    const playerNames = picks.map(p => p.Name);
                
                    // Iterate all unique pairs
                    for (let i = 0; i < playerNames.length; i++) {
                        for (let j = i + 1; j < playerNames.length; j++) {
                            const p1 = playerNames[i];
                            const p2 = playerNames[j];
                            const p1Picks = picks.find(p => p.Name === p1);
                            const p2Picks = picks.find(p => p.Name === p2);
                
                            let currentSharedWins = 0;
                
                            schedule.forEach(game => {
                                if (!game.Winner) return;
                
                                const pick1 = p1Picks[game.Bowl];
                                const pick2 = p2Picks[game.Bowl];
                                const winner = game.Winner;
                
                                // Both picked the winner
                                if (pick1 && pick2 &&
                                    pick1.trim().toLowerCase() === winner.trim().toLowerCase() &&
                                    pick2.trim().toLowerCase() === winner.trim().toLowerCase()) {
                                    currentSharedWins++;
                                }
                            });
                
                            if (currentSharedWins > maxSharedWins) {
                                maxSharedWins = currentSharedWins;
                                wonderTwinsWinners = [`${p1} & ${p2}`];
                            } else if (currentSharedWins === maxSharedWins && maxSharedWins > 0) {
                                wonderTwinsWinners.push(`${p1} & ${p2}`);
                            }
                        }
                    }
                
                    calculatedBadges.push({
                        emoji: "👊",
                        title: "The Avengers",
                        winners: wonderTwinsWinners.length > 0 ? wonderTwinsWinners : [],
                        description: `Dynamic duo. Most shared wins together (${maxSharedWins} games).`,
                        colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                    });
                
                } catch (e) {
                    console.error("The Avengers Error", e);
                    calculatedBadges.push({
                        emoji: "👊",
                        title: "The Avengers",
                        winners: [],
                        description: "Dynamic duo. Most shared wins together.",
                        colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 16: PLAYOFF PAYOFF
                // Most wins in CFP designated games
                // ----------------------------------------------------
                try {
                    const cfpGames = schedule.filter(g => g.Winner && g['CFP']);
                
                    if (cfpGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                
                        cfpGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    playerWins[p.Name]++;
                                }
                            });
                        });
                
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                
                        calculatedBadges.push({
                            emoji: "🏅",
                            title: "Playoff Payoff",
                            winners: winners,
                            description: `Big stage player. Most wins (${maxWins}) in College Football Playoff games.`,
                            colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🏅",
                            title: "Playoff Payoff",
                            winners: [],
                            description: "Big stage player. Most wins in College Football Playoff games.",
                            colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                        });
                    }
                } catch (e) {
                    console.error("Playoff Payoff Error", e);
                    calculatedBadges.push({
                        emoji: "🏅",
                        title: "Playoff Payoff",
                        winners: [],
                        description: "Big stage player. Most wins in College Football Playoff games.",
                        colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 17: CHAMPIONSHIP RIVALS
                // Pair with highest agreement (>50%) but different Champs
                // ----------------------------------------------------
                try {
                    let maxRivalAgreement = 0;
                    let rivalWinners = [];
                    let agreementStr = "0%";
                    const playerNames = picks.map(p => p.Name);
                
                    for (let i = 0; i < playerNames.length; i++) {
                        for (let j = i + 1; j < playerNames.length; j++) {
                            const p1Name = playerNames[i];
                            const p2Name = playerNames[j];
                            const p1 = picks.find(p => p.Name === p1Name);
                            const p2 = picks.find(p => p.Name === p2Name);
                
                            // Check Champs
                            const c1 = p1["National Championship"];
                            const c2 = p2["National Championship"];
                
                            if (!c1 || !c2 || c1.trim().toLowerCase() === c2.trim().toLowerCase()) {
                                continue;
                            }
                
                            // Calculate Agreement
                            let agreements = 0;
                            let common = 0;
                            schedule.forEach(g => {
                                const pick1 = p1[g.Bowl];
                                const pick2 = p2[g.Bowl];
                                if (pick1 && pick2) {
                                    common++;
                                    if (pick1.trim().toLowerCase() === pick2.trim().toLowerCase()) {
                                        agreements++;
                                    }
                                }
                            });
                
                            if (common > 0) {
                                const rate = agreements / common;
                                if (rate > 0.50) {
                                    if (rate > maxRivalAgreement) {
                                        maxRivalAgreement = rate;
                                        rivalWinners = [`${p1Name} & ${p2Name}`];
                                        agreementStr = (rate * 100).toFixed(1) + "%";
                                    } else if (Math.abs(rate - maxRivalAgreement) < 0.0001) {
                                        rivalWinners.push(`${p1Name} & ${p2Name}`);
                                    }
                                }
                            }
                        }
                    }
                
                    calculatedBadges.push({
                        emoji: "🥊",
                        title: "Championship Rivals",
                        winners: rivalWinners.length > 0 ? rivalWinners : [],
                        description: `Friends until the end. ${agreementStr} agreement, but split on the title game.`,
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                
                } catch (e) {
                    console.error("Championship Rivals Error", e);
                     calculatedBadges.push({
                        emoji: "🥊",
                        title: "Championship Rivals",
                        winners: [],
                        description: "Friends until the end. High agreement, but split on the title game.",
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 18: SATURDAY NIGHT FEVER
                // Most wins in games on Saturday nights 7 PM or later
                // ----------------------------------------------------
                try {
                    // Filter for Saturday games >= 7:00 PM
                    const satNightGames = schedule.filter(g => {
                        if (!g.Winner || !g.Time || !g.Date) return false;
                
                        // Check Day of Week (Saturday is 6)
                        // Note: Assuming Date format allows JS to parse correctly (e.g. "Dec 28")
                        // Adding a year might be safer in production, but relying on browser heuristic for now
                        const d = new Date(`${g.Date} ${g.Time}`);
                        if (d.getDay() !== 6) return false; // 0=Sun, 1=Mon... 6=Sat
                
                        // Check Time >= 7 PM
                        const timeStr = g.Time.trim().toUpperCase();
                        let [timePart, modifier] = timeStr.split(' ');
                        if (!modifier) {
                            if (timeStr.includes('PM')) { modifier = 'PM'; timePart = timeStr.replace('PM',''); }
                            else if (timeStr.includes('AM')) { modifier = 'AM'; timePart = timeStr.replace('AM',''); }
                        }
                        let [hours, minutes] = timePart.split(':').map(Number);
                        if (modifier === 'PM' && hours !== 12) hours += 12;
                        if (modifier === 'AM' && hours === 12) hours = 0;
                
                        return hours >= 19;
                    });
                
                    if (satNightGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                
                        satNightGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    playerWins[p.Name]++;
                                }
                            });
                        });
                
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                
                        calculatedBadges.push({
                            emoji: "🕺",
                            title: "Saturday Night Fever",
                            winners: winners,
                            description: `Owns the prime time. Most wins (${maxWins}) in Saturday night games.`,
                            colorTheme: { bg: "bg-[#701a75]/10", text: "text-[#701a75]", border: "border-[#701a75]/30" } // Velvet
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "🕺",
                            title: "Saturday Night Fever",
                            winners: [],
                            description: "Owns the prime time. Most wins in Saturday night games.",
                            colorTheme: { bg: "bg-[#701a75]/10", text: "text-[#701a75]", border: "border-[#701a75]/30" }
                        });
                    }
                
                } catch (e) {
                    console.error("Saturday Night Fever Error", e);
                    calculatedBadges.push({
                        emoji: "🕺",
                        title: "Saturday Night Fever",
                        winners: [],
                        description: "Owns the prime time. Most wins in Saturday night games.",
                        colorTheme: { bg: "bg-[#701a75]/10", text: "text-[#701a75]", border: "border-[#701a75]/30" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 19: THE TV GUIDE
                // Most wins in games broadcast on ESPN
                // ----------------------------------------------------
                try {
                    const espnGames = schedule.filter(g => g.Winner && g.Network && g.Network.toUpperCase().includes('ESPN'));
                
                    if (espnGames.length > 0) {
                        const playerWins = {};
                        picks.forEach(p => playerWins[p.Name] = 0);
                
                        espnGames.forEach(g => {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    playerWins[p.Name]++;
                                }
                            });
                        });
                
                        let maxWins = -1;
                        Object.values(playerWins).forEach(w => { if(w > maxWins) maxWins = w; });
                
                        let winners = maxWins > 0 ? Object.keys(playerWins).filter(name => playerWins[name] === maxWins) : [];
                
                        calculatedBadges.push({
                            emoji: "📺",
                            title: "The TV Guide",
                            winners: winners,
                            description: `Glued to the screen. Most wins (${maxWins}) in games broadcast on ESPN networks.`,
                            colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                        });
                    } else {
                        calculatedBadges.push({
                            emoji: "📺",
                            title: "The TV Guide",
                            winners: [],
                            description: "Glued to the screen. Most wins in games broadcast on ESPN networks.",
                            colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                        });
                    }
                } catch (e) {
                    console.error("TV Guide Error", e);
                    calculatedBadges.push({
                        emoji: "📺",
                        title: "The TV Guide",
                        winners: [],
                        description: "Glued to the screen. Most wins in games broadcast on ESPN networks.",
                        colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 20: CLEAN SHEET
                // Most "perfect days" (100% wins on days with 3+ games)
                // ----------------------------------------------------
                try {
                    // 1. Group completed games by Date
                    const gamesByDate = {};
                    schedule.forEach(g => {
                        if (g.Winner && g.Date) {
                            if (!gamesByDate[g.Date]) gamesByDate[g.Date] = [];
                            gamesByDate[g.Date].push(g);
                        }
                    });
                
                    const perfectDayCounts = {};
                    picks.forEach(p => perfectDayCounts[p.Name] = 0);
                
                    // 2. Iterate dates with >= 3 games
                    Object.values(gamesByDate).forEach(dayGames => {
                        if (dayGames.length >= 3) {
                            picks.forEach(p => {
                                let allCorrect = true;
                                for (const game of dayGames) {
                                    const pick = p[game.Bowl];
                                    if (!pick || pick.toLowerCase() !== game.Winner.toLowerCase()) {
                                        allCorrect = false;
                                        break;
                                    }
                                }
                                if (allCorrect) {
                                    perfectDayCounts[p.Name]++;
                                }
                            });
                        }
                    });
                
                    let maxPerfectDays = -1;
                    Object.values(perfectDayCounts).forEach(c => { if(c > maxPerfectDays) maxPerfectDays = c; });
                
                    let winners = maxPerfectDays > 0 ? Object.keys(perfectDayCounts).filter(n => perfectDayCounts[n] === maxPerfectDays) : [];
                
                    calculatedBadges.push({
                        emoji: "🧼",
                        title: "Clean Sheet",
                        winners: winners,
                        description: `Flawless victory. Achieved perfection on ${maxPerfectDays} day${maxPerfectDays !== 1 ? 's' : ''} (3+ games).`,
                        colorTheme: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" }
                    });
                
                } catch (e) {
                    console.error("Clean Sheet Error", e);
                    calculatedBadges.push({
                        emoji: "🧼",
                        title: "Clean Sheet",
                        winners: [],
                        description: "Flawless victory. Most perfect days with 100% accuracy.",
                        colorTheme: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 21: ALPHABET SOUP
                // Most wins picking the team that comes first alphabetically
                // ----------------------------------------------------
                try {
                    const alphaSoupScores = {};
                    picks.forEach(p => alphaSoupScores[p.Name] = 0);
                
                    schedule.forEach(game => {
                        if (!game.Winner || !game["Team 1"] || !game["Team 2"]) return;
                
                        const t1 = game["Team 1"].trim();
                        const t2 = game["Team 2"].trim();
                        // Determine which team is first alphabetically
                        const alphaTeam = t1.localeCompare(t2) < 0 ? t1 : t2;
                
                        // Only counts if the alphabetical team actually won
                        if (alphaTeam.toLowerCase() === game.Winner.toLowerCase()) {
                            picks.forEach(p => {
                                const pick = p[game.Bowl];
                                if (pick && pick.toLowerCase() === alphaTeam.toLowerCase()) {
                                    alphaSoupScores[p.Name]++;
                                }
                            });
                        }
                    });
                
                    let maxAlphaWins = -1;
                    Object.values(alphaSoupScores).forEach(s => { if (s > maxAlphaWins) maxAlphaWins = s; });
                
                    let winners = maxAlphaWins > 0 ? Object.keys(alphaSoupScores).filter(n => alphaSoupScores[n] === maxAlphaWins) : [];
                
                    calculatedBadges.push({
                        emoji: "🥫",
                        title: "Alphabet Soup",
                        winners: winners,
                        description: `A to Z strategy. Most wins (${maxAlphaWins}) when picking the team that comes first alphabetically.`,
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                
                } catch (e) {
                    console.error("Alphabet Soup Error", e);
                    calculatedBadges.push({
                        emoji: "🥫",
                        title: "Alphabet Soup",
                        winners: [],
                        description: "A to Z strategy. Most wins picking the team that comes first alphabetically.",
                        colorTheme: { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 22: SHORT AND SWEET
                // Most wins picking the team with the shorter name
                // ----------------------------------------------------
                try {
                    const shortScores = {};
                    picks.forEach(p => shortScores[p.Name] = 0);
                
                    // Helper to clean name (remove #12 etc)
                    const cleanName = (name) => name.replace(/#\d+\s*/g, '').trim();
                
                    schedule.forEach(game => {
                        if (!game.Winner || !game["Team 1"] || !game["Team 2"]) return;
                
                        const t1Raw = game["Team 1"];
                        const t2Raw = game["Team 2"];
                        const t1Clean = cleanName(t1Raw);
                        const t2Clean = cleanName(t2Raw);
                
                        let shortTeam = null;
                        if (t1Clean.length < t2Clean.length) {
                            shortTeam = t1Raw;
                        } else if (t2Clean.length < t1Clean.length) {
                            shortTeam = t2Raw;
                        }
                        // If lengths are equal, neither is shorter
                
                        // Only counts if the shorter name team actually won
                        if (shortTeam && game.Winner.toLowerCase() === shortTeam.toLowerCase()) {
                             picks.forEach(p => {
                                 const pick = p[game.Bowl];
                                 if (pick && pick.toLowerCase() === shortTeam.toLowerCase()) {
                                     shortScores[p.Name]++;
                                 }
                             });
                        }
                    });
                
                    let maxShortWins = -1;
                    Object.values(shortScores).forEach(s => { if (s > maxShortWins) maxShortWins = s; });
                
                    let winners = maxShortWins > 0 ? Object.keys(shortScores).filter(n => shortScores[n] === maxShortWins) : [];
                
                    calculatedBadges.push({
                        emoji: "🍬",
                        title: "Short & Sweet",
                        winners: winners,
                        description: `Efficiency is key. Most wins (${maxShortWins}) picking the team with the shorter name.`,
                        colorTheme: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" }
                    });
                
                } catch (e) {
                    console.error("Short and Sweet Error", e);
                     calculatedBadges.push({
                        emoji: "🍬",
                        title: "Short & Sweet",
                        winners: [],
                        description: "Efficiency is key. Most wins picking the team with the shorter name.",
                        colorTheme: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 23: BOOKED A TEE TIME
                // Most losses by an individual
                // ----------------------------------------------------
                try {
                    const playerLosses = {};
                    picks.forEach(p => playerLosses[p.Name] = 0);
                
                    schedule.forEach(g => {
                        if (g.Winner) {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                // Count as loss if pick exists but is wrong, or if pick is missing
                                if (!pick || pick.toLowerCase() !== g.Winner.toLowerCase()) {
                                    playerLosses[p.Name]++;
                                }
                            });
                        }
                    });
                
                    let maxLosses = -1;
                    Object.values(playerLosses).forEach(l => { if (l > maxLosses) maxLosses = l; });
                
                    let winners = maxLosses > 0 ? Object.keys(playerLosses).filter(n => playerLosses[n] === maxLosses) : [];
                
                    calculatedBadges.push({
                        emoji: "⛳️",
                        title: "Booked a Tee Time",
                        winners: winners,
                        description: `It's just as hard to pick the wrong ones. Most losses (${maxLosses}).`,
                        colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                    });
                
                } catch (e) {
                    console.error("Golf Error", e);
                     calculatedBadges.push({
                        emoji: "⛳️",
                        title: "Booked a Tee Time",
                        winners: [],
                        description: "It's just as hard to pick the wrong ones. Most losses.",
                        colorTheme: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 24: CHASING GLORY
                // Most wins by a player who has not won a championship
                // ----------------------------------------------------
                try {
                    // 1. Identify Past Winners
                    const pastWinners = new Set();
                    history.forEach(h => {
                        if (h.Winner) pastWinners.add(h.Winner.trim().toLowerCase());
                    });
                
                    // 2. Calculate Current Standings
                    const currentWins = {};
                    picks.forEach(p => currentWins[p.Name] = 0);
                
                    schedule.forEach(g => {
                        if (g.Winner) {
                            picks.forEach(p => {
                                const pick = p[g.Bowl];
                                if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                    currentWins[p.Name]++;
                                }
                            });
                        }
                    });
                
                    // 3. Find Max Wins among Non-Winners
                    let maxNonChampWins = -1;
                    let gloryHunters = [];
                
                    Object.keys(currentWins).forEach(player => {
                        if (!pastWinners.has(player.toLowerCase())) {
                            const wins = currentWins[player];
                            if (wins > maxNonChampWins) {
                                maxNonChampWins = wins;
                                gloryHunters = [player];
                            } else if (wins === maxNonChampWins) {
                                gloryHunters.push(player);
                            }
                        }
                    });
                
                    if (maxNonChampWins > -1) {
                        calculatedBadges.push({
                            emoji: "⭐️",
                            title: "Chasing Glory",
                            winners: gloryHunters,
                            description: `Hungry for the first title. Most wins (${maxNonChampWins}) by a player who has never won it all.`,
                            colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                        });
                    }
                
                } catch (e) {
                    console.error("Chasing Glory Error", e);
                    calculatedBadges.push({
                        emoji: "⭐️",
                        title: "Chasing Glory",
                        winners: [],
                        description: "Hungry for the first title. Most wins by a player who has never won it all.",
                        colorTheme: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" }
                    });
                }
                
                // ----------------------------------------------------
                // BADGE 25: BLIND FAITH
                // Most correct picks on Unranked Teams
                // ----------------------------------------------------
                try {
                    const unrankedWins = {};
                    picks.forEach(p => unrankedWins[p.Name] = 0);
                
                    schedule.forEach(g => {
                        if (!g.Winner) return;
                        // Check if winner is unranked (no #)
                        if (!g.Winner.includes('#')) {
                             picks.forEach(p => {
                                 const pick = p[g.Bowl];
                                 if (pick && pick.toLowerCase() === g.Winner.toLowerCase()) {
                                     unrankedWins[p.Name]++;
                                 }
                             });
                        }
                    });
                
                    let maxUnranked = -1;
                    Object.values(unrankedWins).forEach(c => { if(c > maxUnranked) maxUnranked = c; });
                
                    let winners = maxUnranked > 0 ? Object.keys(unrankedWins).filter(n => unrankedWins[n] === maxUnranked) : [];
                
                    calculatedBadges.push({
                        emoji: "🙈",
                        title: "Blind Faith",
                        winners: winners,
                        description: `Who needs rankings? Most wins (${maxUnranked}) picking unranked teams.`,
                        colorTheme: { bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-300" }
                    });
                
                } catch (e) {
                    console.error("Blind Faith Error", e);
                    calculatedBadges.push({
                        emoji: "🙈",
                        title: "Blind Faith",
                        winners: [],
                        description: "Who needs rankings? Most wins picking unranked teams.",
                        colorTheme: { bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-300" }
                    });
                }
                
                // Combine Calculated + Mocks
                const finalPool = [...calculatedBadges];
                
                // Assign static colors (if not already set) and shuffle once
                const withColors = finalPool.map((badge, idx) => {
                    if (badge.colorTheme) return badge; // Use explicit theme if set
                    return {
                        ...badge,
                        colorTheme: THEMES[idx % THEMES.length]
                    };
                });
                
                // Shuffle
                setBadges(withColors.sort(() => 0.5 - Math.random()));
                } catch (err) {
                console.error("Error init badges:", err);
                }
            }, [loading, error, schedule, picks, history, THEMES]);

            if (loading) return <LoadingSpinner text="Calculating Superlatives..." />;
            if (error) return <ErrorMessage message={(error && (error.message || String(error))) || "Failed to load data"} />;

            return (
                <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
                    <div className="bg-white pt-8 pb-8 px-4">
                        <div className="max-w-7xl mx-auto text-center">
                            <h2 className="text-3xl text-blue-900 font-bold mb-1">Superlatives</h2>
                            <p className="text-gray-600 text-sm">Celebrating the best, worst, and weirdest performances.</p>
                        </div>
                    </div>
                    <div className="px-4 md:px-6 max-w-7xl mx-auto w-full">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {badges.map((badge, idx) => (
                                <BadgeCard
                                    key={idx}
                                    {...badge}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

  RC.pages.BadgesPage = BadgesPage;
})();
