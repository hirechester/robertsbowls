/* Roberts Cup - Navigation component (extracted from index.html)
   Loaded as: <script type="text/babel" src="js/rc-nav.js"></script>
*/
(() => {
  const { useState } = React;

  window.RC = window.RC || {};
  const RC = window.RC;

// --- NAVIGATION ---
const Navigation = ({ activeTab, setActiveTab }) => {
    const [isOpen, setIsOpen] = useState(false);

    const MENU_ITEMS = [
        { id: 'home', label: 'Home', icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
        { id: 'standings', label: 'Standings', icon: <><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></> },
        { id: 'picks', label: 'Picks', icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path> },
        { id: 'race', label: 'Race', icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
        { id: 'badges', label: 'Badges', icon: <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></> },
        { id: 'versus', label: 'Versus', icon: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></> },
        { id: 'simulator', label: 'Simulator', icon: <><circle cx="12" cy="10" r="8" /><path d="M12 6a4 4 0 0 1 4 4" /><path d="M8 22h8" /><path d="M12 18v4" /></> },
        { id: 'scouting', label: 'Scouting', icon: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></> },
        { id: 'history', label: 'History', icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></> }
    ];

    const handleNav = (id) => {
        setActiveTab(id);
        setIsOpen(false);
        window.scrollTo(0, 0);
    };

    return (
        <>
            {/* Fixed Top Bar - Increased z-index to 100 */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 z-[100] flex items-center justify-between px-4 shadow-lg border-b border-slate-800">
                {/* Branding */}
                <div className="flex items-center gap-2" onClick={() => handleNav('home')}>
                    <span className="text-2xl">🏆</span>
                    <span className="text-xl font-bold text-white font-serif tracking-tight">Roberts Cup</span>
                </div>

                {/* Hamburger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-slate-300 hover:text-white transition-colors focus:outline-none"
                >
                    {isOpen ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Dropdown Menu Overlay - Increased z-index to 90 to cover sticky headers */}
            {isOpen && (
                <div className="fixed inset-0 top-16 z-[90] bg-slate-900/95 backdrop-blur-sm overflow-y-auto">
                    <div className="flex flex-col p-4 gap-2 max-w-lg mx-auto">
                        {MENU_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.id)}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                                    activeTab === item.id
                                    ? "bg-blue-600 text-white shadow-lg ring-1 ring-blue-400"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                }`}
                            >
                                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {item.icon}
                                </svg>
                                <span className="text-lg font-bold">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};


  // Export
  RC.Navigation = Navigation;
})();
