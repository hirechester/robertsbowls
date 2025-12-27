(() => {
  window.RC = window.RC || {};
  window.RC.ui = window.RC.ui || {};
  const RC = window.RC;

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



  // Expose UI helpers
  RC.ui.LoadingSpinner = LoadingSpinner;
  RC.ui.ErrorMessage = ErrorMessage;
  RC.ui.StatusPill = StatusPill;
})();
