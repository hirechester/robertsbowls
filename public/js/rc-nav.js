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
        { id: 'scouting', label: 'Scouting', icon: <>
          <g transform="scale(0.046875)">
            <path
              d="M332.998,291.918c52.2-71.895,45.941-173.338-18.834-238.123c-71.736-71.728-188.468-71.728-260.195,0
		c-71.746,71.745-71.746,188.458,0,260.204c64.775,64.775,166.218,71.034,238.104,18.844l14.222,14.203l40.916-40.916
		L332.998,291.918z M278.488,278.333c-52.144,52.134-136.699,52.144-188.852,0c-52.152-52.153-52.152-136.717,0-188.861
		c52.154-52.144,136.708-52.144,188.852,0C330.64,141.616,330.64,226.18,278.488,278.333z"
              fill="currentColor"
              stroke="none"
            />
            <path
              d="M109.303,119.216c-27.078,34.788-29.324,82.646-6.756,119.614c2.142,3.489,6.709,4.603,10.208,2.46
		c3.49-2.142,4.594-6.709,2.462-10.198v0.008c-19.387-31.7-17.45-72.962,5.782-102.771c2.526-3.228,1.946-7.898-1.292-10.405
		C116.48,115.399,111.811,115.979,109.303,119.216z"
              fill="currentColor"
              stroke="none"
            />
            <path
              d="M501.499,438.591L363.341,315.178l-47.98,47.98l123.403,138.168c12.548,16.234,35.144,13.848,55.447-6.456
		C514.505,474.576,517.743,451.138,501.499,438.591z"
              fill="currentColor"
              stroke="none"
            />
          </g>
        </> },
        { id: 'history', label: 'History', icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></> },
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
