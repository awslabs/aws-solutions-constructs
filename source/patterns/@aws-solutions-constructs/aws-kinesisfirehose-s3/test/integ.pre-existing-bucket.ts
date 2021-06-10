/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack } from "@aws-cdk/core";
import { KinesisFirehoseToS3 } from "../lib";
import { CreateScrapBucket } from '@aws-solutions-constructs/core';
import * as s3 from "@aws-cdk/aws-s3";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();

const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-kinesisfirehose-s3';

const existingBucket = CreateScrapBucket(stack, {});

const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', existingBucket.bucketName);
new KinesisFirehoseToS3(stack, 'test-firehose-s3-pre-existing-bucket-stack', {
  existingBucketObj: mybucket,
});

// Synth
app.synth();
