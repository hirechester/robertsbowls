/* Roberts Cup - shared config + CSV helpers
   Loaded before Babel/React code (no bundler needed)
*/
(function (global) {
  'use strict';

  const RC = (global.RC = global.RC || {});

  // Published Google Sheets CSV endpoints (single sheet, multiple tabs)
  // NOTE: Schedule is now derived from Bowl Games, so SCHEDULE_URL is an alias.
  RC.BOWL_GAMES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=235453281&single=true&output=csv";
  RC.SCHEDULE_URL = RC.BOWL_GAMES_URL; // legacy alias (retire the old Schedule tab)
  RC.PICKS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1948765269&single=true&output=csv";
  RC.HISTORY_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1391791324&single=true&output=csv";
  RC.HALL_OF_FAME_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=232197835&single=true&output=csv";
  RC.TEAMS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1148947895&single=true&output=csv";

  // Optional Supabase config for Teams (public read)
  RC.SUPABASE_URL = "https://hylpkyymmtckliwlngdu.supabase.co"; // https://<project>.supabase.co
  RC.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1m3Ww4QsfZFQB_SYdJPu_Q_UUnXK7vX"; // public publishable key
  RC.SUPABASE_TEAMS_TABLE = "teams";
  RC.SUPABASE_HALL_OF_FAME_TABLE = "hall_of_fame";
  RC.SUPABASE_PICKS_TABLE = "picks";
  RC.SUPABASE_PICKS_META_TABLE = "picks_meta";
  RC.SUPABASE_PICKS_SEASON = 2026;

  // --- HELPER: CSV PARSER ---
  RC.parseCSV = function (text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell) currentRow.push(currentCell.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  };

  RC.csvToJson = function (csvText) {
    const rows = RC.parseCSV(csvText);
    const headers = rows[0] || [];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[String(header || "").trim()] = (row[index] || "").toString().trim();
      });
      return obj;
    });
    return data;
  };
})(window);
