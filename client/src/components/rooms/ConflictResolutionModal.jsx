// Conflict resolution modal for handling version conflicts
const ConflictResolutionModal = ({ isOpen, serverRoom, serverFields, clientFields, onAcceptServer, onOverwriteServer, syncing = false, overwriting = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-blue-100">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">⚠️ Conflict Detected</h2>
                    <p className="text-gray-600">
                        The room data has been modified by another user. Please choose which version to keep.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="text-gray-500">Server Data</span>
                        </h3>
                        <div className="bg-gray-50 border-2 border-gray-200 p-5 rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 font-semibold w-20">Name:</span>
                                <span className="text-gray-800">{serverRoom?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 font-semibold w-20">Type:</span>
                                <span className="text-gray-800">{serverRoom?.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 font-semibold w-20">Capacity:</span>
                                <span className="text-gray-800">{serverRoom?.capacity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 font-semibold w-20">Status:</span>
                                <span className="text-gray-800">{serverRoom?.status}</span>
                            </div>
                            {Object.keys(serverFields || {}).map(key => (
                                <div key={key} className="flex items-center gap-2 pt-2 border-t border-gray-300">
                                    <span className="text-gray-600 font-semibold w-20 capitalize">{key}:</span>
                                    <span className="text-gray-800">{serverFields[key]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="text-blue-600">Your Data</span>
                        </h3>
                        <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-xl space-y-3">
                            {Object.keys(clientFields || {}).map(key => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="text-blue-600 font-semibold w-20 capitalize">{key}:</span>
                                    <span className="text-gray-800">{clientFields[key]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={onAcceptServer}
                        disabled={syncing || overwriting}
                        className="flex-1 px-5 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {syncing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {syncing ? 'Syncing...' : 'Accept Server Changes'}
                    </button>
                    <button
                        onClick={onOverwriteServer}
                        disabled={syncing || overwriting}
                        className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {overwriting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {overwriting ? 'Overwriting...' : 'Overwrite Server'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictResolutionModal;

