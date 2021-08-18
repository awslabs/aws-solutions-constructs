# AWS Glue Custom ETL Job

This use case implements an example using the Kinesis Data Streams Glue Job construct.

This use case is designed to be built and deployed into your account from your local environment using the AWS CDK Toolkit (or CLI). For information on the toolkit and how to install and configure it, please see the [guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html).

> **IMPORTANT:** To ensure proper functionality, the AWS Solutions Constructs packages and AWS CDK packages in your project must be the same version. If you are experiencing odd behavior, check in your `package.json` file that all references to CDK modules and AWS Solutions Constructs modules have the same version number, and that none include the preceding caret `^`. Once the versions are aligned, delete `package-lock.json` and the `node_modules` folder and run `npm install` to sync the modules.

## Architecture

The application architecture uses a custom ETL job defined in AWS Glue that takes in data from Amazon Kinesis Data Streams to
process and store it in the target datastore as defined by the ETL script (for this example an S3 bucket location)

![Architecture Diagram](architecture.png)

## Deployment steps

Below are the steps to deploy the use case:

```
npm run build

cdk deploy

```

Post deployment, this example will publish the name of the Kinesis Data Stream in the CloudFormation output. Use that name
to produce sample data into this data stream using the generator code in the `stream-producer` folder. In the `generate_data.py` file, please update the AWS credential portion of the code and then run the following command from the CLI

```
python generate_data.py --region <region-name> --streanname <name-of-the-stream-obtained-from-the-CloudFormation-Output>
```

This will generate data into the Kinesis Data Stream. For this example the AWS Glue Job has to be manually triggered and stopped (either from the CLI or
the AWS web console). This is to make sure that you control the time for which you want to run the job and its corresponding cost. Once triggerred
the ETL transform in AWS Glue writes the data into an S3 bucket. This bucket ARN is published in the CloudFormation output. The job also publishes logs into Amazon CloudWatch Logs. You can also view the job metrics like below.

![Glue CloudWatch Metrics](metrics.png)

&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
