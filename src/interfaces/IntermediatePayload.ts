export interface IntermediatePayload {
    stats: {
        _codes: {[s: string]: number }
        _latencies: number[],
        _entries?: [number, string, number, number], //Date.now(), uid, delta, code
        _generatedScenarios?: number,
        _completedScenarios?: number,
        _errors?: any,
        _requestTimestamps?: number[],
        _completedRequests?: number,
        _scenarioLatencies?: number[],
        _matches?: number,
        _customStats?: any,
        _concurrency?: 0,
        _pendingRequests?: 0,
        _scenarioCounter?: {[s: string]: number }
    }
}