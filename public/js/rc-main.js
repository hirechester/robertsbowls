const { useState, useEffect, useMemo } = React;

// --- CONFIGURATION + HELPERS (loaded from /js/rc-config.js) ---

// --- COMPONENTS ---

const { LoadingSpinner, ErrorMessage, StatusPill } = (window.RC && window.RC.ui) ? window.RC.ui : {};

// --- NAVIGATION (loaded from js/rc-nav.js) ---
const { Navigation } = window.RC;

// --- PAGES ---

// 0. HOME PAGE (loaded from js/rc-page-home.js)
window.RC.pages = window.RC.pages || {};
const { HomePage, StandingsPage, PicksPage, RacePage, BadgesPage, VersusPage, SimulatorPage, ScoutingReportPage, HistoryPage, RulesPage } = window.RC.pages;

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

const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    return (
        <div className="min-h-screen bg-white pt-16">
            <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
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
        </div>
    );
};
const root = ReactDOM.createRoot(document.getElementById("root")); root.render(<App />);
