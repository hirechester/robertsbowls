/* Roberts Cup - shared config + CSV helpers
   Loaded before Babel/React code (no bundler needed)
*/
(function (global) {
  'use strict';

  const RC = (global.RC = global.RC || {});

  // Supabase config
  // Optional Supabase config for Teams (public read)
  RC.SUPABASE_URL = "https://hylpkyymmtckliwlngdu.supabase.co"; // https://<project>.supabase.co
  RC.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1m3Ww4QsfZFQB_SYdJPu_Q_UUnXK7vX"; // public publishable key
  RC.SUPABASE_TEAMS_TABLE = "teams";
  RC.SUPABASE_HALL_OF_FAME_TABLE = "hall_of_fame";
  RC.SUPABASE_PICKS_TABLE = "picks";
  RC.SUPABASE_PICKS_META_TABLE = "picks_meta";
  RC.SUPABASE_APP_SETTINGS_TABLE = "app_settings";
  RC.SUPABASE_BOWL_GAMES_TABLE = "bowl_games";
  RC.SUPABASE_PLAYERS_TABLE = "players";
  RC.SUPABASE_PICKS_BRACKET_TABLE = "picks_bracket";
  RC.SUPABASE_FUNCTIONS_URL = "https://hylpkyymmtckliwlngdu.functions.supabase.co";
  RC.CFBD_SYNC_FUNCTION = "cfbd-bowls-sync";

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
