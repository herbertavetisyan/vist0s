import React from 'react';

/**
 * EnrichmentCard Component
 * Displays individual service enrichment result
 */
const EnrichmentCard = ({ result }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'failed':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'timeout':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return '✓';
            case 'failed':
                return '✗';
            case 'timeout':
                return '⏱';
            default:
                return '○';
        }
    };

    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className={`border-2 rounded-lg p-4 mb-3 ${getStatusColor(result.status)}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{getStatusIcon(result.status)}</span>
                    <div>
                        <h3 className="font-bold text-lg uppercase">{result.serviceName}</h3>
                        <p className="text-sm opacity-75">
                            Sequence: {result.sequenceOrder} |
                            {result.responseTime && ` Response time: ${result.responseTime}ms`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                    </span>
                    {(result.responseData || result.errorMessage) && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition"
                        >
                            {expanded ? '▲ Hide' : '▼ Show'}
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                    {result.errorMessage && (
                        <div className="mb-3">
                            <h4 className="font-semibold mb-1">Error:</h4>
                            <p className="text-sm bg-white bg-opacity-50 p-2 rounded">{result.errorMessage}</p>
                        </div>
                    )}

                    {result.responseData && (
                        <div>
                            <h4 className="font-semibold mb-1">Response Data:</h4>
                            <pre className="text-xs bg-white bg-opacity-50 p-3 rounded overflow-auto max-h-96">
                                {JSON.stringify(result.responseData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EnrichmentCard;
