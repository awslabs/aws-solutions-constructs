/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

/// !cdk-integ *
import { App, Stack } from "@aws-cdk/core";
import { S3ToLambda, S3ToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-konstruk/core';
const app = new App();

// Empty arguments
const stack = new Stack(app, 'test-s3-lambda-existing-bucket-stack');

const myBucket: s3.Bucket = defaults.buildS3Bucket(stack, {});

// Extract the CfnBucket from the s3Bucket
const s3BucketResource = myBucket.node.findChild('Resource') as s3.CfnBucket;

s3BucketResource.cfnOptions.metadata = {
    cfn_nag: {
        rules_to_suppress: [{
            id: 'W51',
            reason: `This S3 bucket Bucket does not need a bucket policy`
        }]
    }
};

const props: S3ToLambdaProps = {
  deployLambda: true,
  lambdaFunctionProps: {
      code: lambda.Code.asset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
  },
  deployBucket: false,
  existingBucketObj: myBucket
};

new S3ToLambda(stack, 'test-s3-lambda', props);
app.synth();