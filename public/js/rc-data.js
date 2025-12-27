/* Roberts Cup - Shared league data loader (schedule/picks/history)
   Goal: fetch & parse published Google Sheets CSVs once and share across pages.
   Loaded as: <script src="js/rc-data.js"></script>
*/
(() => {
  window.RC = window.RC || {};
  const RC = window.RC;

  RC.data = RC.data || {};

  const { useState, useEffect, useCallback } = React;

  // Simple in-memory cache shared across the whole SPA session
  const cache = {
    status: "idle",      // "idle" | "loading" | "ready" | "error"
    data: null,          // { schedule, picks, history }
    error: null,
    promise: null,
    ts: null
  };

  async function fetchAndParseAll() {
    if (!RC.csvToJson) throw new Error("RC.csvToJson is not available (rc-config.js must load first).");
    if (!RC.SCHEDULE_URL || !RC.PICKS_URL || !RC.HISTORY_URL) throw new Error("One or more data URLs are missing on RC.*");

    const [scheduleRes, picksRes, historyRes] = await Promise.all([
      fetch(RC.SCHEDULE_URL),
      fetch(RC.PICKS_URL),
      fetch(RC.HISTORY_URL)
    ]);

    const [scheduleText, picksText, historyText] = await Promise.all([
      scheduleRes.text(),
      picksRes.text(),
      historyRes.text()
    ]);

    const schedule = RC.csvToJson(scheduleText);
    const picks = RC.csvToJson(picksText).filter(p => p && p.Name);
    const history = RC.csvToJson(historyText);

    return { schedule, picks, history };
  }

  function loadOnce() {
    if (cache.data && cache.status === "ready") return Promise.resolve(cache.data);
    if (cache.promise) return cache.promise;

    cache.status = "loading";
    cache.error = null;

    cache.promise = fetchAndParseAll()
      .then((data) => {
        cache.data = data;
        cache.status = "ready";
        cache.ts = Date.now();
        return data;
      })
      .catch((err) => {
        cache.error = err;
        cache.status = "error";
        throw err;
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }

  RC.data.prefetch = () => loadOnce().catch(() => {});
  RC.data.refresh = async () => {
    cache.status = "idle";
    cache.data = null;
    cache.error = null;
    cache.ts = null;
    return loadOnce();
  };

  // React hook pages can call to get shared data
  RC.data.useLeagueData = function useLeagueData() {
    const [state, setState] = useState(() => ({
      schedule: cache.data?.schedule || null,
      picks: cache.data?.picks || null,
      history: cache.data?.history || null,
      loading: cache.status !== "ready",
      error: cache.error || null,
      lastUpdated: cache.ts
    }));

    useEffect(() => {
      let cancelled = false;

      // Fast-path: already loaded
      if (cache.data && cache.status === "ready") {
        setState({
          schedule: cache.data.schedule,
          picks: cache.data.picks,
          history: cache.data.history,
          loading: false,
          error: null,
          lastUpdated: cache.ts
        });
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      loadOnce()
        .then((data) => {
          if (cancelled) return;
          setState({
            schedule: data.schedule,
            picks: data.picks,
            history: data.history,
            loading: false,
            error: null,
            lastUpdated: cache.ts
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setState((s) => ({ ...s, loading: false, error: err }));
        });

      return () => {
        cancelled = true;
      };
    }, []);

    const refresh = useCallback(async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const data = await RC.data.refresh();
        setState({
          schedule: data.schedule,
          picks: data.picks,
          history: data.history,
          loading: false,
          error: null,
          lastUpdated: cache.ts
        });
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err }));
      }
    }, []);

    return { ...state, refresh };
  };
})();
