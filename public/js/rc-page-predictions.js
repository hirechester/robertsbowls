/* Roberts Cup - Predictions Page (hidden menu)
   Client-only page for collecting user picks (no backend).
*/
(() => {
  const { useMemo, useState } = React;

  window.RC = window.RC || {};
  window.RC.pages = window.RC.pages || {};
  const RC = window.RC;

  const TEMPLATE_CUSTOM = "custom";
  const TEMPLATE_ALPHA = "alpha";
  const TEMPLATE_ALPHA_NICK = "alpha_nick";
  const TEMPLATE_LONGEST = "longest";
  const TEMPLATE_SHORTEST = "shortest";
  const TEMPLATE_SOUTH = "south";
  const TEMPLATE_VEGAS = "vegas";
  const TEMPLATE_UNDERDOGS = "underdogs";
  const TEMPLATE_NORTH = "north";
  const TEMPLATE_EAST = "east";
  const TEMPLATE_WEST = "west";
  const TEMPLATE_SEC = "sec";
  const TEMPLATE_B1G = "b1g";
  const TEMPLATE_RED = "red";
  const TEMPLATE_BLUE = "blue";
  const TEMPLATE_HOME = "home";
  const TEMPLATE_AWAY = "away";
  const TEMPLATE_CLOSEST = "closest";
  const TEMPLATE_FURTHEST = "furthest";
  const TEMPLATE_ANIMAL = "animal";
  const TEMPLATE_HUMAN = "human";
  const TEMPLATE_VOWELS = "vowels";
  const TEMPLATE_RANDOM = "random";
  const TEMPLATE_ZEBRA = "zebra";
  const TEMPLATE_BIGGEST = "biggest";
  const TEMPLATE_SMALLEST = "smallest";
  const TEMPLATE_LIGHTER = "lighter";
  const TEMPLATE_DARKER = "darker";
  const TEMPLATE_BUCEES = "bucees";

  const BRACKET_SLOTS = {
    OPEN_5_12: "cfp-open-5-12",
    OPEN_6_11: "cfp-open-6-11",
    OPEN_7_10: "cfp-open-7-10",
    OPEN_8_9: "cfp-open-8-9",
    QF_4: "cfp-qf-4",
    QF_3: "cfp-qf-3",
    QF_2: "cfp-qf-2",
    QF_1: "cfp-qf-1",
    SF_1_4: "cfp-sf-1-4",
    SF_2_3: "cfp-sf-2-3",
    CHAMP: "cfp-champ"
  };

  const pickFirst = (row, keys) => {
    for (const k of keys) {
      const val = row && row[k];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };

  const normalizeId = (val) => {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? String(n) : s;
  };

  const to01 = (val) => {
    const s = String(val || "").trim();
    if (!s) return "0";
    if (/^(1|true|yes|y)$/i.test(s)) return "1";
    return "0";
  };

  const cleanNumber = (val) => {
    const raw = String(val || "").trim();
    if (!raw) return "";
    const match = raw.match(/(\d+)/);
    return match ? match[1] : "";
  };

  const getTeamSeedRank = (team) => {
    if (!team) return "";
    const seedRaw = pickFirst(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
    const rankRaw = pickFirst(team, ["Ranking", "Rank", "AP Rank", "AP Ranking", "Rk"]);
    const seedNum = cleanNumber(seedRaw);
    const rankNum = cleanNumber(rankRaw);
    const value = seedNum || rankNum;
    return value ? `#${value}` : "";
  };

  const getTeamLatitude = (team) => {
    if (!team) return null;
    const raw = pickFirst(team, ["Latitude", "Lat", "Lat.", "Team Lat", "Team Latitude"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const getTeamLongitude = (team) => {
    if (!team) return null;
    const raw = pickFirst(team, ["Longitude", "Long", "Long.", "Team Long", "Team Longitude"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const getBowlLatitude = (row) => {
    const raw = pickFirst(row, ["Bowl Latitude", "Bowl Lat", "BowlLat", "Latitude", "Lat"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const getBowlLongitude = (row) => {
    const raw = pickFirst(row, ["Bowl Longitude", "Bowl Long", "BowlLong", "Longitude", "Long"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const toRadians = (deg) => (deg * Math.PI) / 180;

  const haversineMiles = (lat1, lon1, lat2, lon2) => {
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const R = 3958.8;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const parseGameDate = (game) => {
    const dateRaw = pickFirst(game, ["Date"]);
    const timeRaw = pickFirst(game, ["Time"]);
    const stamp = `${dateRaw} ${timeRaw}`.trim();
    const parsed = new Date(stamp);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : Number.NaN;
  };

  const getTeamMeta = (teamById, teamId, fallback) => {
    const key = teamId ? String(teamId).trim() : "";
    const team = key && teamById ? teamById[key] : null;
    const school = team ? String(team["School Name"] || team.School || team.Team || team.Name || "").trim() : "";
    const nickname = team ? String(team["Team Nickname"] || team.Nickname || team["Nick Name"] || team.Mascot || "").trim() : "";
    const logo = team ? String(team.Logo || team["Logo URL"] || team["Logo Url"] || team.LogoUrl || "").trim() : "";
    const hex = team ? String(team["Primary Hex"] || team.Hex || team.Color || team["Primary Color"] || "").trim() : "";
    const seedRank = getTeamSeedRank(team);
    const name = school || String(fallback || "").trim();
    return { name, nickname, logo, hex, seedRank, team };
  };

  const getTeamNickname = (team) => {
    if (!team) return "";
    return String(team["Team Nickname"] || team.Nickname || team["Nick Name"] || team.Mascot || "").trim();
  };

  const getTeamState = (team) => {
    if (!team) return "";
    return String(pickFirst(team, ["State", "School State", "Team State", "State Code", "State Abbr"]) || "").trim();
  };

  const getTeamEnrollment = (team) => {
    if (!team) return null;
    const raw = pickFirst(team, ["Enrollment", "Enroll", "Enrollment Total", "Student Enrollment"]);
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const getTeamConference = (team) => {
    if (!team) return "";
    return pickFirst(team, ["Conference", "Conf", "Conference Name", "Team Conf", "Team Conference"]);
  };

  const hexToRgb = (hex) => {
    const raw = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16)
    };
  };

  const luminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  };

  const rgbToHsl = ({ r, g, b }) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h, s, l };
  };

  const isPatriotRed = (team) => {
    const rgb = hexToRgb(pickFirst(team, ["Primary Hex", "Hex", "Color", "Primary Color"]));
    if (!rgb) return false;
    const { h, s, l } = rgbToHsl(rgb);
    if (l >= 0.88 && s <= 0.18) return false;
    if (s < 0.22) return false;
    return (h <= 20) || (h >= 340);
  };

  const isPatriotBlue = (team) => {
    const rgb = hexToRgb(pickFirst(team, ["Primary Hex", "Hex", "Color", "Primary Color"]));
    if (!rgb) return false;
    const { h, s, l } = rgbToHsl(rgb);
    if (l >= 0.88 && s <= 0.18) return false;
    if (s < 0.22) return false;
    return (h >= 200 && h <= 260);
  };

  const pickByPredicate = (awayMeta, homeMeta, predicate) => {
    const awayMatch = awayMeta?.team ? predicate(awayMeta.team) : false;
    const homeMatch = homeMeta?.team ? predicate(homeMeta.team) : false;
    if (awayMatch === homeMatch) return "";
    return awayMatch ? "away" : "home";
  };

  const normalizeMascotText = (raw) => {
    const text = String(raw ?? "").trim();
    if (!text) return "";
    const upper = text.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    return upper ? ` ${upper} ` : "";
  };

  const ANIMAL_WORDS = [
    "BULLDOGS",
    "DUCKS",
    "COUGARS",
    "LONGHORNS",
    "WILDCATS",
    "WOLVERINES",
    "YELLOW JACKETS",
    "HAWKEYES",
    "FALCONS",
    "ZIPS",
    "RAZORBACKS",
    "RED WOLVES",
    "TIGERS",
    "CARDINALS",
    "BEARS",
    "BRONCOS",
    "EAGLES",
    "BULLS",
    "GOLDEN BEARS",
    "BEARCATS",
    "CHANTICLEERS",
    "BUFFALOES",
    "RAMS",
    "BLUE HENS",
    "GATORS",
    "OWLS",
    "PANTHERS",
    "GAMECOCKS",
    "JAYHAWKS",
    "THUNDERING HERD",
    "TERRAPINS",
    "REDHAWKS",
    "GOLDEN GOPHERS",
    "WOLFPACK",
    "WOLF PACK",
    "LOBOS",
    "HUSKIES",
    "BOBCATS",
    "BEAVERS",
    "NITTANY LIONS",
    "BEARKATS",
    "MUSTANGS",
    "JAGUARS",
    "GOLDEN EAGLES",
    "CARDINAL",
    "HORNED FROGS",
    "BRUINS",
    "WARHAWKS",
    "ROADRUNNERS",
    "HOKIES",
    "BADGERS"
  ];

  const HUMAN_WORDS = [
    "HOOSIERS",
    "RED RAIDERS",
    "REBELS",
    "AGGIES",
    "SOONERS",
    "DUKES",
    "FIGHTING IRISH",
    "COMMODORES",
    "UTES",
    "TROJANS",
    "CAVALIERS",
    "MOUNTAINEERS",
    "SUN DEVILS",
    "BLACK KNIGHTS",
    "49ERS",
    "PIRATES",
    "RAINBOW WARRIORS",
    "FIGHTING ILLINI",
    "RAGIN CAJUNS",
    "MINUTEMEN",
    "SPARTANS",
    "BLUE RAIDERS",
    "CORNHUSKERS",
    "TAR HEELS",
    "COWBOYS",
    "MONARCHS",
    "SEMINOLES",
    "CHIPPEWAS",
    "VOLUNTEERS",
    "KNIGHTS",
    "MINERS",
    "DEMON DEACONS",
    "HILLTOPPERS"
  ];

  const isAnimalNickname = (nickname) => {
    const text = normalizeMascotText(nickname);
    return ANIMAL_WORDS.some(word => text.includes(` ${word} `));
  };

  const isHumanNickname = (nickname) => {
    const text = normalizeMascotText(nickname);
    return HUMAN_WORDS.some(word => text.includes(` ${word} `));
  };

  const compareAlpha = (aName, bName) => {
    const a = String(aName || "").toLowerCase();
    const b = String(bName || "").toLowerCase();
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  };

  const compareLength = (aName, bName) => {
    const a = String(aName || "").trim();
    const b = String(bName || "").trim();
    const aLen = a.length;
    const bLen = b.length;
    if (!aLen && !bLen) return 0;
    if (!aLen) return 1;
    if (!bLen) return -1;
    if (aLen !== bLen) return aLen - bLen;
    return compareAlpha(a, b);
  };

  const countVowels = (value) => {
    const text = String(value || "").toLowerCase();
    const matches = text.match(/[aeiou]/g);
    return matches ? matches.length : 0;
  };

  const toRgba = (hex, alpha) => {
    const raw = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return "";
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = Number.isFinite(alpha) ? alpha : 0.12;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const pickTemplateTeam = (templateKey, awayMeta, homeMeta, gameRaw) => {
    if (!awayMeta?.team || !homeMeta?.team) return awayMeta?.team ? "away" : (homeMeta?.team ? "home" : "");
    if (templateKey === TEMPLATE_ALPHA) {
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_ALPHA_NICK) {
      const awayNick = awayMeta.nickname || awayMeta.name;
      const homeNick = homeMeta.nickname || homeMeta.name;
      return compareAlpha(awayNick, homeNick) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_LONGEST) {
      const result = compareLength(awayMeta.name, homeMeta.name);
      return result >= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_SHORTEST) {
      const result = compareLength(awayMeta.name, homeMeta.name);
      return result <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_SEC) {
      return pickByPredicate(awayMeta, homeMeta, (team) => {
        const conf = String(getTeamConference(team) || "").toLowerCase();
        return conf.includes("sec");
      });
    }
    if (templateKey === TEMPLATE_B1G) {
      return pickByPredicate(awayMeta, homeMeta, (team) => {
        const conf = String(getTeamConference(team) || "").toLowerCase();
        return conf.includes("big ten") || conf.includes("big 10") || conf.includes("b1g");
      });
    }
    if (templateKey === TEMPLATE_RED) {
      return pickByPredicate(awayMeta, homeMeta, isPatriotRed);
    }
    if (templateKey === TEMPLATE_BLUE) {
      return pickByPredicate(awayMeta, homeMeta, isPatriotBlue);
    }
    if (templateKey === TEMPLATE_HOME) {
      if (!homeMeta?.team && !homeMeta?.name) return "";
      return "home";
    }
    if (templateKey === TEMPLATE_AWAY) {
      if (!awayMeta?.team && !awayMeta?.name) return "";
      return "away";
    }
    if (templateKey === TEMPLATE_ANIMAL) {
      return pickByPredicate(awayMeta, homeMeta, (team) => isAnimalNickname(getTeamNickname(team)));
    }
    if (templateKey === TEMPLATE_HUMAN) {
      return pickByPredicate(awayMeta, homeMeta, (team) => isHumanNickname(getTeamNickname(team)));
    }
    if (templateKey === TEMPLATE_VOWELS) {
      const awayText = `${awayMeta.name || ""} ${awayMeta.nickname || ""}`.trim();
      const homeText = `${homeMeta.name || ""} ${homeMeta.nickname || ""}`.trim();
      const awayCount = countVowels(awayText);
      const homeCount = countVowels(homeText);
      if (awayCount === homeCount) return "home";
      return awayCount > homeCount ? "away" : "home";
    }
    if (templateKey === TEMPLATE_BIGGEST || templateKey === TEMPLATE_SMALLEST) {
      const awayEnroll = getTeamEnrollment(awayMeta.team);
      const homeEnroll = getTeamEnrollment(homeMeta.team);
      if (!Number.isFinite(awayEnroll) || !Number.isFinite(homeEnroll)) return "";
      if (awayEnroll === homeEnroll) return "home";
      const pickBig = awayEnroll > homeEnroll ? "away" : "home";
      return templateKey === TEMPLATE_BIGGEST ? pickBig : (pickBig === "away" ? "home" : "away");
    }
    if (templateKey === TEMPLATE_LIGHTER || templateKey === TEMPLATE_DARKER) {
      const awayLum = luminance(awayMeta.hex);
      const homeLum = luminance(homeMeta.hex);
      if (!Number.isFinite(awayLum) || !Number.isFinite(homeLum)) return "";
      if (awayLum === homeLum) return "";
      const pickLighter = awayLum > homeLum ? "away" : "home";
      return templateKey === TEMPLATE_LIGHTER ? pickLighter : (pickLighter === "away" ? "home" : "away");
    }
    if (templateKey === TEMPLATE_BUCEES) {
      const allowed = new Set(["AL", "CO", "FL", "GA", "KY", "MS", "MO", "SC", "TN", "VA", "TX"]);
      return pickByPredicate(awayMeta, homeMeta, (team) => {
        const state = String(getTeamState(team) || "").trim().toUpperCase();
        return allowed.has(state);
      });
    }
    if (templateKey === TEMPLATE_CLOSEST || templateKey === TEMPLATE_FURTHEST) {
      const bowlLat = getBowlLatitude(gameRaw || {});
      const bowlLong = getBowlLongitude(gameRaw || {});
      const awayLat = getTeamLatitude(awayMeta.team);
      const awayLong = getTeamLongitude(awayMeta.team);
      const homeLat = getTeamLatitude(homeMeta.team);
      const homeLong = getTeamLongitude(homeMeta.team);
      const awayDist = haversineMiles(bowlLat, bowlLong, awayLat, awayLong);
      const homeDist = haversineMiles(bowlLat, bowlLong, homeLat, homeLong);
      if (!Number.isFinite(awayDist) || !Number.isFinite(homeDist)) return "";
      if (awayDist === homeDist) return "";
      const pickClosest = awayDist < homeDist ? "away" : "home";
      return templateKey === TEMPLATE_CLOSEST ? pickClosest : (pickClosest === "away" ? "home" : "away");
    }
    if (templateKey === TEMPLATE_SOUTH) {
      const awayLat = getTeamLatitude(awayMeta.team);
      const homeLat = getTeamLatitude(homeMeta.team);
      if (Number.isFinite(awayLat) && Number.isFinite(homeLat)) {
        return awayLat <= homeLat ? "away" : "home";
      }
      if (Number.isFinite(awayLat)) return "away";
      if (Number.isFinite(homeLat)) return "home";
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_NORTH) {
      const awayLat = getTeamLatitude(awayMeta.team);
      const homeLat = getTeamLatitude(homeMeta.team);
      if (Number.isFinite(awayLat) && Number.isFinite(homeLat)) {
        return awayLat >= homeLat ? "away" : "home";
      }
      if (Number.isFinite(awayLat)) return "away";
      if (Number.isFinite(homeLat)) return "home";
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_EAST) {
      const awayLong = getTeamLongitude(awayMeta.team);
      const homeLong = getTeamLongitude(homeMeta.team);
      if (Number.isFinite(awayLong) && Number.isFinite(homeLong)) {
        return awayLong >= homeLong ? "away" : "home";
      }
      if (Number.isFinite(awayLong)) return "away";
      if (Number.isFinite(homeLong)) return "home";
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    if (templateKey === TEMPLATE_WEST) {
      const awayLong = getTeamLongitude(awayMeta.team);
      const homeLong = getTeamLongitude(homeMeta.team);
      if (Number.isFinite(awayLong) && Number.isFinite(homeLong)) {
        return awayLong <= homeLong ? "away" : "home";
      }
      if (Number.isFinite(awayLong)) return "away";
      if (Number.isFinite(homeLong)) return "home";
      return compareAlpha(awayMeta.name, homeMeta.name) <= 0 ? "away" : "home";
    }
    return "";
  };

  const PredictionsPage = () => {
    const { bowlGames, teams, teamById, loading, error } = RC.data.useLeagueData();
    const [pickerName, setPickerName] = useState("");
    const [template, setTemplate] = useState(TEMPLATE_CUSTOM);
    const [picksByBowlId, setPicksByBowlId] = useState({});
    const [tiebreakerScore, setTiebreakerScore] = useState("");

    const gamesData = useMemo(() => {
      if (!Array.isArray(bowlGames)) return { cfp: [], nonCfp: [] };
      const normalized = bowlGames
        .map((row, idx) => {
          const bowlId = normalizeId(pickFirst(row, ["Bowl ID", "BowlID", "Game ID", "GameID", "ID"]));
          const homeId = normalizeId(pickFirst(row, ["Home ID", "HomeID"]));
          const awayId = normalizeId(pickFirst(row, ["Away ID", "AwayID"]));
          const name = pickFirst(row, ["Bowl Name", "Bowl", "BowlName"]);
          const isCfp = to01(pickFirst(row, ["CFP?", "CFP", "CFP ?", "Playoff", "Playoff?"])) === "1";
          const network = pickFirst(row, ["TV", "Network"]);
          return {
            idx,
            bowlId,
            name,
            date: pickFirst(row, ["Date"]),
            time: pickFirst(row, ["Time"]),
            network,
            homeId,
            awayId,
            isCfp,
            raw: row
          };
        })
        .filter((g) => g.bowlId && g.name);

      const cfp = normalized.filter((g) => g.isCfp);
      const nonCfp = normalized.filter((g) => !g.isCfp);
      return { cfp, nonCfp };
    }, [bowlGames]);

    const bracketBase = useMemo(() => {
      if (!Array.isArray(teams)) return null;
      const seeded = teams
        .map((team) => {
          const teamId = normalizeId(pickFirst(team, ["Team ID", "TeamID", "ID", "Id"]));
          const seedRaw = pickFirst(team, ["Seed", "Team Seed", "Seed #", "Seed Number", "Playoff Seed", "CFP Seed"]);
          const seedNum = parseInt(cleanNumber(seedRaw), 10);
          if (!teamId || !Number.isFinite(seedNum)) return null;
          return { teamId, seedNum };
        })
        .filter(Boolean)
        .sort((a, b) => a.seedNum - b.seedNum);

      if (!seeded.length) return null;
      const seedToId = {};
      seeded.forEach(({ teamId, seedNum }) => {
        if (!seedToId[seedNum]) seedToId[seedNum] = teamId;
      });

      return {
        seedToId,
        opening: [
          { slotId: BRACKET_SLOTS.OPEN_5_12, seedA: 5, seedB: 12, label: "5 vs 12" },
          { slotId: BRACKET_SLOTS.OPEN_6_11, seedA: 6, seedB: 11, label: "6 vs 11" },
          { slotId: BRACKET_SLOTS.OPEN_7_10, seedA: 7, seedB: 10, label: "7 vs 10" },
          { slotId: BRACKET_SLOTS.OPEN_8_9, seedA: 8, seedB: 9, label: "8 vs 9" }
        ],
        quarterfinals: [
          { slotId: BRACKET_SLOTS.QF_4, seed: 4, from: BRACKET_SLOTS.OPEN_5_12, label: "4 vs Winner 5/12" },
          { slotId: BRACKET_SLOTS.QF_3, seed: 3, from: BRACKET_SLOTS.OPEN_6_11, label: "3 vs Winner 6/11" },
          { slotId: BRACKET_SLOTS.QF_2, seed: 2, from: BRACKET_SLOTS.OPEN_7_10, label: "2 vs Winner 7/10" },
          { slotId: BRACKET_SLOTS.QF_1, seed: 1, from: BRACKET_SLOTS.OPEN_8_9, label: "1 vs Winner 8/9" }
        ],
        semifinals: [
          { slotId: BRACKET_SLOTS.SF_1_4, fromA: BRACKET_SLOTS.QF_4, fromB: BRACKET_SLOTS.QF_1, label: "Semifinal (1/4)" },
          { slotId: BRACKET_SLOTS.SF_2_3, fromA: BRACKET_SLOTS.QF_3, fromB: BRACKET_SLOTS.QF_2, label: "Semifinal (2/3)" }
        ],
        championship: { slotId: BRACKET_SLOTS.CHAMP, fromA: BRACKET_SLOTS.SF_1_4, fromB: BRACKET_SLOTS.SF_2_3, label: "National Championship" }
      };
    }, [teams]);

    const bracketGames = useMemo(() => {
      if (!bracketBase) return null;
      const resolveSeed = (seed) => bracketBase.seedToId[seed] || "";
      const resolveWinner = (slotId) => picksByBowlId[slotId] || "";

      const opening = bracketBase.opening.map((game) => ({
        slotId: game.slotId,
        label: game.label,
        awayId: resolveSeed(game.seedA),
        homeId: resolveSeed(game.seedB),
        awayFallback: `Seed ${game.seedA}`,
        homeFallback: `Seed ${game.seedB}`,
        allow: null
      }));

      const quarterfinals = bracketBase.quarterfinals.map((game) => {
        const awayId = resolveSeed(game.seed);
        const homeId = resolveWinner(game.from);
        const allow = awayId && homeId ? new Set([awayId, homeId]) : new Set();
        return {
          slotId: game.slotId,
          label: game.label,
          awayId,
          homeId,
          awayFallback: `Seed ${game.seed}`,
          homeFallback: "Winner of Opening Round",
          allow,
          locked: allow.size < 2
        };
      });

      const semifinals = bracketBase.semifinals.map((game) => {
        const awayId = resolveWinner(game.fromA);
        const homeId = resolveWinner(game.fromB);
        const allow = awayId && homeId ? new Set([awayId, homeId]) : new Set();
        return {
          slotId: game.slotId,
          label: game.label,
          awayId,
          homeId,
          awayFallback: "Winner of Quarterfinal",
          homeFallback: "Winner of Quarterfinal",
          allow,
          locked: allow.size < 2
        };
      });

      const champAway = resolveWinner(bracketBase.championship.fromA);
      const champHome = resolveWinner(bracketBase.championship.fromB);
      const champAllow = champAway && champHome ? new Set([champAway, champHome]) : new Set();
      const championship = {
        slotId: bracketBase.championship.slotId,
        label: bracketBase.championship.label,
        awayId: champAway,
        homeId: champHome,
        awayFallback: "Winner of Semifinal",
        homeFallback: "Winner of Semifinal",
        allow: champAllow,
        locked: champAllow.size < 2
      };

      return { opening, quarterfinals, semifinals, championship };
    }, [bracketBase, picksByBowlId]);

    const favoritesByMatchup = useMemo(() => {
      const map = {};
      if (!Array.isArray(bowlGames)) return map;
      bowlGames.forEach((row) => {
        const awayId = normalizeId(pickFirst(row, ["Away ID", "AwayID"]));
        const homeId = normalizeId(pickFirst(row, ["Home ID", "HomeID"]));
        const favoriteId = normalizeId(pickFirst(row, ["Favorite ID", "FavoriteID", "Fav ID", "FavID"]));
        if (!awayId || !homeId || !favoriteId) return;
        map[`${awayId}|${homeId}`] = favoriteId;
        map[`${homeId}|${awayId}`] = favoriteId;
      });
      return map;
    }, [bowlGames]);

    const matchupRawByKey = useMemo(() => {
      const map = {};
      if (!Array.isArray(bowlGames)) return map;
      bowlGames.forEach((row) => {
        const awayId = normalizeId(pickFirst(row, ["Away ID", "AwayID"]));
        const homeId = normalizeId(pickFirst(row, ["Home ID", "HomeID"]));
        if (!awayId || !homeId) return;
        map[`${awayId}|${homeId}`] = row;
        map[`${homeId}|${awayId}`] = row;
      });
      return map;
    }, [bowlGames]);

    const cfpBowlsBySlot = useMemo(() => {
      const map = {};
      if (!Array.isArray(bowlGames)) return map;
      const cfpRows = bowlGames
        .map((row, idx) => ({
          row,
          idx,
          isCfp: to01(pickFirst(row, ["CFP?", "CFP", "CFP ?", "Playoff", "Playoff?"])) === "1"
        }))
        .filter((entry) => entry.isCfp);
      if (!cfpRows.length) return map;
      const sorted = cfpRows.slice().sort((a, b) => {
        const aTime = parseGameDate(a.row);
        const bTime = parseGameDate(b.row);
        if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
        return a.idx - b.idx;
      });

      const slotOrder = [
        BRACKET_SLOTS.OPEN_5_12,
        BRACKET_SLOTS.OPEN_6_11,
        BRACKET_SLOTS.OPEN_7_10,
        BRACKET_SLOTS.OPEN_8_9,
        BRACKET_SLOTS.QF_4,
        BRACKET_SLOTS.QF_3,
        BRACKET_SLOTS.QF_2,
        BRACKET_SLOTS.QF_1,
        BRACKET_SLOTS.SF_1_4,
        BRACKET_SLOTS.SF_2_3,
        BRACKET_SLOTS.CHAMP
      ];

      sorted.forEach((entry, idx) => {
        const slotId = slotOrder[idx];
        if (!slotId) return;
        map[slotId] = entry.row;
      });

      return map;
    }, [bowlGames]);

    const applyTemplate = (templateKey) => {
      if (!templateKey || templateKey === TEMPLATE_CUSTOM) return;
      const nextPicks = {};
      const zebraStartAway = templateKey === TEMPLATE_ZEBRA ? (Math.random() < 0.5) : false;
      let zebraIndex = 0;
      const pickZebra = (awayId, homeId) => {
        if (templateKey !== TEMPLATE_ZEBRA) return "";
        const choices = [awayId, homeId].filter(Boolean);
        if (!choices.length) return "";
        const pickAway = zebraStartAway ? (zebraIndex % 2 === 0) : (zebraIndex % 2 === 1);
        zebraIndex += 1;
        return pickAway ? awayId : homeId;
      };
      const allGames = gamesData.nonCfp;
      allGames.forEach((game) => {
        if (templateKey === TEMPLATE_RANDOM) {
          const choices = [game.awayId, game.homeId].filter(Boolean);
          if (choices.length) {
            const pickId = choices[Math.floor(Math.random() * choices.length)];
            nextPicks[game.bowlId] = pickId;
          }
          return;
        }
        if (templateKey === TEMPLATE_ZEBRA) {
          const pickId = pickZebra(game.awayId, game.homeId);
          if (pickId) nextPicks[game.bowlId] = pickId;
          return;
        }
        if (templateKey === TEMPLATE_VEGAS) {
          const favoriteId = normalizeId(pickFirst(game.raw, ["Favorite ID", "FavoriteID", "Fav ID", "FavID"]));
          if (favoriteId && (favoriteId === game.awayId || favoriteId === game.homeId)) {
            nextPicks[game.bowlId] = favoriteId;
          } else if (game.awayId || game.homeId) {
            nextPicks[game.bowlId] = game.awayId || game.homeId;
          }
          return;
        }
        if (templateKey === TEMPLATE_UNDERDOGS) {
          const favoriteId = normalizeId(pickFirst(game.raw, ["Favorite ID", "FavoriteID", "Fav ID", "FavID"]));
          if (favoriteId && (favoriteId === game.awayId || favoriteId === game.homeId)) {
            const dogId = favoriteId === game.awayId ? game.homeId : game.awayId;
            if (dogId) nextPicks[game.bowlId] = dogId;
          }
          return;
        }

        const awayMeta = getTeamMeta(teamById, game.awayId, pickFirst(game.raw, ["Team 1", "Away Team", "Away"]));
        const homeMeta = getTeamMeta(teamById, game.homeId, pickFirst(game.raw, ["Team 2", "Home Team", "Home"]));
        const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta, game.raw);
        const pickId = choice === "away" ? game.awayId : (choice === "home" ? game.homeId : "");
        if (pickId) nextPicks[game.bowlId] = pickId;
      });

      if (bracketBase) {
        const pickFavorite = (awayId, homeId, fallbackSeedId) => {
          if (templateKey !== TEMPLATE_VEGAS) return "";
          const key = `${awayId}|${homeId}`;
          const favoriteId = favoritesByMatchup[key];
          if (favoriteId && (favoriteId === awayId || favoriteId === homeId)) return favoriteId;
          return fallbackSeedId || awayId || homeId || "";
        };
        const pickUnderdog = (awayId, homeId) => {
          if (templateKey !== TEMPLATE_UNDERDOGS) return "";
          const key = `${awayId}|${homeId}`;
          const favoriteId = favoritesByMatchup[key];
          if (favoriteId && (favoriteId === awayId || favoriteId === homeId)) {
            return favoriteId === awayId ? homeId : awayId;
          }
          return "";
        };
        const pickRandom = (awayId, homeId) => {
          if (templateKey !== TEMPLATE_RANDOM) return "";
          const choices = [awayId, homeId].filter(Boolean);
          if (!choices.length) return "";
          return choices[Math.floor(Math.random() * choices.length)];
        };

        bracketBase.opening.forEach((game) => {
          const awayId = bracketBase.seedToId[game.seedA];
          const homeId = bracketBase.seedToId[game.seedB];
          let pickId = "";
          if (templateKey === TEMPLATE_VEGAS) {
            pickId = pickFavorite(awayId, homeId, awayId || homeId);
          } else if (templateKey === TEMPLATE_UNDERDOGS) {
            pickId = pickUnderdog(awayId, homeId);
          } else if (templateKey === TEMPLATE_RANDOM) {
            pickId = pickRandom(awayId, homeId);
          } else if (templateKey === TEMPLATE_ZEBRA) {
            pickId = pickZebra(awayId, homeId);
          } else {
            const matchupRaw = matchupRawByKey[`${awayId}|${homeId}`] || cfpBowlsBySlot[game.slotId];
            const awayMeta = getTeamMeta(teamById, awayId, `Seed ${game.seedA}`);
            const homeMeta = getTeamMeta(teamById, homeId, `Seed ${game.seedB}`);
            const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta, matchupRaw);
            pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          }
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        bracketBase.quarterfinals.forEach((game) => {
          const awayId = bracketBase.seedToId[game.seed];
          const homeId = nextPicks[game.from];
          if (!awayId || !homeId) return;
          let pickId = "";
          if (templateKey === TEMPLATE_VEGAS) {
            pickId = pickFavorite(awayId, homeId, awayId);
          } else if (templateKey === TEMPLATE_UNDERDOGS) {
            pickId = pickUnderdog(awayId, homeId);
          } else if (templateKey === TEMPLATE_RANDOM) {
            pickId = pickRandom(awayId, homeId);
          } else if (templateKey === TEMPLATE_ZEBRA) {
            pickId = pickZebra(awayId, homeId);
          } else {
            const matchupRaw = matchupRawByKey[`${awayId}|${homeId}`] || cfpBowlsBySlot[game.slotId];
            const awayMeta = getTeamMeta(teamById, awayId, `Seed ${game.seed}`);
            const homeMeta = getTeamMeta(teamById, homeId, "Winner");
            const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta, matchupRaw);
            pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          }
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        bracketBase.semifinals.forEach((game) => {
          const awayId = nextPicks[game.fromA];
          const homeId = nextPicks[game.fromB];
          if (!awayId || !homeId) return;
          let pickId = "";
          if (templateKey === TEMPLATE_VEGAS) {
            pickId = pickFavorite(awayId, homeId, awayId);
          } else if (templateKey === TEMPLATE_UNDERDOGS) {
            pickId = pickUnderdog(awayId, homeId);
          } else if (templateKey === TEMPLATE_RANDOM) {
            pickId = pickRandom(awayId, homeId);
          } else if (templateKey === TEMPLATE_ZEBRA) {
            pickId = pickZebra(awayId, homeId);
          } else {
            const matchupRaw = matchupRawByKey[`${awayId}|${homeId}`] || cfpBowlsBySlot[game.slotId];
            const awayMeta = getTeamMeta(teamById, awayId, "Winner");
            const homeMeta = getTeamMeta(teamById, homeId, "Winner");
            const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta, matchupRaw);
            pickId = choice === "away" ? awayId : (choice === "home" ? homeId : "");
          }
          if (pickId) nextPicks[game.slotId] = pickId;
        });

        const champAway = nextPicks[bracketBase.semifinals[0].slotId];
        const champHome = nextPicks[bracketBase.semifinals[1].slotId];
        if (champAway && champHome) {
          let pickId = "";
          if (templateKey === TEMPLATE_VEGAS) {
            pickId = pickFavorite(champAway, champHome, champAway);
          } else if (templateKey === TEMPLATE_UNDERDOGS) {
            pickId = pickUnderdog(champAway, champHome);
          } else if (templateKey === TEMPLATE_RANDOM) {
            pickId = pickRandom(champAway, champHome);
          } else if (templateKey === TEMPLATE_ZEBRA) {
            pickId = pickZebra(champAway, champHome);
          } else {
            const matchupRaw = matchupRawByKey[`${champAway}|${champHome}`] || cfpBowlsBySlot[BRACKET_SLOTS.CHAMP];
            const awayMeta = getTeamMeta(teamById, champAway, "Winner");
            const homeMeta = getTeamMeta(teamById, champHome, "Winner");
            const choice = pickTemplateTeam(templateKey, awayMeta, homeMeta, matchupRaw);
            pickId = choice === "away" ? champAway : (choice === "home" ? champHome : "");
          }
          if (pickId) nextPicks[BRACKET_SLOTS.CHAMP] = pickId;
        }
      }

      setPicksByBowlId(nextPicks);
    };

    const handleTemplateChange = (value) => {
      setTemplate(value);
      applyTemplate(value);
    };

    const setPick = (bowlId, teamId) => {
      setPicksByBowlId((prev) => ({ ...prev, [bowlId]: teamId }));
      if (template !== TEMPLATE_CUSTOM) setTemplate(TEMPLATE_CUSTOM);
    };

    const renderGamePick = (game, options = {}) => {
      const slotId = game.bowlId || game.slotId;
      const selectedId = picksByBowlId[slotId] || "";
      const awayMeta = getTeamMeta(teamById, game.awayId, game.awayFallback || pickFirst(game.raw, ["Team 1", "Away Team", "Away"]));
      const homeMeta = getTeamMeta(teamById, game.homeId, game.homeFallback || pickFirst(game.raw, ["Team 2", "Home Team", "Home"]));
      const allowed = options.allowedIds || null;

      const renderTeamButton = (meta, teamId, alignRight) => {
        const isSelected = selectedId && selectedId === teamId;
        const isAllowed = !allowed || allowed.has(teamId);
        const borderColor = isSelected && meta.hex ? meta.hex : "";
        const highlight = isSelected ? toRgba(borderColor, 0.12) : "";
        return (
          <button
            type="button"
            onClick={() => setPick(slotId, teamId)}
            disabled={!teamId || !isAllowed}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all text-center w-full ${
              isSelected
                ? "bg-slate-50 shadow-md"
                : "bg-white hover:bg-slate-50"
            } ${!teamId || !isAllowed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={borderColor ? { borderColor, backgroundColor: highlight || undefined } : undefined}
          >
            {meta.logo ? (
              <img src={meta.logo} alt={meta.name} className="w-16 h-16 object-contain drop-shadow" loading="lazy" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">Logo</div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-bold text-slate-900">
                {meta.seedRank ? `${meta.seedRank} ${meta.name || "TBD"}` : (meta.name || "TBD")}
              </div>
              <div className="text-xs text-slate-500">{meta.nickname || " "}</div>
            </div>
          </button>
        );
      };

      return (
        <div key={slotId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-center">
            <div className="text-sm font-bold text-slate-800">{game.name || game.label}</div>
            {game.date && (
              <div className="text-[11px] font-semibold text-gray-500">
                {[game.date, game.time, game.network].filter(Boolean).join(" • ")}
              </div>
            )}
          </div>
          <div className="p-4 flex items-center justify-center gap-3">
            <div className="flex-1">{renderTeamButton(awayMeta, game.awayId, true)}</div>
            <div className="flex-1">{renderTeamButton(homeMeta, game.homeId, false)}</div>
          </div>
        </div>
      );
    };

    if (loading) return <RC.ui.LoadingSpinner text="Loading predictions data..." />;
    if (error) return <RC.ui.ErrorMessage message={error.message || "Failed to load data."} />;

    const champName = bracketGames?.championship?.label || "National Championship";

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="pt-8 pb-8 px-4">
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-3xl text-blue-900 font-bold mb-1">Predictions</h2>
              <p className="text-gray-600 text-sm">Pick the Winners</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  value={pickerName}
                  onChange={(e) => setPickerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full md:w-60 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full md:w-64 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={TEMPLATE_CUSTOM}>Templates</option>
                  <option value={TEMPLATE_ALPHA}>Alphabetical Order (by school)</option>
                  <option value={TEMPLATE_ALPHA_NICK}>Alphabetical Order (by nickname)</option>
                  <option value={TEMPLATE_SOUTH}>Southern Most Team</option>
                  <option value={TEMPLATE_NORTH}>Northern Most Team</option>
                  <option value={TEMPLATE_EAST}>Eastern Most Team</option>
                  <option value={TEMPLATE_WEST}>Western Most Team</option>
                  <option value={TEMPLATE_LONGEST}>Longest School</option>
                  <option value={TEMPLATE_SHORTEST}>Shortest School</option>
                  <option value={TEMPLATE_SEC}>SEC Teams</option>
                  <option value={TEMPLATE_B1G}>Big Ten Teams</option>
                  <option value={TEMPLATE_RED}>Red Teams</option>
                  <option value={TEMPLATE_BLUE}>Blue Teams</option>
                  <option value={TEMPLATE_HOME}>Home Teams</option>
                  <option value={TEMPLATE_AWAY}>Away Teams</option>
                  <option value={TEMPLATE_CLOSEST}>Closest School to Bowl</option>
                  <option value={TEMPLATE_FURTHEST}>Furthest School from Bowl</option>
                  <option value={TEMPLATE_ANIMAL}>Animal Mascots</option>
                  <option value={TEMPLATE_HUMAN}>Human Mascots</option>
                  <option value={TEMPLATE_VOWELS}>Most Vowels</option>
                  <option value={TEMPLATE_BIGGEST}>Bigger School (Enrollment)</option>
                  <option value={TEMPLATE_SMALLEST}>Smaller School (Enrollment)</option>
                  <option value={TEMPLATE_LIGHTER}>Lighter Colors</option>
                  <option value={TEMPLATE_DARKER}>Darker Colors</option>
                  <option value={TEMPLATE_BUCEES}>Schools in States with a Buc-ee's</option>
                  <option value={TEMPLATE_UNDERDOGS}>Vegas Underdogs</option>
                  <option value={TEMPLATE_VEGAS}>Vegas Favorites</option>
                  <option value={TEMPLATE_RANDOM}>I'm Feeling Lucky!</option>
                  <option value={TEMPLATE_ZEBRA}>Zebra Stripes</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPicksByBowlId({});
                    setTiebreakerScore("");
                    setTemplate(TEMPLATE_CUSTOM);
                  }}
                  className="w-full md:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Clear Selections
                </button>
              </div>
            </div>
          </div>

          {bracketGames && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-slate-900">CFP Playoff Bracket</h2>
                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">12-Team Bracket</div>
              </div>
              <div className="grid gap-4">
                <div className="text-sm font-bold text-slate-700">Opening Round</div>
                {bracketGames.opening.map((game) => renderGamePick(game))}
              </div>
              <div className="mt-6 grid gap-4">
                <div className="text-sm font-bold text-slate-700">Quarterfinals</div>
                {bracketGames.quarterfinals.map((game) => (
                  <div key={game.slotId}>
                    {game.locked && (
                      <div className="text-xs text-slate-500 mb-2">Pick the opening round winner to unlock this matchup.</div>
                    )}
                    {renderGamePick(game, { allowedIds: game.allow })}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4">
                <div className="text-sm font-bold text-slate-700">Semifinals</div>
                {bracketGames.semifinals.map((game) => (
                  <div key={game.slotId}>
                    {game.locked && (
                      <div className="text-xs text-slate-500 mb-2">Pick both quarterfinal winners to unlock this matchup.</div>
                    )}
                    {renderGamePick(game, { allowedIds: game.allow })}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                {bracketGames.championship.locked && (
                  <div className="text-xs text-slate-500 mb-2">Pick both semifinal winners to unlock the title matchup.</div>
                )}
                {renderGamePick(bracketGames.championship, { allowedIds: bracketGames.championship.allow })}
                <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800">Tiebreaker Score</div>
                  <div className="text-xs text-slate-500 mb-3">{champName}</div>
                  <input
                    type="number"
                    min="0"
                    value={tiebreakerScore}
                    onChange={(e) => setTiebreakerScore(e.target.value)}
                    placeholder="Enter total points"
                    className="w-full md:w-64 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">All Other Bowls</h2>
            <div className="grid gap-4">
              {gamesData.nonCfp.map((game) => renderGamePick(game))}
            </div>
          </section>

        </div>
      </div>
    );
  };

  RC.pages.PredictionsPage = PredictionsPage;
})();
