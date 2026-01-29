import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type CfbdGame = {
  id?: number | string;
  game_id?: number | string;
  gameId?: number | string;
  home_id?: number | string;
  homeId?: number | string;
  away_id?: number | string;
  awayId?: number | string;
  home_points?: number | string;
  homePoints?: number | string;
  away_points?: number | string;
  awayPoints?: number | string;
  start_date?: string;
  startDate?: string;
  venue?: string;
  venue_name?: string;
  venueName?: string;
  city?: string;
  state?: string;
  neutral_site?: boolean;
  neutralSite?: boolean;
  indoor?: boolean;
  excitement_index?: number | string;
  excitementIndex?: number | string;
  tv?: string;
  network?: string;
};

type CfbdLine = {
  id?: number | string;
  game_id?: number | string;
  gameId?: number | string;
  provider?: string;
  providerName?: string;
  spread?: number | string;
  homeSpread?: number | string;
  overUnder?: number | string;
  over_under?: number | string;
  total?: number | string;
};

type CfbdMedia = {
  id?: number | string;
  game_id?: number | string;
  gameId?: number | string;
  media_type?: string;
  mediaType?: string;
  outlet?: string;
  outletName?: string;
  network?: string;
  tv?: string;
};

type CfbdWeather = {
  id?: number | string;
  game_id?: number | string;
  gameId?: number | string;
  temperature?: number | string;
  temp?: number | string;
  weather?: string;
  conditions?: string;
  condition?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-code",
};

function jsonResponse(body: JsonValue, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeId(val: unknown): string {
  const s = String(val ?? "").trim();
  if (!s) return "";
  if (!/^\d+$/.test(s)) return s;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? String(n) : s;
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const s = String(val).trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function pickFirst<T>(list: T[] | undefined | null, predicate?: (item: T) => boolean): T | null {
  if (!Array.isArray(list) || !list.length) return null;
  if (!predicate) return list[0];
  return list.find(predicate) ?? list[0] ?? null;
}

function parseDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) {
    return s.slice(0, 10);
  }
  return null;
}

