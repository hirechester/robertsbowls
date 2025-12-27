/* Roberts Cup - shared config + CSV helpers
   Loaded before Babel/React code (no bundler needed)
*/
(function (global) {
  'use strict';

  const RC = (global.RC = global.RC || {});
  RC.SCHEDULE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=0&single=true&output=csv";
  RC.PICKS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1948765269&single=true&output=csv";
  RC.HISTORY_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1391791324&single=true&output=csv";
  RC.TEAMS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6DAHasgDxAIJfV8r9PnD7Y1Z2UqfwhQeFqnk_iMnQISf7dlvjgNiGYq6Bk6R7BPg8Ipm5AnNVjfGM/pub?gid=1148947895&single=true&output=csv";


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
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || "";
                });
                return obj;
            });
            return data;
        };
})(window);
