# Bombard

## Quick Links

1. [Setup](#setup)
2. [Usage](#usage)

## What is Bombard? 

Bombard allows you to run sizable and complex scenario load tests with minimal setup. It is easy to use, easy to learn, runs complex scenarios, and has zero maintenance.  Bombard wraps [Artillery-core](https://github.com/shoreditch-ops/artillery-core) in an Aws Lambda script and allows you to easily run load testing from a given number of lambdas.
  
### Why Bombard

Bombard focuses on the following:

- *Easy to setup.* If you have an AWS account, you are only a few clicks away from running. [AWS CloudFormation](https://aws.amazon.com/cloudformation/) will do all of the heavy lifting for you.   
- *Easy to learn.* Bombard uses [Artillery.io](https://artillery.io/docs)'s JSON scripts. Reading through the documentation and writing your own script should take tens of minutes.  
- *Complex behavior.* Scenarios can include multiple endpoints and values from payload files. Output from an endpoint can be captured and used in subsequent calls.   
- *Zero-maintenance.* AWS Lambda Functions require no maintenance, and you are only charged for when they are used. 
 
There are many other great tools out there to do load testing well. If Bombard does not seem right for your use case, take a look at the [Related Projects](#related-projects) section for a list of a few other tools.
 
### Acknowledgements 

Bombard is motivated and heavily influence by Artillery-Dino (https://github.com/hassy/artillery-dino) by Hassy Veldstra <[h@artillery.io](h@artillery.io)>.   

### Requirements

You will need [npm](https://www.npmjs.com/) and [aws-cli](https://aws.amazon.com/cli/) installed on your machine.
 
You will need an AWS account. You must have sufficient privileges on your AWS account to Create and Invoke a Lambda Function,  
 
### Related Projects
 
[Artillery-Dino](http://veldstra.org/2016/02/18/project-dino-load-testing-on-lambda-with-artillery.html) - "Dino lets you run large scale load tests from AWS Lambda."

[Artillery.io](https://artillery.io/) - "Artillery is a modern, powerful & easy-to-use load testing toolkit. Use it to make your applications stay scalable, performant & resilient under high load."

[Bees With Machine Guns](https://github.com/newsapps/beeswithmachineguns) - "A utility for arming (creating) many bees (micro EC2 instances) to attack (load test) targets (web applications)."

[Gatling](http://gatling.io/#/) - "Gatling is an open-source load testing framework based on Scala, Akka and Netty"

[JMeter](http://jmeter.apache.org/) - "The Apache JMeter™ application is open source software, a 100% pure Java application designed to load test functional behavior and measure performance."

[ab](http://httpd.apache.org/docs/2.2/programs/ab.html) - "ab is a tool for benchmarking your Apache Hypertext Transfer Protocol (HTTP) server. "

[wrk](https://github.com/wg/wrk) - "wrk is a modern HTTP benchmarking tool capable of generating significant load when run on a single multi-core CPU."

[AWS Lambda](https://aws.amazon.com/documentation/lambda/) - "AWS Lambda is a zero-administration compute platform for back-end web developers that runs your code for you in the AWS cloud and provides you with a fine-grained pricing structure."

## Setup

- Clone the repo `git clone git@github.com:Giftbit/bombard.git`.

- Install dependencies `npm install`

- Deploy the CloudFormation stack: 

    [![Setup Bombard using CloudFormation](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=Bombard&templateURL=https://giftbit-public-resources.s3.amazonaws.com/cloudformation/bombard/bombard.0.1.0.yaml)

- Install ts-node globally `npm install ts-node -g`.

- Run `./bin/config.ts`. This will create a `./config.json` file with information about your newly created CloudFormation Stack. (Use `./bin/config.ts -s StackName` if you did not use the default stack name.)  

## Advanced Setup

If you would like to make changes to the CloudFormation template, do not wish to run the template from the above link, or would like to build your own lambda, use the following steps.  

### Build You Own Lambda

The source for the lambda script can be found in `lambda/src`. Build your own lambda by calling ```npm run build```. The resulting index.js will be in `lambda/lib`. The zipped file will be in `lambda/lib/zip`. 

If you have build your own lambda, upload the zipped file to an s3 bucket you control. You will need to change the `LambdaZipS3Key` and `LambdaZipS3Bucket` parameters of the CloudFormation template to point to the new zip file. 

### Deploy CloudFormation Template

Create a CloudFormation Stack using `./CloudFormation/bombard.yaml`. This will:

- Create a Lambda Function from the zipped file provided in the `LambdaZipS3Key` and `LambdaZipS3Bucket` parameters.
- Create a Role and Assume Role Policy for the Lambda Function 
- Create a SNS Topic 
- Create a SQS Queue with a subscription to the SNS Topic, and a QueuePolicy

## Usage 

`./bin/bombard.ts --script script.json -n 1`

Note: You will require AWS credentials with permissions to invoke the lambda and to read the SQS queue. 

### Example Script

script.json
```json
{
  "config": {
    "target": "https://currency.giftbit.com",
    "phases": [{
      "duration": 60,
      "arrivalCount": 20
    }]
  },
  "scenarios": [
    {
      "name": "Basic Request",
      "flow": [
        {
          "get": {
            "url": "/"
          }
        }
      ]
    }
  ]
}
```

See the (Artillery.io guide)[https://artillery.io/docs/basicconcepts.html] for detailed instructions on how to write a test script.  

## Advanced Usage

### Payloads 

Bombard can take in a csv payload file with the `-p` parameter (eg. `-p payload.csv`). This payload will be sent to the Lambda along with your script. 

payload.csv
```csv
secretauth,tt0107290,"best movie ever"
secretauth,tt0369610,"worst movie ever"
```

You can define columns in your csv in your scripts `config` section like so: 
```json
"payload": {
    "fields": [
      "authorization",
      "imdb_id",
      "rating"     
    ]
}
```

The Artillery Lambda will select a random row to use for each scenario. They can be used in your script like so: 
```json
 "scenarios": [
    {     
      "flow": [
        {
          "post": {
            "url": "/movies/{{ imdb_id }}",
            "headers": {
              "Authorization": "{{ authorization }}"
            },
            "json": {
              "rating": "{{ rating }}"
            }
          }
        }
      ]
  }
]
```

## Limitations

AWS Lambda has a timeout of 300 seconds. Artillery scripts that last longer than 300 that will behave poorly. 

## Warning

Bombard allows you to essentially perform a distributed denial-of-service attack. If you do not have permission to use Bombard against a service, do not do it. It is unethical and will almost certainly have legal consequences.     

## License 

You must read and conform to the [AWS Acceptable Use Policy](https://aws.amazon.com/aup/). 

This project is under MPLv2, see [LICENSE.txt](./LICENSE.txt). 