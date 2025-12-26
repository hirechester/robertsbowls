const { useState, useEffect, useMemo } = React;

// --- CONFIGURATION + HELPERS (loaded from /js/rc-config.js) ---
const { SCHEDULE_URL, PICKS_URL, HISTORY_URL, parseCSV, csvToJson } = window.RC;

// --- COMPONENTS ---

const LoadingSpinner = ({ text }) => (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-500 bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mb-4"></div>
        <p className="font-medium text-blue-900">{text}</p>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white border-l-4 border-red-500 text-red-700 px-6 py-4 rounded shadow-md max-w-lg">
            <h3 className="font-bold mb-1">Data Error</h3>
            <p className="text-sm">{message}</p>
        </div>
    </div>
);

const StatusPill = ({ pick, winner }) => {
    const safePick = pick ? pick.toString().trim() : "";
    const safeWinner = winner ? winner.toString().trim() : "";

    if (!safePick) {
        return <span className="text-gray-300">-</span>;
    }

    // Pending Game
    if (!safeWinner) {
        return (
            <span className="inline-block px-2 py-0.5 rounded-lg border border-transparent text-xs font-medium bg-gray-50 text-gray-900 whitespace-nowrap">
                {safePick}
            </span>
        );
    }

    const isCorrect = safePick.toLowerCase() === safeWinner.toLowerCase();

    if (isCorrect) {
        return (
            <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg border border-green-200 text-xs font-bold bg-green-100 text-green-800 whitespace-nowrap shadow-sm">
                {safePick}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                </svg>
            </span>
        );
    } else {
        return (
            <span className="inline-block px-2 py-0.5 rounded-lg border border-transparent text-xs font-medium bg-red-50 text-red-400 line-through decoration-red-400 opacity-75 whitespace-nowrap">
                {safePick}
            </span>
        );
    }
};

// --- NAVIGATION (loaded from js/rc-nav.js) ---
const { Navigation } = window.RC;

// --- PAGES ---



// 0. HOME PAGE (loaded from js/rc-page-home.js)
window.RC.pages = window.RC.pages || {};
const { HomePage, StandingsPage, PicksPage, RacePage, BadgesPage, VersusPage, SimulatorPage, ScoutingReportPage, HistoryPage } = window.RC.pages;

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
        </div>
    );
};
const root = ReactDOM.createRoot(document.getElementById("root")); root.render(<App />);
