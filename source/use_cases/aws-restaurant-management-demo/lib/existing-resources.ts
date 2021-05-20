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
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';

// Stack
export class ExistingResources extends cdk.Stack {

  // Public variables
  public readonly archiveBucket: s3.Bucket;

  // Constructor
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // An "existing" Amazon S3 bucket that holds archived orders
    const archiveBucket = new s3.Bucket(this, 'existing-order-archive-bucket');

    // Set to public variable
    this.archiveBucket = archiveBucket
  }
}