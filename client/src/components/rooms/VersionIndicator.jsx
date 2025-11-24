// Version indicator component showing sync status
const VersionIndicator = ({ isLive, currentVersion, userVersion, onSync, syncing = false }) => {
    if (isLive) {
        return (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-blue-700">✓ Live Mode - Up to date</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-sm font-semibold text-orange-700">
                Viewing Version <span className="font-bold">V{userVersion}</span> (Latest: <span className="font-bold">V{currentVersion}</span>)
            </span>
            <button
                onClick={onSync}
                disabled={syncing}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {syncing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
        </div>
    );
};

export default VersionIndicator;

