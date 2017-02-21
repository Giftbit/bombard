"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const index = require("./");
const chai = require("chai");
describe("Bombard Command", () => {
    it("Simple Read JSON", () => {
        const script = index.readScriptFromFile("src/test/script.json");
        chai.assert.isObject(script);
        chai.assert.isArray(script.scenarios);
    });
    it("Simple Read CSV", () => __awaiter(this, void 0, void 0, function* () {
        const payload = yield index.readPayloadFromFile("src/test/payload.csv");
        chai.assert.isArray(payload);
        chai.assert.isArray(payload[0]);
    }));
    it("processIntermediateResults", () => __awaiter(this, void 0, void 0, function* () {
        const intermediateResults = {
            stats: {
                _codes: {
                    "200": 2,
                    "500": 1
                },
                _latencies: [200, 300, 400]
            }
        };
        const receivedStats = {
            messageIds: [],
            latencies: [],
            responseCodes: {},
        };
        index.processIntermediateResults(intermediateResults, receivedStats);
        chai.assert.isObject(receivedStats.responseCodes);
        chai.assert.equal(receivedStats.responseCodes["200"], 2);
        chai.assert.include(receivedStats.latencies, 200);
        chai.assert.include(receivedStats.latencies, 300);
        chai.assert.include(receivedStats.latencies, 400);
    }));
});
