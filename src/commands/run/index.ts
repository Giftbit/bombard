import {Options} from "../../interfaces/Options";
import {validate} from 'artillery-core';
import * as aws from 'aws-sdk';
import * as fs from 'fs';
import * as uuid from 'uuid';
import {LambdaPayload} from "../../interfaces/LambdaPayload";
import {LambdaParams} from "../../interfaces/LambdaParams";
import {IntermediatePayload} from "../../interfaces/IntermediatePayload";
import * as sl from 'stats-lite';
import * as _ from 'lodash';
import {AggregateStats} from "../../interfaces/AggregateStats";
import {BombardConfig} from "../../interfaces/BombardConfig";
import * as csv from "csv-parse"

aws.config.apiVersions = {
    lambda: '2015-03-31'
};

aws.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
});

const sqs = new aws.SQS();
const lambda = new aws.Lambda({httpOptions:{timeout:340000}});
let finishedLambdaCount = 0;
let finalSqsCount = 0;
let runId = uuid.v4();

export async function handler(args: Options): Promise<void> {
    const config = readJsonFromFile(args.config) as BombardConfig;

    let lambdaPromises = await invokeLambdas(config, args);

    let receivedStats = await watchSqs(config, args);

    await Promise.all(lambdaPromises);

    console.log("\nAll lambdas finished processing.");

    displayLatencyAggregates(receivedStats.latencies);
    displayResponseCodeAggregates(receivedStats.responseCodes);

    return
}

async function invokeLambdas(conf: BombardConfig, args: Options): Promise<Promise<any>[]> {

    const script = readScriptFromFile(args.script);

    const payloadCsv = await readPayloadFromFile(args.payloadCsv);

    const payload = {
        script: script,
        payload: payloadCsv,
        uid: runId
    };

    const lambdaParams = constructLambdaParameters(conf, payload);

    console.log("Invoking %s Lambdas", args.lambdaCount);
    let lambdaPromises = [];
    for (let i = 0; i < args.lambdaCount; i++) {
        process.stdout.write('/');
        lambdaPromises.push(lambda.invoke(lambdaParams).promise().then((response) => {
                finishedLambdaCount++;
                args.intermediates && console.log("\nLambda finished execution", response.StatusCode);
                process.stdout.write('-');
                return response;
            }
        ))
    }
    return lambdaPromises
}

async function watchSqs(conf: BombardConfig, args: Options): Promise<AggregateStats> {
    let continueWatching = true;

    let receivedStats = {
        messageIds: [],
        latencies: [],
        responseCodes: {},
    };

    while (continueWatching) {
        if (finalSqsCount >= args.lambdaCount) {
            continueWatching = false
        }
        process.stdout.write('.');
        let params = {
            QueueUrl: conf.queueURL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 5,
        };
        let intermediateResults = await sqs.receiveMessage(params).promise();
        if (intermediateResults && intermediateResults.Messages && intermediateResults.Messages.length > 0) {
            intermediateResults.Messages.forEach((message) => {
                handleMessage(conf, args, message, receivedStats);
            })
        }
    }

    return receivedStats
}

function handleMessage(conf: BombardConfig, args: Options, message: aws.SQS.Message, receivedStats: AggregateStats): void {
    const body = JSON.parse(message.Body);
    const messagePayload = JSON.parse(body.Message);
    if (messagePayload.uid == runId) {
        let messageMarkedFinal = false;
        // SQS is at least once delivery, so we should handle duplicate messages.
        if (receivedStats.messageIds.indexOf(message.MessageId) == -1) {
            receivedStats.messageIds.push(message.MessageId);
            if (args.intermediates) {
                displayIntermediateResults(messagePayload);
            } else {
                process.stdout.write('*')
            }
            processIntermediateResults(messagePayload, receivedStats);
            messageMarkedFinal = messagePayload.type === 'final';
        }

        deleteSqsMessage(conf.queueURL, message.ReceiptHandle, messageMarkedFinal)
    } else {
        process.stdout.write('.');
    }
}

function deleteSqsMessage(sqsUrl: string, receiptHandle: string, final: boolean): void {
    let params = {
        QueueUrl: sqsUrl,
        ReceiptHandle: receiptHandle
    };
    sqs.deleteMessage(params).promise()
        .then((response) => {
            if (final) {
                finalSqsCount++
            }
        })
        .catch((error) => console.log("Could not delete SQS message", receiptHandle, error, error.stack));
}

function displayIntermediateResults(intermediateResults: IntermediatePayload): void {
    console.log("\nLambda Reported Intermediate Results:");
    displayLatencyAggregates(intermediateResults.stats._latencies);
    displayResponseCodeAggregates(intermediateResults.stats._codes);
}

export function processIntermediateResults(intermediateResults: IntermediatePayload, receivedStats: AggregateStats): void {
    if (intermediateResults.stats._codes) {
        for (let code in intermediateResults.stats._codes) {
            if (!receivedStats.responseCodes[code]) receivedStats.responseCodes[code] = 0;
            receivedStats.responseCodes[code] += intermediateResults.stats._codes[code];
        }
    }
    if (intermediateResults.stats._latencies) {
        receivedStats.latencies.push(...intermediateResults.stats._latencies);
    }
}

function constructLambdaParameters(conf: BombardConfig, payload: LambdaPayload): LambdaParams {
    const params = {
        FunctionName: conf.lambdaName,
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify(payload)
    };
    return params
}

export async function readPayloadFromFile(payloadCSVFilename: string): Promise<Array<Array<any>>> {
    if (!payloadCSVFilename) {
        return null;
    }
    const filename = getFullFilePath(payloadCSVFilename);

    const csvData = await new Promise<Array<Array<any>>>((resolve, reject) => {
        const data = [];
        fs.createReadStream(filename).pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('error', e => {
                reject(e);
            })
            .on('end', () => {
                resolve(data);
            })
    });

    return csvData
}

export function readScriptFromFile(scriptFilename: string): any {
    const script = readJsonFromFile(scriptFilename);

    let validation = validate(script);
    if (validation.valid) {
        console.log("Script Passes Artillery Validation")
    } else {
        console.log("Artillery script did not validate", validation.errors);
        throw new Error("Artillery script did not validate");
    }
    return script
}

function readJsonFromFile(scriptFilename: string): any {
    const filename = getFullFilePath(scriptFilename);
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function displayResponseCodeAggregates(responseCodes: {[s: string]: number}): void {
    for (let code in responseCodes) {
        console.log('  %s: %s', code, responseCodes[code]);
    }
}

function displayLatencyAggregates(latencies: number[]): void {

    let min = Math.round(_.min(latencies) / 1e6);
    let max = Math.round(_.max(latencies) / 1e6);
    let mean = Math.round(sl.mean(latencies) / 1e6);
    let median = Math.round(sl.median(latencies) / 1e6);
    let p95 = Math.round(sl.percentile(latencies, 0.95) / 1e6);
    let p99 = Math.round(sl.percentile(latencies, 0.99) / 1e6);

    console.log('  min:  %s', min);
    console.log('  max:  %s', max);
    console.log('  mean: %s', mean);
    console.log('  p50:  %s', median);
    console.log('  p95:  %s', p95);
    console.log('  p99:  %s', p99);
}

function getFullFilePath(fileName: string) {
    return fileName.startsWith("\/") ? fileName : process.cwd() + '/' + fileName;
}



