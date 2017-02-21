export interface AggregateStats {
    messageIds: string[],
    latencies: number[],
    responseCodes: {[s:string]:number},
}