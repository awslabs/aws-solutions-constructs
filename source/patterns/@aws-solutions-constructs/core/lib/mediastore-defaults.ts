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

import * as cdk from 'aws-cdk-lib';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';

export function MediaStoreContainerProps(): mediastore.CfnContainerProps {
  return {
    containerName: cdk.Aws.STACK_NAME,
    accessLoggingEnabled: true,
    corsPolicy: [{
      allowedHeaders: [ '*' ],
      allowedMethods: [ 'GET' ],
      allowedOrigins: [ '*' ],
      exposeHeaders: [ '*' ],
      maxAgeSeconds: 3000
    }],
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Sid: 'MediaStoreDefaultPolicy',
        Effect: 'Allow',
        Principal: '*',
        Action: [
          'mediastore:GetObject',
          'mediastore:DescribeObject'
        ],
        Resource: `arn:${cdk.Aws.PARTITION}:mediastore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:container/${cdk.Aws.STACK_NAME}/*`,
        Condition: {
          Bool: {
            'aws:SecureTransport': 'true'
          }
        }
      }]
    }),
    lifecyclePolicy: JSON.stringify({
      rules: [{
        definition: {
          path: [
            { wildcard: '*' }
          ],
          days_since_create: [
            { numeric: ['>', 30] }
          ]
        },
        action: 'EXPIRE'
      }]
    }),
    metricPolicy: {
      containerLevelMetrics: 'ENABLED'
    }
  } as mediastore.CfnContainerProps;
}