#!/usr/bin/env ts-node

import * as yargs from "yargs";
import * as aws from 'aws-sdk';
import * as fs from 'fs';
import {ConfigOptions} from "../src/interfaces/ConfigOptions";
import CloudFormation = require("aws-sdk/clients/cloudformation");

aws.config.apiVersions = {
    lambda: '2015-03-31'
};

aws.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
});

const sqs = new aws.SQS();

const argv = yargs
    .option("stack", {
        alias: "s",
        description: "The name of the existing CloudFormation stack to get details from.",
        type: "string",
        'default': "Bombard"
    }).option("filename", {
        alias: "f",
        description: "Filename for the output config file.",
        type: "string",
        'default': "./config.json"
    }).argv as ConfigOptions;

const cf = new aws.CloudFormation();

const describeRequest = {
    StackName: argv.stack
} as CloudFormation.Types.DescribeStacksInput;

console.log(`Fetching details for CloudFormationStack '${argv.stack}'`);
cf.describeStacks(describeRequest).promise()
    .then((response) => {
        if (response.Stacks.length != 1) {
            throw new Error(`Could not find stack '${argv.stack}' in ${process.env.AWS_REGION}. Ensure that you have created the stack in CloudFormation`);
        } else {
            const config = {
                lambdaName: response.Stacks[0].Outputs.find((output) => output.OutputKey == "LambdaName").OutputValue,
                queueURL: response.Stacks[0].Outputs.find((output) => output.OutputKey == "QueueURL").OutputValue,
                cloudWatch: response.Stacks[0].Outputs.find((output) => output.OutputKey == "CloudWatchLogArn").OutputValue,
                stackName: argv.stack
            };
            return config
        }
    })
    .then((config) => {
        const json = JSON.stringify(config);
        console.log(`${json}`);
        fs.writeFileSync(argv.filename, json, 'utf8');
        console.log(`>> ${argv.filename}`);
    }).catch((err) => console.error(err));
