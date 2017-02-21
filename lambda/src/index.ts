import "babel-polyfill";
import * as awslambda from "aws-lambda";
import * as aws from "aws-sdk";
import {validate, runner} from 'artillery-core';
import {InputEvent} from "./InputEvent";

const debug = true;

var sns = new aws.SNS();

//Based off of https://github.com/hassy/artillery-dino

export default function (evt: InputEvent, ctx: awslambda.Context, callback: awslambda.Callback): void {
    debug && console.log("event", evt);

    const topicArn = process.env["SNS_TOPIC_ARN"];
    const verbose = process.env["VERBOSE"];

    debug && console.log("topicArn", topicArn);

    verbose && console.log("Lambda Logging in Verbose Mode");

    let response = {
        intermediate: 0,
        uid: evt.uid,
        stats: {}
    };

    let validation = validate(evt.script, evt.payload);
    if (!validation.valid) {
        console.log(validation);
        console.log(validation.errors);
        return validation.errors;
    }

    debug && console.log("ScriptValidated");

    let ee = runner(evt.script, evt.payload);

    ee.on('stats', stats => {
        console.log("stats");
        verbose && console.log("Intermediate Stats", stats);
        publish(topicArn,
            JSON.stringify({uid: evt.uid, stats: stats, type: 'intermediate'}),
            function(err, data) {
                if (err) {
                    console.log("Error",err, err.stack);
                    callback(err);
                }
                console.log('stats pushed to SQS');
            });
    });

    ee.on('done', stats => {
        console.log('done');
        verbose && console.log("Final Stats", stats);
        stats.intermediate = [];
        stats.latencies = [];
        if (stats.aggregate) {
            stats.aggregate.latencies = [];
        }

        publish(topicArn,
            JSON.stringify({uid: evt.uid, stats: stats, type: 'final'}),
            function(err, data) {
                if (err) {
                    console.log("Error", err, err.stack);
                    response.stats = stats;
                    publish(topicArn,
                        JSON.stringify({uid: evt.uid, stats: {}}),
                        function() {});
                    callback(err, response);
                }

                callback(null, response);
            });

        callback(null, stats);
    });

    ee.run();
}

function publish(arn: string, msg: string, cb) {
    debug && console.log("publish");
    let params = {
        TopicArn: arn,
        Message: msg
    };

    return sns.publish(params, cb);
}