# AWS Glue Custom ETL Job

This use case implements an example using the Kinesis Data Streams Glue Job construct.

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

## Deployment Verification

After the stack is deployed successfully, After logging into AWS Console, you can check if the job is configured correctly and can triggered on-demand or on a schedule.

---

&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
