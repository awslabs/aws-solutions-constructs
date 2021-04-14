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

/// !cdk-integ *
import { App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { S3ToSqs, S3ToSqsProps } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
const app = new App();

const stack = new Stack(app, 'test-s3-sqs-existing-bucket');

const [myBucket] = defaults.buildS3Bucket(stack, {});

// Currently there is no way to customize the logging bucket, so this
// test will leave a bucket behind
const props: S3ToSqsProps = {
  existingBucketObj: myBucket,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

new S3ToSqs(stack, 'test-s3-sqs', props);
app.synth();
