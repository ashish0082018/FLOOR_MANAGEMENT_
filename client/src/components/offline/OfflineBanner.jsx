// Offline banner component
const OfflineBanner = ({ isOnline, queueLength }) => {
    if (isOnline) return null;

    return (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 text-center shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                <span className="text-lg">⚠️</span>
                <span className="font-semibold">You are offline. Changes will be saved locally.</span>
                {queueLength > 0 && (
                    <span className="ml-2 px-3 py-1 bg-orange-700 rounded-full text-sm font-bold shadow-md">
                        {queueLength} pending {queueLength === 1 ? 'change' : 'changes'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default OfflineBanner;

