/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

// Stack
// -
// This stack provisions an "existing resource" that simulates use of the restaurant management system with a piece of
// the restaurant's existing infrastructure. In this case, this stack provisions an order archive bucket to which
// the contents of the table in the use case example will output closed orders to.
// -
// In your environment, use the static method fromBucketName() to include an actual existing
// bucket from your environment in this stack. More info:
// https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html#static-fromwbrbucketwbrnamescope-id-bucketname
// -
export class ExistingResources extends Stack {

  // Public variables
  public readonly archiveBucket: s3.Bucket;

  // Constructor
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // An "existing" Amazon S3 bucket that holds archived orders
    this.archiveBucket = new s3.Bucket(this, 'existing-order-archive-bucket');
  }
}
