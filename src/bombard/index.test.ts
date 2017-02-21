import * as index from "./"
import * as chai from "chai";
import {IntermediatePayload} from "../interfaces/IntermediatePayload";
import {AggregateStats} from "../interfaces/AggregateStats";

describe("Bombard Command", () => {
    it("Simple Read JSON", () => {
        const script = index.readScriptFromFile("src/test/script.json");

        chai.assert.isObject(script);
        chai.assert.isArray(script.scenarios);
    });

    it("Simple Read CSV", async() => {
        const payload = await index.readPayloadFromFile("src/test/payload.csv");
        chai.assert.isArray(payload);
        chai.assert.isArray(payload[0]);
    });

    it("processIntermediateResults", async() => {
        const intermediateResults = {
            stats: {
                _codes: {
                    "200": 2,
                    "500": 1
                },
                _latencies: [200,300,400]
            }
        } as IntermediatePayload;
        const receivedStats = {
            messageIds: [],
            latencies: [],
            responseCodes: {},
        } as AggregateStats;

        index.processIntermediateResults(intermediateResults, receivedStats);

        chai.assert.isObject(receivedStats.responseCodes);
        chai.assert.equal(receivedStats.responseCodes["200"], 2);
        chai.assert.include(receivedStats.latencies, 200);
        chai.assert.include(receivedStats.latencies, 300);
        chai.assert.include(receivedStats.latencies, 400);
    });
});