function parseTime(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s || !s.includes("T")) return null;
  const timePart = s.split("T")[1];
  if (!timePart) return null;
  const match = timePart.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  if (!Number.isFinite(hour)) return null;
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${minute} ${meridiem}`;
}

function selectLine(lines: CfbdLine[] | undefined | null): CfbdLine | null {
  if (!Array.isArray(lines) || !lines.length) return null;
  return pickFirst(lines, (line) => {
    const label = String(line.provider ?? line.providerName ?? "").toLowerCase();
    return label.includes("consensus") || label.includes("average") || label.includes("vegas");
  });
}

function selectMedia(entries: CfbdMedia[] | undefined | null): CfbdMedia | null {
  if (!Array.isArray(entries) || !entries.length) return null;
  return pickFirst(entries, (entry) => {
    const label = String(entry.media_type ?? entry.mediaType ?? "").toLowerCase();
    return label === "tv" || label.includes("tv");
  });
}

function selectWeather(entries: CfbdWeather[] | undefined | null): CfbdWeather | null {
  if (!Array.isArray(entries) || !entries.length) return null;
  return entries[0] ?? null;
}

function formatTemp(val: unknown): string | null {
  const n = toNumber(val);
  if (n === null) return null;
  return `${n}°`;
}

function buildPayload(game: CfbdGame, lines: CfbdLine[] | null, media: CfbdMedia | null, weather: CfbdWeather | null) {
  const payload: Record<string, JsonValue> = {};
  const date = parseDate(game.start_date ?? game.startDate);
  const time = parseTime(game.start_date ?? game.startDate);
  const venue = String(game.venue_name ?? game.venueName ?? game.venue ?? "").trim();
  const city = String(game.city ?? "").trim();
  const state = String(game.state ?? "").trim();
  const tv = String(media?.outlet ?? media?.outletName ?? media?.network ?? media?.tv ?? game.tv ?? game.network ?? "").trim();
  const homeId = normalizeId(game.home_id ?? game.homeId);
  const awayId = normalizeId(game.away_id ?? game.awayId);
  const homePts = toNumber(game.home_points ?? game.homePoints);
  const awayPts = toNumber(game.away_points ?? game.awayPoints);
  const neutral = game.neutral_site ?? game.neutralSite;
  const indoor = game.indoor;
  const excitement = toNumber(game.excitement_index ?? game.excitementIndex);

  if (date) payload.date = date;
  if (time) payload.time = time;
  if (city) payload.city = city;
  if (state) payload.state = state;
  if (venue) payload.stadium = venue;
  if (tv) payload.tv = tv;
  if (homeId) payload.home_id = Number.parseInt(homeId, 10);
  if (awayId) payload.away_id = Number.parseInt(awayId, 10);
  if (homePts !== null) payload.home_pts = homePts;
  if (awayPts !== null) payload.away_pts = awayPts;
  if (homePts !== null && awayPts !== null && homePts !== awayPts) {
    payload.winner_id = homePts > awayPts ? Number.parseInt(homeId, 10) : Number.parseInt(awayId, 10);
  }
  if (typeof neutral === "boolean") payload.neutral = neutral;
  if (typeof indoor === "boolean") payload.indoor = indoor;
  if (excitement !== null) payload.excitement = excitement;

  const line = selectLine(lines || undefined);
  if (line) {
    const spread = toNumber(line.spread ?? line.homeSpread);
    const overUnder = toNumber(line.overUnder ?? line.over_under ?? line.total);
    if (spread !== null) payload.spread = spread;
    if (overUnder !== null) payload.over_under = overUnder;
    if (spread !== null && homeId && awayId) {
      payload.favorite_id = spread < 0 ? Number.parseInt(homeId, 10) : Number.parseInt(awayId, 10);
    }
  }

  if (weather) {
    const tempText = formatTemp(weather.temperature ?? weather.temp);
    const conditions = String(weather.weather ?? weather.conditions ?? weather.condition ?? "").trim();
    if (tempText) payload.temp_text = tempText;
    if (conditions) payload.weather = conditions;
  }

  return payload;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const adminCode = String(req.headers.get("x-admin-code") ?? "").trim();
  if (!adminCode) {
    return jsonResponse({ error: "Missing x-admin-code header" }, 401);
  }

  let payload: { season?: number; cfbdSeason?: number } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const season = Number(payload.season);
  if (!Number.isFinite(season)) {
    return jsonResponse({ error: "Missing or invalid season" }, 400);
  }

  const cfbdSeason = Number.isFinite(Number(payload.cfbdSeason)) ? Number(payload.cfbdSeason) : season - 1;

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") ?? "").trim();
  const supabaseKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const cfbdKey = String(Deno.env.get("CFBD_API_KEY") ?? "").trim();
  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "Missing Supabase service role credentials" }, 500);
  }
  if (!cfbdKey) {
    return jsonResponse({ error: "Missing CFBD_API_KEY secret" }, 500);
  }

  try {
    const bowlUrl = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/bowl_games?select=bowl_id,season&season=eq.${season}`;
    const bowlRows = await fetchJson<{ bowl_id: number | string }[]>(bowlUrl, {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    });

    const bowlIds = new Set(bowlRows.map((row) => normalizeId(row?.bowl_id)).filter(Boolean));

    const cfbdHeaders = {
      Authorization: `Bearer ${cfbdKey}`,
      Accept: "application/json",
    };

    const gamesUrl = new URL("https://api.collegefootballdata.com/games");
    gamesUrl.searchParams.set("year", String(cfbdSeason));
    gamesUrl.searchParams.set("seasonType", "postseason");
    gamesUrl.searchParams.set("classification", "fbs");

    const linesUrl = new URL("https://api.collegefootballdata.com/lines");
    linesUrl.searchParams.set("year", String(cfbdSeason));
    linesUrl.searchParams.set("seasonType", "postseason");
    linesUrl.searchParams.set("classification", "fbs");

    const mediaUrl = new URL("https://api.collegefootballdata.com/games/media");
    mediaUrl.searchParams.set("year", String(cfbdSeason));
    mediaUrl.searchParams.set("seasonType", "postseason");
    mediaUrl.searchParams.set("classification", "fbs");

    const weatherUrl = new URL("https://api.collegefootballdata.com/games/weather");
    weatherUrl.searchParams.set("year", String(cfbdSeason));
    weatherUrl.searchParams.set("seasonType", "postseason");
    weatherUrl.searchParams.set("classification", "fbs");

    const [games, lines, media, weather] = await Promise.all([
      fetchJson<CfbdGame[]>(gamesUrl.toString(), cfbdHeaders),
      fetchJson<CfbdLine[]>(linesUrl.toString(), cfbdHeaders).catch(() => []),
      fetchJson<CfbdMedia[]>(mediaUrl.toString(), cfbdHeaders).catch(() => []),
      fetchJson<CfbdWeather[]>(weatherUrl.toString(), cfbdHeaders).catch(() => []),
    ]);

    const linesById = new Map<string, CfbdLine[]>();
    (lines || []).forEach((line) => {
      const id = normalizeId(line.id ?? line.game_id ?? line.gameId);
      if (!id) return;
      if (!linesById.has(id)) linesById.set(id, []);
      linesById.get(id)?.push(line);
    });

    const mediaById = new Map<string, CfbdMedia[]>();
    (media || []).forEach((entry) => {
      const id = normalizeId(entry.id ?? entry.game_id ?? entry.gameId);
      if (!id) return;
      if (!mediaById.has(id)) mediaById.set(id, []);
      mediaById.get(id)?.push(entry);
    });

    const weatherById = new Map<string, CfbdWeather[]>();
    (weather || []).forEach((entry) => {
      const id = normalizeId(entry.id ?? entry.game_id ?? entry.gameId);
      if (!id) return;
      if (!weatherById.has(id)) weatherById.set(id, []);
      weatherById.get(id)?.push(entry);
    });

    const updates = (games || []).flatMap((game) => {
      const gameId = normalizeId(game.id ?? game.game_id ?? game.gameId);
      if (!gameId || !bowlIds.has(gameId)) return [] as JsonValue[];
      const lineEntries = linesById.get(gameId) ?? null;
      const mediaEntry = selectMedia(mediaById.get(gameId) ?? null);
      const weatherEntry = selectWeather(weatherById.get(gameId) ?? null);
      const update = buildPayload(game, lineEntries, mediaEntry, weatherEntry);
      return [{ bowl_id: gameId, ...update }];
    });

    return jsonResponse({ season, cfbdSeason, count: updates.length, updates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch CFBD data";
    return jsonResponse({ error: message }, 500);
  }
});
