const { useState, useEffect, useMemo } = React;

// --- CONFIGURATION + HELPERS (loaded from /js/rc-config.js) ---

// --- COMPONENTS ---

const { LoadingSpinner, ErrorMessage, StatusPill } = (window.RC && window.RC.ui) ? window.RC.ui : {};

// --- NAVIGATION (loaded from js/rc-nav.js) ---
const { Navigation } = window.RC;

// --- PAGES ---

// 0. HOME PAGE (loaded from js/rc-page-home.js)
window.RC.pages = window.RC.pages || {};
const { HomePage, StandingsPage, PicksPage, RacePage, BadgesPage, VersusPage, SimulatorPage, ScoutingReportPage, HistoryPage, RulesPage, BingoPage, DailyPage } = window.RC.pages;

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
    'daily'
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

    useEffect(() => {
        const onHashChange = () => {
            const nextTab = getInitialTab();
            setActiveTab(nextTab);
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    return (
        <div className={isPosterOnly ? "min-h-screen bg-white" : "min-h-screen bg-white pt-16"}>
            {!isPosterOnly && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />}
            {activeTab === 'home' && <HomePage />}
            {activeTab === 'standings' && <StandingsPage />}
            {activeTab === 'picks' && <PicksPage />}
            {activeTab === 'race' && <RacePage />}
            {activeTab === 'badges' && <BadgesPage />}
            {activeTab === 'versus' && <VersusPage />}
            {activeTab === 'simulator' && <SimulatorPage />}
        {activeTab === 'scouting' && <ScoutingReportPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'rules' && <RulesPage />}
        {activeTab === 'bingo' && <BingoPage />}
        {activeTab === 'daily' && <DailyPage />}
        </div>
    );
};
const root = ReactDOM.createRoot(document.getElementById("root")); root.render(<App />);
