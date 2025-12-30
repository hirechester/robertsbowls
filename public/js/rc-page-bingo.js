/* Roberts Cup - Bowl Bingo Page
   Loaded as: <script type="text/babel" src="js/rc-page-bingo.js"></script>
*/
(() => {
  const { useState, useMemo, useEffect } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const { LoadingSpinner, ErrorMessage } = RC.ui || {};
  const Spinner = LoadingSpinner || (({ text }) => <div className="p-6 text-slate-600">{text || "Loading..."}</div>);
  const Err = ErrorMessage || (({ message }) => <div className="p-6 text-red-600">{message}</div>);

  const CATEGORIES = [
    "Outcome",
    "Spread",
    "Total",
    "Picks",
    "Conference",
    "Timing",
    "Network",
    "Flags"
  ];

  const FREE_SPACE = {
    id: "free-space",
    title: "FREE SPACE",
    description: "Tradition demands it.",
    category: "Free",
    rarity: "Common",
    isFree: true,
    evaluate: () => ({ hit: true })
  };

  const STARTER_SQUARES = [
    {
      id: "starter-upset-alert",
      title: "Upset Alert",
      description: "A favorite goes down before the confetti even settles.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        if (!bowl.favoriteId || !bowl.winnerId) return false;
        return bowl.favoriteId !== bowl.winnerId;
      })
    },
    {
      id: "starter-family-split",
      title: "The Family Split",
      description: "Picks land in a near-even 40-60 split for a completed bowl.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        const home = stats.counts[bowl.homeId] || 0;
        const away = stats.counts[bowl.awayId] || 0;
        if (!home && !away) return false;
        const pctHome = (home / stats.total) * 100;
        const pctAway = (away / stats.total) * 100;
        return (pctHome >= 40 && pctHome <= 60) || (pctAway >= 40 && pctAway <= 60);
      })
    },
    {
      id: "starter-few-not-one",
      title: "The Few, Not the One",
      description: "You nailed a winner that only a small crew backed.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => {
        const playerRow = ctx.playerRow;
        if (!playerRow) return { hit: false };
        const k = Math.max(3, Math.ceil(ctx.playerCount * 0.10));
        return evalAnyCompleted(ctx, (bowl) => {
          const stats = ctx.pickStatsByBowl[bowl.bowlId];
          if (!stats || !stats.total) return false;
          const winnerCount = stats.counts[bowl.winnerId] || 0;
          const playerPick = normalizeId(playerRow[bowl.bowlId]);
          return playerPick && playerPick === bowl.winnerId && winnerCount <= k;
        });
      }
    },
    {
      id: "starter-supermajority-tragedy",
      title: "Supermajority Tragedy",
      description: "At least 80% ride one team and it still loses.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total || !stats.topId) return false;
        if (stats.topPct < 80) return false;
        return stats.topId !== bowl.winnerId;
      })
    },
    {
      id: "starter-favorite-wins-no-cover",
      title: "Favorite Wins, Still Disappoints",
      description: "The favorite wins but fails to cover the spread.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.favMargin > 0 && spreadInfo.favMargin <= spreadInfo.line;
      })
    },
    {
      id: "starter-ou-heartbreak",
      title: "Over/Under Heartbreak",
      description: "Total lands within three points of the line.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        const combined = bowl.homePts + bowl.awayPts;
        return Math.abs(combined - total) <= 3;
      })
    },
    {
      id: "starter-one-score-drama",
      title: "One-Score Drama",
      description: "A game ends within one score.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => Math.abs(bowl.homePts - bowl.awayPts) <= 8)
    },
    {
      id: "starter-blowout-seasoning",
      title: "Blowout Seasoning",
      description: "Someone wins by 20+ and nobody is surprised.",
      category: "Starter",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => Math.abs(bowl.homePts - bowl.awayPts) >= 20)
    }
  ];

  const STARTER_POSITIONS = {
    0: "starter-upset-alert",
    2: "starter-family-split",
    4: "starter-supermajority-tragedy",
    10: "starter-favorite-wins-no-cover",
    14: "starter-ou-heartbreak",
    20: "starter-one-score-drama",
    22: "starter-blowout-seasoning",
    24: "starter-few-not-one"
  };

  const BINGO_BANK = [
    // Outcome
    makeSquare({
      id: "outcome-chalk-holds",
      title: "The Chalk Holds",
      description: "A favorite takes care of business straight up.",
      category: "Outcome",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.favoriteId && bowl.winnerId === bowl.favoriteId)
    }),
    makeSquare({
      id: "outcome-underdog-rises",
      title: "Underdog Rises",
      description: "The team getting points wins outright.",
      category: "Outcome",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.favoriteId && bowl.winnerId && bowl.winnerId !== bowl.favoriteId)
    }),
    makeSquare({
      id: "outcome-home-hero",
      title: "Home Field Hero",
      description: "The home team takes the victory lap.",
      category: "Outcome",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.winnerId && bowl.winnerId === bowl.homeId)
    }),
    makeSquare({
      id: "outcome-road-warrior",
      title: "Road Warrior",
      description: "The away team heads home with the trophy.",
      category: "Outcome",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.winnerId && bowl.winnerId === bowl.awayId)
    }),
    makeSquare({
      id: "outcome-winner-35",
      title: "Thirty-Five Club",
      description: "A winner puts up at least 35 points.",
      category: "Outcome",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const winnerScore = getTeamScore(bowl, bowl.winnerId);
        return Number.isFinite(winnerScore) && winnerScore >= 35;
      })
    }),
    makeSquare({
      id: "outcome-winner-under-17",
      title: "Grind-It-Out",
      description: "The winner scores 17 or fewer.",
      category: "Outcome",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const winnerScore = getTeamScore(bowl, bowl.winnerId);
        return Number.isFinite(winnerScore) && winnerScore <= 17;
      })
    }),
    makeSquare({
      id: "outcome-both-30-plus",
      title: "All Gas",
      description: "Both teams reach 30+ points.",
      category: "Outcome",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.homePts >= 30 && bowl.awayPts >= 30)
    }),
    makeSquare({
      id: "outcome-one-point",
      title: "One-Point Finish",
      description: "A game is decided by a single point.",
      category: "Outcome",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => Math.abs(bowl.homePts - bowl.awayPts) === 1)
    }),

    // Spread
    makeSquare({
      id: "spread-favorite-covers",
      title: "Favorite Covers",
      description: "The favorite wins and beats the number.",
      category: "Spread",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.favMargin > spreadInfo.line;
      })
    }),
    makeSquare({
      id: "spread-underdog-covers",
      title: "Underdog Covers",
      description: "The dog stays within the line or wins outright.",
      category: "Spread",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.favMargin < spreadInfo.line;
      })
    }),
    makeSquare({
      id: "spread-push",
      title: "Push At The Window",
      description: "The final margin lands exactly on the spread.",
      category: "Spread",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.favMargin === spreadInfo.line;
      })
    }),
    makeSquare({
      id: "spread-close-to-number",
      title: "Right On The Number",
      description: "Final margin comes within two points of the line.",
      category: "Spread",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return Math.abs(spreadInfo.favMargin - spreadInfo.line) <= 2;
      })
    }),
    makeSquare({
      id: "spread-double-digit",
      title: "Double-Digit Duty",
      description: "A 10+ point line is covered by the favorite.",
      category: "Spread",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.line >= 10 && spreadInfo.favMargin > spreadInfo.line;
      })
    }),
    makeSquare({
      id: "spread-short-line-upset",
      title: "Short Line Shock",
      description: "A 3-point spread or less turns into an upset.",
      category: "Spread",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.line <= 3 && spreadInfo.favMargin < 0;
      })
    }),
    makeSquare({
      id: "spread-pickem",
      title: "Pick'em Pressure",
      description: "A bowl closes as a true pick'em.",
      category: "Spread",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return spreadInfo.line === 0;
      })
    }),
    makeSquare({
      id: "spread-cover-by-one",
      title: "Cover By One",
      description: "The spread is covered by a single point.",
      category: "Spread",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const spreadInfo = getSpreadInfo(bowl);
        if (!spreadInfo) return false;
        return Math.abs(spreadInfo.favMargin - spreadInfo.line) === 1;
      })
    }),

    // Total
    makeSquare({
      id: "total-over",
      title: "Over Hits",
      description: "The total points finish above the line.",
      category: "Total",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return bowl.homePts + bowl.awayPts > total;
      })
    }),
    makeSquare({
      id: "total-under",
      title: "Under Holds",
      description: "The total points stay below the line.",
      category: "Total",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return bowl.homePts + bowl.awayPts < total;
      })
    }),
    makeSquare({
      id: "total-push",
      title: "Total Push",
      description: "The final total lands exactly on the line.",
      category: "Total",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return bowl.homePts + bowl.awayPts === total;
      })
    }),
    makeSquare({
      id: "total-over-10",
      title: "Over By Ten",
      description: "The game finishes 10+ points over the total.",
      category: "Total",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return bowl.homePts + bowl.awayPts >= total + 10;
      })
    }),
    makeSquare({
      id: "total-under-10",
      title: "Under By Ten",
      description: "The game finishes 10+ points under the total.",
      category: "Total",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return bowl.homePts + bowl.awayPts <= total - 10;
      })
    }),
    makeSquare({
      id: "total-within-1",
      title: "Photo Finish Total",
      description: "Total ends within one point of the line.",
      category: "Total",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const total = parseNumber(bowl.total);
        if (!Number.isFinite(total)) return false;
        return Math.abs(bowl.homePts + bowl.awayPts - total) <= 1;
      })
    }),
    makeSquare({
      id: "total-70-plus",
      title: "Scoreboard Glows",
      description: "Combined points hit 70 or more.",
      category: "Total",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.homePts + bowl.awayPts >= 70)
    }),
    makeSquare({
      id: "total-under-40",
      title: "Defensive Grinder",
      description: "Combined points stay at 40 or lower.",
      category: "Total",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.homePts + bowl.awayPts <= 40)
    }),

    // Picks
    makeSquare({
      id: "picks-unanimous-winner",
      title: "Unanimous Winner",
      description: "95%+ of picks back the winner.",
      category: "Picks",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        return stats.topPct >= 95 && stats.topId === bowl.winnerId;
      })
    }),
    makeSquare({
      id: "picks-supermajority-correct",
      title: "Supermajority Right",
      description: "80%+ of picks back the winner.",
      category: "Picks",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        return stats.topPct >= 80 && stats.topId === bowl.winnerId;
      })
    }),
    makeSquare({
      id: "picks-crowd-missed",
      title: "The Crowd Missed",
      description: "70%+ ride the same team and it loses.",
      category: "Picks",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        return stats.topPct >= 70 && stats.topId !== bowl.winnerId;
      })
    }),
    makeSquare({
      id: "picks-lone-wolf",
      title: "Lone Wolf",
      description: "Exactly one player picks the winner.",
      category: "Picks",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        return (stats.counts[bowl.winnerId] || 0) === 1;
      })
    }),
    makeSquare({
      id: "picks-two-believers",
      title: "Two Believers",
      description: "Exactly two players pick the winner.",
      category: "Picks",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const stats = ctx.pickStatsByBowl[bowl.bowlId];
        if (!stats || !stats.total) return false;
        return (stats.counts[bowl.winnerId] || 0) === 2;
      })
    }),
    makeSquare({
      id: "picks-you-backed-majority",
      title: "You Backed The Majority",
      description: "You picked the winner in a 65%+ majority.",
      category: "Picks",
      rarity: "Common",
      evaluate: (ctx) => {
        if (!ctx.playerRow) return { hit: false };
        return evalAnyCompleted(ctx, (bowl) => {
          const stats = ctx.pickStatsByBowl[bowl.bowlId];
          if (!stats || !stats.total) return false;
          if (stats.topPct < 65 || stats.topId !== bowl.winnerId) return false;
          const playerPick = normalizeId(ctx.playerRow[bowl.bowlId]);
          return playerPick && playerPick === bowl.winnerId;
        });
      }
    }),
    makeSquare({
      id: "picks-you-faded-correct",
      title: "You Faded The Crowd",
      description: "You took a 35%-or-less pick and won.",
      category: "Picks",
      rarity: "Medium",
      evaluate: (ctx) => {
        if (!ctx.playerRow) return { hit: false };
        return evalAnyCompleted(ctx, (bowl) => {
          const stats = ctx.pickStatsByBowl[bowl.bowlId];
          if (!stats || !stats.total) return false;
          const playerPick = normalizeId(ctx.playerRow[bowl.bowlId]);
          if (!playerPick || playerPick !== bowl.winnerId) return false;
          const pct = ((stats.counts[playerPick] || 0) / stats.total) * 100;
          return pct <= 35;
        });
      }
    }),
    makeSquare({
      id: "picks-you-faded-wrong",
      title: "Bold But Wrong",
      description: "You took a 35%-or-less pick and it lost.",
      category: "Picks",
      rarity: "Medium",
      evaluate: (ctx) => {
        if (!ctx.playerRow) return { hit: false };
        return evalAnyCompleted(ctx, (bowl) => {
          const stats = ctx.pickStatsByBowl[bowl.bowlId];
          if (!stats || !stats.total) return false;
          const playerPick = normalizeId(ctx.playerRow[bowl.bowlId]);
          if (!playerPick || playerPick === bowl.winnerId) return false;
          const pct = ((stats.counts[playerPick] || 0) / stats.total) * 100;
          return pct <= 35;
        });
      }
    }),

    // Conference
    makeSquare({
      id: "conf-b1g-sec",
      title: "Big Ten vs SEC",
      description: "A Big Ten team faces the SEC.",
      category: "Conference",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasMatchup(ctx, bowl, ["big ten"], ["sec"]))
    }),
    makeSquare({
      id: "conf-acc-sec",
      title: "ACC vs SEC",
      description: "An ACC team draws the SEC.",
      category: "Conference",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasMatchup(ctx, bowl, ["acc"], ["sec"]))
    }),
    makeSquare({
      id: "conf-big12-sec",
      title: "Big 12 vs SEC",
      description: "A Big 12 team lines up with the SEC.",
      category: "Conference",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasMatchup(ctx, bowl, ["big 12", "big12"], ["sec"]))
    }),
    makeSquare({
      id: "conf-g6-upset",
      title: "Group of 6 Upset",
      description: "A Group of 6 team beats a power league.",
      category: "Conference",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const winnerConf = getConfForTeam(ctx.teamById, bowl.winnerId);
        const loserId = bowl.winnerId === bowl.homeId ? bowl.awayId : bowl.homeId;
        const loserConf = getConfForTeam(ctx.teamById, loserId);
        return isGroupOf6(winnerConf) && isPowerConf(loserConf);
      })
    }),
    makeSquare({
      id: "conf-same-league",
      title: "Familiar Foes",
      description: "Both teams share the same conference.",
      category: "Conference",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeConf = getConfForTeam(ctx.teamById, bowl.homeId);
        const awayConf = getConfForTeam(ctx.teamById, bowl.awayId);
        return homeConf && awayConf && homeConf === awayConf;
      })
    }),
    makeSquare({
      id: "conf-power-vs-power",
      title: "Power Clash",
      description: "Two power-conference teams square off.",
      category: "Conference",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeConf = getConfForTeam(ctx.teamById, bowl.homeId);
        const awayConf = getConfForTeam(ctx.teamById, bowl.awayId);
        return isPowerConf(homeConf) && isPowerConf(awayConf);
      })
    }),
    makeSquare({
      id: "conf-g6-vs-g6",
      title: "Group of 6 Duel",
      description: "Both teams come from Group of 6 leagues.",
      category: "Conference",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeConf = getConfForTeam(ctx.teamById, bowl.homeId);
        const awayConf = getConfForTeam(ctx.teamById, bowl.awayId);
        return isGroupOf6(homeConf) && isGroupOf6(awayConf);
      })
    }),
    makeSquare({
      id: "conf-independent",
      title: "Independent Sighting",
      description: "An independent program takes the field.",
      category: "Conference",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeConf = getConfForTeam(ctx.teamById, bowl.homeId);
        const awayConf = getConfForTeam(ctx.teamById, bowl.awayId);
        return homeConf === "independent" || awayConf === "independent";
      })
    }),

    // Timing
    makeSquare({
      id: "timing-pre-christmas",
      title: "Early Bowls",
      description: "A game is played before Dec 25.",
      category: "Timing",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        return d.getMonth() === 11 && d.getDate() < 25;
      })
    }),
    makeSquare({
      id: "timing-christmas-eve",
      title: "Christmas Eve Kick",
      description: "A game lands on Dec 24.",
      category: "Timing",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        return d.getMonth() === 11 && d.getDate() === 24;
      })
    }),
    makeSquare({
      id: "timing-new-years-eve",
      title: "New Year's Eve",
      description: "A bowl is played on Dec 31.",
      category: "Timing",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        return d.getMonth() === 11 && d.getDate() === 31;
      })
    }),
    makeSquare({
      id: "timing-new-years-day",
      title: "New Year's Day",
      description: "A game is played on Jan 1.",
      category: "Timing",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        return d.getMonth() === 0 && d.getDate() === 1;
      })
    }),
    makeSquare({
      id: "timing-early-kickoff",
      title: "Early Kickoff",
      description: "A bowl starts before noon.",
      category: "Timing",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        if (!Number.isFinite(bowl.time24)) return false;
        return bowl.time24 < 12;
      })
    }),
    makeSquare({
      id: "timing-late-kickoff",
      title: "After Dark",
      description: "A bowl starts at 8 PM or later.",
      category: "Timing",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        if (!Number.isFinite(bowl.time24)) return false;
        return bowl.time24 >= 20;
      })
    }),
    makeSquare({
      id: "timing-weekend",
      title: "Weekend Bowl",
      description: "A game lands on Saturday or Sunday.",
      category: "Timing",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        const day = d.getDay();
        return day === 0 || day === 6;
      })
    }),
    makeSquare({
      id: "timing-jan-5-plus",
      title: "Deep January",
      description: "A bowl is played on Jan 5 or later.",
      category: "Timing",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const d = bowl.dateObj;
        if (!d) return false;
        return d.getMonth() === 0 && d.getDate() >= 5;
      })
    }),

    // Network
    makeSquare({
      id: "network-espn",
      title: "ESPN Spotlight",
      description: "A bowl airs on ESPN.",
      category: "Network",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "espn"))
    }),
    makeSquare({
      id: "network-espn2",
      title: "ESPN2 Feature",
      description: "A bowl airs on ESPN2.",
      category: "Network",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "espn2"))
    }),
    makeSquare({
      id: "network-abc",
      title: "ABC Showcase",
      description: "A bowl airs on ABC.",
      category: "Network",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "abc"))
    }),
    makeSquare({
      id: "network-fox",
      title: "FOX Broadcast",
      description: "A bowl airs on FOX.",
      category: "Network",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "fox"))
    }),
    makeSquare({
      id: "network-cbs",
      title: "CBS Broadcast",
      description: "A bowl airs on CBS.",
      category: "Network",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "cbs"))
    }),
    makeSquare({
      id: "network-hbo-max",
      title: "Streaming Stage",
      description: "A bowl streams on HBO Max.",
      category: "Network",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "hbo"))
    }),
    makeSquare({
      id: "network-cw",
      title: "The CW Feature",
      description: "A bowl airs on The CW Network.",
      category: "Network",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => hasNetwork(bowl, "cw"))
    }),
    makeSquare({
      id: "network-non-espn",
      title: "Non-ESPN Broadcast",
      description: "A bowl airs somewhere outside ESPN/ESPN2.",
      category: "Network",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const net = normalizeText(bowl.network);
        if (!net) return false;
        return !net.includes("espn");
      })
    }),

    // Flags/Weirdness
    makeSquare({
      id: "flag-cfp",
      title: "CFP Spotlight",
      description: "A College Football Playoff game is played.",
      category: "Flags",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.cfp === "1")
    }),
    makeSquare({
      id: "flag-indoor",
      title: "Indoor Bowl",
      description: "A game is played under a roof.",
      category: "Flags",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => bowl.indoor === "1")
    }),
    makeSquare({
      id: "flag-ranked-vs-ranked",
      title: "Ranked Matchup",
      description: "Both teams come in with a rank or seed.",
      category: "Flags",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeRank = getTeamRank(ctx.teamById, bowl.homeId);
        const awayRank = getTeamRank(ctx.teamById, bowl.awayId);
        return Number.isFinite(homeRank) && Number.isFinite(awayRank);
      })
    }),
    makeSquare({
      id: "flag-top-10-team",
      title: "Top 10 Appears",
      description: "A top-10 ranked team takes the field.",
      category: "Flags",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeRank = getTeamRank(ctx.teamById, bowl.homeId);
        const awayRank = getTeamRank(ctx.teamById, bowl.awayId);
        return (Number.isFinite(homeRank) && homeRank <= 10) || (Number.isFinite(awayRank) && awayRank <= 10);
      })
    }),
    makeSquare({
      id: "flag-top-5-win",
      title: "Top 5 Wins",
      description: "A top-5 team wins its bowl.",
      category: "Flags",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const winnerRank = getTeamRank(ctx.teamById, bowl.winnerId);
        return Number.isFinite(winnerRank) && winnerRank <= 5;
      })
    }),
    makeSquare({
      id: "flag-unranked-upset",
      title: "Unranked Upset",
      description: "An unranked team beats a ranked opponent.",
      category: "Flags",
      rarity: "Rare",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const winnerRank = getTeamRank(ctx.teamById, bowl.winnerId);
        const loserId = bowl.winnerId === bowl.homeId ? bowl.awayId : bowl.homeId;
        const loserRank = getTeamRank(ctx.teamById, loserId);
        return !Number.isFinite(winnerRank) && Number.isFinite(loserRank);
      })
    }),
    makeSquare({
      id: "flag-rank-gap-10",
      title: "Rank Gap",
      description: "Teams are separated by 10+ spots in rank.",
      category: "Flags",
      rarity: "Medium",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeRank = getTeamRank(ctx.teamById, bowl.homeId);
        const awayRank = getTeamRank(ctx.teamById, bowl.awayId);
        if (!Number.isFinite(homeRank) || !Number.isFinite(awayRank)) return false;
        return Math.abs(homeRank - awayRank) >= 10;
      })
    }),
    makeSquare({
      id: "flag-unranked-vs-unranked",
      title: "Unranked Duel",
      description: "Both teams enter without a rank or seed.",
      category: "Flags",
      rarity: "Common",
      evaluate: (ctx) => evalAnyCompleted(ctx, (bowl) => {
        const homeRank = getTeamRank(ctx.teamById, bowl.homeId);
        const awayRank = getTeamRank(ctx.teamById, bowl.awayId);
        return !Number.isFinite(homeRank) && !Number.isFinite(awayRank);
      })
    })
  ];

  const BingoPage = () => {
    const { schedule, bowlGames, picksIds, teamById, loading, error } = RC.data.useLeagueData();
    const [selectedPlayer, setSelectedPlayer] = useState("");

    const players = useMemo(() => {
      if (!Array.isArray(picksIds)) return [];
      return picksIds.filter(p => p && p.Name).map(p => ({ name: p.Name, row: p }));
    }, [picksIds]);

    useEffect(() => {
      if (!selectedPlayer && players.length) {
        setSelectedPlayer(players[0].name);
      }
    }, [players, selectedPlayer]);

    const seasonYear = useMemo(() => {
      const rows = Array.isArray(schedule) ? schedule : [];
      let maxYear = 0;
      rows.forEach((g) => {
        const d = safeDate(g && g.Date);
        if (d) maxYear = Math.max(maxYear, d.getFullYear());
      });
      return maxYear || new Date().getFullYear();
    }, [schedule]);

    const dataCtx = useMemo(() => {
      const rows = Array.isArray(schedule) ? schedule : [];
      const bowlsRaw = Array.isArray(bowlGames) ? bowlGames : [];
      const playerRows = Array.isArray(picksIds) ? picksIds.filter(p => p && p.Name) : [];

      const bowlGamesById = {};
      const bowlGamesByName = {};
      bowlsRaw.forEach((row) => {
        const bowlId = normalizeId(getFirst(row, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"]));
        const bowlName = getFirst(row, ["Bowl Name", "Bowl", "BowlName"]);
        if (bowlId) bowlGamesById[bowlId] = row;
        if (bowlName) bowlGamesByName[normalizeText(bowlName)] = row;
      });

      const bowls = rows.map((row) => {
        const bowlId = normalizeId(getFirst(row, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"]));
        const bowlName = getFirst(row, ["Bowl Name", "Bowl", "BowlName"]);
        const raw = bowlId ? bowlGamesById[bowlId] : bowlGamesByName[normalizeText(bowlName)];

        const homeId = normalizeId(getFirst(row, ["Home ID", "HomeID"]));
        const awayId = normalizeId(getFirst(row, ["Away ID", "AwayID"]));
        const winnerId = normalizeId(getFirst(row, ["Winner ID", "WinnerID"]));
        const favoriteId = normalizeId(getFirst(row, ["Favorite ID", "FavoriteID"]));
        const spread = getFirst(row, ["Spread", "Line", "Vegas Spread"]);
        const total = getFirst(row, ["Total", "O/U", "Over/Under", "OU", "O-U", "Vegas Total"]);

        const homePts = parseNumber(getFirst(raw, ["Home Pts", "Home Points", "HomeScore", "Home Score", "HomePts", "Home PTS", "Home Final"]));
        const awayPts = parseNumber(getFirst(raw, ["Away Pts", "Away Points", "AwayScore", "Away Score", "AwayPts", "Away PTS", "Away Final"]));

        const network = getFirst(row, ["Network", "TV"]) || getFirst(raw, ["Network", "TV"]);

        const cfpRaw = getFirst(row, ["CFP"]) || getFirst(raw, ["CFP?", "CFP", "Playoff", "Playoff?"]);
        const indoorRaw = getFirst(raw, ["Indoor", "Indoor?", "Indoors", "Dome", "Dome?"]);

        const dateObj = safeDate(getFirst(row, ["Date"]));
        const time24 = parseTimeTo24(getFirst(row, ["Time"]));

        return {
          bowlId,
          bowlName,
          date: getFirst(row, ["Date"]),
          time: getFirst(row, ["Time"]),
          dateObj,
          time24,
          network,
          homeId,
          awayId,
          winnerId,
          favoriteId,
          spread,
          total,
          homePts,
          awayPts,
          cfp: to01(cfpRaw),
          indoor: to01(indoorRaw)
        };
      }).filter(b => b.bowlName);

      const completedBowls = bowls.filter(b => b.winnerId && Number.isFinite(b.homePts) && Number.isFinite(b.awayPts));

      const bowlIds = bowls.map(b => b.bowlId).filter(Boolean);
      const picksByBowl = {};
      bowlIds.forEach((id) => { picksByBowl[id] = { total: 0, counts: {} }; });

      playerRows.forEach((row) => {
        bowlIds.forEach((bowlId) => {
          const pickId = normalizeId(row[bowlId]);
          if (!pickId) return;
          const entry = picksByBowl[bowlId];
          if (!entry) return;
          entry.total += 1;
          entry.counts[pickId] = (entry.counts[pickId] || 0) + 1;
        });
      });

      const pickStatsByBowl = {};
      bowlIds.forEach((bowlId) => {
        const entry = picksByBowl[bowlId];
        if (!entry || !entry.total) {
          pickStatsByBowl[bowlId] = { total: 0, counts: {}, topId: "", topPct: 0 };
          return;
        }
        const entries = Object.entries(entry.counts).sort((a, b) => b[1] - a[1]);
        const top = entries[0];
        const topId = top ? top[0] : "";
        const topPct = top ? (top[1] / entry.total) * 100 : 0;
        pickStatsByBowl[bowlId] = {
          total: entry.total,
          counts: entry.counts,
          topId,
          topPct
        };
      });

      const playerRow = playerRows.find(p => p.Name === selectedPlayer) || null;

      return {
        bowls,
        completedBowls,
        picksByBowl,
        pickStatsByBowl,
        playerRow,
        playerCount: playerRows.length,
        teamById: teamById || {}
      };
    }, [schedule, bowlGames, picksIds, teamById, selectedPlayer]);

    const cardSquares = useMemo(() => {
      if (!selectedPlayer || !dataCtx.bowls.length) return [];

      const seed = `${seasonYear}|${selectedPlayer}|RobertsCupBingo`;
      const rng = mulberry32(hashString(seed));

      const selectedBank = selectBankSquares(BINGO_BANK, rng);
      const grid = new Array(25).fill(null);

      const starterById = {};
      STARTER_SQUARES.forEach((sq) => { starterById[sq.id] = sq; });

      Object.keys(STARTER_POSITIONS).forEach((pos) => {
        const idx = Number(pos);
        const squareId = STARTER_POSITIONS[pos];
        grid[idx] = starterById[squareId] || null;
      });

      grid[12] = FREE_SPACE;

      const openSlots = grid.map((sq, idx) => (sq ? null : idx)).filter(idx => idx !== null);
      selectedBank.forEach((sq, idx) => {
        const slot = openSlots[idx];
        if (slot === undefined) return;
        grid[slot] = sq;
      });

      return grid.map((sq) => {
        if (!sq) return null;
        if (sq.isFree) {
          return { ...sq, hit: true, triggeredBy: "" };
        }
        const result = safeEvaluateSquare(sq, dataCtx);
        return {
          ...sq,
          hit: result.hit,
          triggeredBy: result.triggeredBy || ""
        };
      });
    }, [selectedPlayer, dataCtx, seasonYear]);

    const stats = useMemo(() => {
      const hits = cardSquares.filter(sq => sq && sq.hit).length;
      const bingos = countBingos(cardSquares);
      return { hits, bingos };
    }, [cardSquares]);

    if (loading) return <Spinner text="Loading Bingo..." />;
    if (error) return <Err message={(error && (error.message || String(error))) || "Failed to load bingo data"} />;

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-24">
        <div className="bg-white pt-8 pb-8 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl text-blue-900 font-bold mb-1">Bowl Bingo</h2>
            <p className="text-gray-600 text-sm">Each player gets a unique, season-long card.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-16 rc-bingo-shell">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="appearance-none bg-white border border-gray-300 text-gray-900 text-lg rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-4 font-bold shadow-sm text-center"
              >
                {players.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Squares Hit</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {stats.hits}<span className="text-sm font-bold text-slate-400">/25</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bingos</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats.bingos}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-5 gap-3 rc-bingo-card">
            {cardSquares.map((square, idx) => {
              if (!square) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[120px] rounded-xl border border-dashed border-slate-200 bg-white/60"
                  />
                );
              }
              const hit = square.hit;
              return (
                <div
                  key={square.id}
                  className={`min-h-[120px] rounded-xl border p-3 shadow-sm transition-colors ${hit ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{square.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${hit ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
                      {hit ? "Hit" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-snug text-slate-700">{square.description}</p>
                  {hit && square.triggeredBy ? (
                    <div className="mt-3 text-[11px] font-medium text-slate-500">
                      Triggered by: {square.triggeredBy}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  function makeSquare(def) {
    return def;
  }

  function normalizeId(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  }

  function normalizeText(val) {
    return String(val || "").trim().toLowerCase();
  }

  function getFirst(row, keys) {
    if (!row) return "";
    for (const key of keys) {
      const v = row[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  function parseNumber(val) {
    if (val === null || val === undefined) return null;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "").trim();
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function to01(val) {
    const s = String(val || "").trim();
    if (!s) return "0";
    if (/^(1|true|yes|y)$/i.test(s)) return "1";
    return "0";
  }

  function safeDate(val) {
    const s = String(val || "").trim();
    if (!s) return null;
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  function parseTimeTo24(val) {
    const s = String(val || "").trim();
    if (!s) return null;
    const match = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    return hours + minutes / 60;
  }

  function getTeamScore(bowl, teamId) {
    if (!teamId) return null;
    if (teamId === bowl.homeId) return bowl.homePts;
    if (teamId === bowl.awayId) return bowl.awayPts;
    return null;
  }

  function getSpreadInfo(bowl) {
    if (!bowl.favoriteId) return null;
    const spread = parseNumber(bowl.spread);
    if (!Number.isFinite(spread)) return null;
    const line = Math.abs(spread);
    const underdogId = bowl.favoriteId === bowl.homeId ? bowl.awayId : bowl.homeId;
    if (!underdogId) return null;
    const favoriteScore = getTeamScore(bowl, bowl.favoriteId);
    const underdogScore = getTeamScore(bowl, underdogId);
    if (!Number.isFinite(favoriteScore) || !Number.isFinite(underdogScore)) return null;
    const favMargin = favoriteScore - underdogScore;
    return { line, favMargin };
  }

  function evalAnyCompleted(ctx, predicate) {
    for (const bowl of ctx.completedBowls) {
      if (predicate(bowl, ctx)) return { hit: true, triggeredBy: bowl.bowlName };
    }
    return { hit: false };
  }

  function safeEvaluateSquare(square, ctx) {
    try {
      const result = square.evaluate ? square.evaluate(ctx) : { hit: false };
      return { hit: Boolean(result && result.hit), triggeredBy: result && result.triggeredBy };
    } catch (err) {
      console.error("Bingo square error:", square.id, err);
      return { hit: false };
    }
  }

  function selectBankSquares(bank, rng) {
    const byCategory = {};
    bank.forEach((sq) => {
      if (!byCategory[sq.category]) byCategory[sq.category] = [];
      byCategory[sq.category].push(sq);
    });

    const selected = [];
    const used = new Set();
    let rareCount = 0;

    const tryAdd = (sq) => {
      if (!sq || used.has(sq.id)) return false;
      if (sq.rarity === "Rare" && rareCount >= 6) return false;
      used.add(sq.id);
      if (sq.rarity === "Rare") rareCount += 1;
      selected.push(sq);
      return true;
    };

    CATEGORIES.forEach((cat) => {
      const options = seededShuffle(byCategory[cat] || [], rng);
      for (const sq of options) {
        if (tryAdd(sq)) break;
      }
    });

    const shuffledAll = seededShuffle(bank, rng);
    for (const sq of shuffledAll) {
      if (selected.length >= 16) break;
      tryAdd(sq);
    }

    if (selected.length < 16) {
      for (const sq of shuffledAll) {
        if (selected.length >= 16) break;
        if (!used.has(sq.id)) {
          selected.push(sq);
          used.add(sq.id);
        }
      }
    }

    return selected.slice(0, 16);
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(list, rng) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function countBingos(cardSquares) {
    const hits = (idx) => cardSquares[idx] && cardSquares[idx].hit;
    const lines = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20]
    ];

    return lines.reduce((count, line) => {
      const hitLine = line.every(idx => hits(idx));
      return count + (hitLine ? 1 : 0);
    }, 0);
  }

  function getConfForTeam(teamById, teamId) {
    if (!teamId) return "";
    const team = teamById && teamById[teamId];
    if (!team) return "";
    return normalizeText(
      getFirst(team, ["Conference", "Conf", "Conference Name", "Team Conf", "Team Conference"])
    );
  }

  function isGroupOf6(conf) {
    if (!conf) return false;
    return [
      "aac",
      "american",
      "conference usa",
      "c-usa",
      "cusa",
      "mac",
      "mid-american",
      "mountain west",
      "mwc",
      "sun belt"
    ].some(token => conf.includes(token));
  }

  function isPowerConf(conf) {
    if (!conf) return false;
    return [
      "sec",
      "big ten",
      "big 10",
      "big12",
      "big 12",
      "acc",
      "pac-12",
      "pac 12",
      "pac12"
    ].some(token => conf.includes(token));
  }

  function hasMatchup(ctx, bowl, confGroupA, confGroupB) {
    const homeConf = getConfForTeam(ctx.teamById, bowl.homeId);
    const awayConf = getConfForTeam(ctx.teamById, bowl.awayId);
    const inGroup = (conf, group) => group.some(token => conf.includes(token));

    return (inGroup(homeConf, confGroupA) && inGroup(awayConf, confGroupB)) ||
      (inGroup(homeConf, confGroupB) && inGroup(awayConf, confGroupA));
  }

  function getTeamRank(teamById, teamId) {
    if (!teamId) return null;
    const team = teamById && teamById[teamId];
    if (!team) return null;

    const seedRaw = getFirst(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
    const rankRaw = getFirst(team, ["Ranking", "Rank", "AP Rank", "AP Ranking", "Rk"]);

    const seed = cleanNumber(seedRaw);
    if (Number.isFinite(seed)) return seed;
    const rank = cleanNumber(rankRaw);
    return Number.isFinite(rank) ? rank : null;
  }

  function cleanNumber(val) {
    const raw = String(val || "").trim();
    if (!raw) return null;
    const match = raw.match(/(\d+)/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    return Number.isFinite(num) ? num : null;
  }

  function hasNetwork(bowl, token) {
    const net = normalizeText(bowl.network);
    if (!net) return false;
    if (token === "espn2") return net.includes("espn2");
    if (token === "espn") return net.includes("espn") && !net.includes("espn2");
    if (token === "cw") return net.includes("cw");
    return net.includes(token);
  }

  RC.pages.BingoPage = BingoPage;
})();
