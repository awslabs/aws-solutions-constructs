/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from "@aws-solutions-constructs/core";
import { CloudFrontToS3 } from "../lib";
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Duration } from "aws-cdk-lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

let mybucket: s3.Bucket;
mybucket = defaults.CreateScrapBucket(stack,   {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
});

const _construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', {
  existingBucketObj: mybucket,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

// Add Cache Policy
const myCachePolicy = new cloudfront.CachePolicy(stack, 'myCachePolicy', {
  cachePolicyName: 'MyPolicy',
  defaultTtl: Duration.minutes(0),
  minTtl: Duration.minutes(0),
  maxTtl: Duration.minutes(0),
});

// Add behavior
_construct.cloudFrontWebDistribution.addBehavior('/images/*.jpg', new origins.S3Origin(mybucket), {
  cachePolicy: myCachePolicy
});

defaults.suppressAutoDeleteHandlerWarnings(stack);
// Synth
app.synth();
