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

import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class S3StaticWebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const construct = new CloudFrontToS3(this, 'CloudFrontToS3', {});

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, 'website-dist'))],
      destinationBucket: construct.s3Bucket!,
    });

    new CfnOutput(this, 'websiteURL', {
      value: 'https://' + construct.cloudFrontWebDistribution.domainName
    });
  }
}