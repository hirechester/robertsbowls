const { useState, useEffect, useMemo } = React;

// --- CONFIGURATION + HELPERS (loaded from /js/rc-config.js) ---

// --- COMPONENTS ---

const { LoadingSpinner, ErrorMessage, StatusPill } = (window.RC && window.RC.ui) ? window.RC.ui : {};

// --- NAVIGATION (loaded from js/rc-nav.js) ---
const { Navigation } = window.RC;

// --- PAGES ---

// 0. HOME PAGE (loaded from js/rc-page-home.js)
window.RC.pages = window.RC.pages || {};
const { HomePage, StandingsPage, PicksPage, RacePage, BadgesPage, VersusPage, SimulatorPage, ScoutingReportPage, HistoryPage, RulesPage, BingoPage, DailyPage, PredictionsPage, AdminConsolePage, WrappedPage } = window.RC.pages;

// 1. STANDINGS PAGE (loaded from js/rc-page-standings.js)

// (StandingsPage extracted)

// 2. PICKS PAGE (loaded from js/rc-page-picks.js)

// (PicksPage extracted)

// 3. RACE PAGE (loaded from js/rc-page-race.js)

// (RacePage extracted)

// 4. BADGES PAGE (loaded from js/rc-page-badges.js)

// 5. VERSUS PAGE (loaded from js/rc-page-versus.js)

// (VersusPage extracted)

// 6. SIMULATOR PAGE (loaded from js/rc-page-simulator.js)
// (SimulatorPage extracted)

// 7. SCOUTING REPORT PAGE (loaded from js/rc-page-scouting.js)
// (ScoutingReportPage extracted)

// 8. HISTORY PAGE (loaded from js/rc-page-history.js)
// (HistoryPage extracted)

const VALID_TABS = new Set([
    'home',
    'standings',
    'picks',
    'bingo',
    'race',
    'badges',
    'versus',
    'simulator',
    'scouting',
    'history',
    'rules',
    'daily',
    'predictions',
    'admin',
    'wrapped'
]);

const getInitialTab = () => {
    const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
    const path = (window.location.pathname || '').split('/').filter(Boolean).pop() || '';
    const candidate = hash || path.toLowerCase();
    return VALID_TABS.has(candidate) ? candidate : 'home';
};

const App = () => {
    const [activeTab, setActiveTab] = useState(getInitialTab);
    const isPosterOnly = useMemo(() => {
        const params = new URLSearchParams(window.location.search || "");
        return Boolean(params.get("poster"));
    }, []);
    const { appSettings } = (window.RC && window.RC.data) ? window.RC.data.useLeagueData() : { appSettings: null };

    const settingInt = (key) => {
        const entry = appSettings && appSettings[key];
        const raw = entry && (entry.value_int ?? entry.value_text);
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const seasonMode = settingInt("season_mode") || 2;
    const seasonYear = settingInt("season_year");

    const defaultTab = useMemo(() => {
        if (seasonMode === 1) return "predictions";
        if (seasonMode === 3) return "wrapped";
        return "home";
    }, [seasonMode]);

    const allowedTabs = useMemo(() => {
        if (seasonMode === 1) return new Set(["predictions", "history", "admin"]);
        if (seasonMode === 3) return new Set(["wrapped", "history", "admin"]);
        return VALID_TABS;
    }, [seasonMode]);

    useEffect(() => {
        const onHashChange = () => {
            const nextTab = getInitialTab();
            setActiveTab(nextTab);
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    useEffect(() => {
        if (!seasonYear) return;
        const endTwo = String(seasonYear).slice(-2);
        const startYear = seasonYear - 1;
        document.title = `${startYear}-${endTwo} Roberts Cup`;
    }, [seasonYear]);
    useEffect(() => {
        if (!allowedTabs.has(activeTab)) {
            setActiveTab(defaultTab);
        }
    }, [activeTab, allowedTabs, defaultTab]);
    return (
        <div className={isPosterOnly ? "min-h-screen bg-white" : "min-h-screen bg-slate-900 pt-16"}>
            {!isPosterOnly && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} seasonMode={seasonMode} defaultTab={defaultTab} />}
            <div className="min-h-screen bg-white">
                {activeTab === 'home' && allowedTabs.has('home') && <HomePage />}
                {activeTab === 'standings' && allowedTabs.has('standings') && <StandingsPage />}
                {activeTab === 'picks' && allowedTabs.has('picks') && <PicksPage />}
                {activeTab === 'race' && allowedTabs.has('race') && <RacePage />}
                {activeTab === 'badges' && allowedTabs.has('badges') && <BadgesPage />}
                {activeTab === 'versus' && allowedTabs.has('versus') && <VersusPage />}
                {activeTab === 'simulator' && allowedTabs.has('simulator') && <SimulatorPage />}
                {activeTab === 'scouting' && allowedTabs.has('scouting') && <ScoutingReportPage />}
                {activeTab === 'history' && allowedTabs.has('history') && <HistoryPage />}
                {activeTab === 'rules' && allowedTabs.has('rules') && <RulesPage />}
                {activeTab === 'bingo' && allowedTabs.has('bingo') && <BingoPage />}
                {activeTab === 'daily' && allowedTabs.has('daily') && <DailyPage />}
                {activeTab === 'predictions' && allowedTabs.has('predictions') && <PredictionsPage />}
                {activeTab === 'admin' && allowedTabs.has('admin') && <AdminConsolePage />}
                {activeTab === 'wrapped' && allowedTabs.has('wrapped') && <WrappedPage />}
            </div>
        </div>
    );
};
const root = ReactDOM.createRoot(document.getElementById("root")); root.render(<App />);
