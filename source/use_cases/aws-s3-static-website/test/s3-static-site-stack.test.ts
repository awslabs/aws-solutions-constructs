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

import { App } from 'aws-cdk-lib';
import { S3StaticWebsiteStack } from '../lib/s3-static-site-stack';
import { Template } from 'aws-cdk-lib/assertions';

test('default stack', () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, 'S3StaticWebsiteStack');
  const template = Template.fromStack(stack);

  expect(template).toMatchSnapshot();
});

test('check s3 bucket encryption setting', () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, 'S3StaticWebsiteStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    }
  });
});

test('check s3 bucket public access setting', () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, 'S3StaticWebsiteStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('check CR lambda function permissions', () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, 'S3StaticWebsiteStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Policy",{
    "PolicyDocument": {
        "Statement": [
          {
            "Action": [
              "s3:GetObject*",
              "s3:GetBucket*",
              "s3:List*"
            ],
            "Effect": "Allow",
            "Resource": [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      "Ref": "AWS::Partition"
                    },
                    ":s3:::",
                    {
                      "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}"
                    }
                  ]
                ]
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      "Ref": "AWS::Partition"
                    },
                    ":s3:::",
                    {
                      "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}"
                    },
                    "/*"
                  ]
                ]
              }
            ]
          },
          {
            "Action": [
              "s3:GetObject*",
              "s3:GetBucket*",
              "s3:List*",
              "s3:DeleteObject*",
              "s3:PutObject",
              "s3:PutObjectLegalHold",
              "s3:PutObjectRetention",
              "s3:PutObjectTagging",
              "s3:PutObjectVersionTagging",
              "s3:Abort*"
            ],
            "Effect": "Allow",
            "Resource": [
              {
                "Fn::GetAtt": [
                  "CloudFrontToS3S3Bucket9CE6AB04",
                  "Arn"
                ]
              },
              {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::GetAtt": [
                        "CloudFrontToS3S3Bucket9CE6AB04",
                        "Arn"
                      ]
                    },
                    "/*"
                  ]
                ]
              }
            ]
          }
      ]
    },
    PolicyName: "CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756CServiceRoleDefaultPolicy88902FDF",
    "Roles": [
      {
        "Ref": "CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756CServiceRole89A01265"
      }
    ]
});
});
