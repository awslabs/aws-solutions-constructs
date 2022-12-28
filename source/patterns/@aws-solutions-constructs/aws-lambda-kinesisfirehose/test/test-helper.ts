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

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';

// We can't move this to core, because the dependence upon KinesisFirehoseToS3
// would cause a circular dependency
export function GetTestFirehoseDestination(scope: Construct, id: string): KinesisFirehoseToS3 {
  return new KinesisFirehoseToS3(scope, id, {
    bucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    }
  });
}
