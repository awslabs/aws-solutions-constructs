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

import { App } from "aws-cdk-lib";
import { S3StaticWebsiteStack } from "../lib/s3-static-site-stack";
import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";

test("default stack", () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, "S3StaticWebsiteStack");
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test("check s3 bucket encryption setting", () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, "S3StaticWebsiteStack");
  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256",
          },
        },
      ],
    },
  });
});

test("check s3 bucket public access setting", () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, "S3StaticWebsiteStack");
  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});

test("check CR lambda function permissions", () => {
  const app = new App();
  const stack = new S3StaticWebsiteStack(app, "S3StaticWebsiteStack");
  expect(stack).toHaveResourceLike("AWS::IAM::Policy",{
    "PolicyDocument": {
        "Statement": [
          {
            "Action": [
              "s3:GetObject",
              "s3:ListBucket"
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
                    ":s3:::wildrydes-us-east-1"
                  ]
                ]
              },
              "arn:aws:s3:::wildrydes-us-east-1/WebApplication/1_StaticWebHosting/website/*"
            ]
          },
          {
            "Action": [
              "s3:ListBucket",
              "s3:GetObject",
              "s3:PutObject",
              "s3:PutObjectAcl",
              "s3:PutObjectVersionAcl",
              "s3:DeleteObject",
              "s3:DeleteObjectVersion",
              "s3:CopyObject"
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
                      "Ref": "CloudFrontToS3S3Bucket9CE6AB04"
                    }
                  ]
                ]
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::",
                    {
                      "Ref": "CloudFrontToS3S3Bucket9CE6AB04"
                    },
                    "/*"
                  ]
                ]
              }
            ]
          }
]
    },
    "PolicyName": "staticContentHandlerServiceRoleDefaultPolicy0F5C5865",
    "Roles": [
      {
        "Ref": "staticContentHandlerServiceRole3B648F21",
      }
    ],
});

  // expect(stack).toHaveResourceLike("AWS::IAM::Policy",{
  //   "Properties": {
  //     "PolicyDocument": {
  //       "Statement": [
  //         {
  //           "Action": [
  //             "s3:GetObject",
  //             "s3:ListBucket"
  //           ],
  //           "Effect": "Allow",
  //           "Resource": [
  //             {
  //               "Fn::Join": [
  //                 "",
  //                 [
  //                   "arn:",
  //                   {
  //                     "Ref": "AWS::Partition"
  //                   },
  //                   ":s3:::wildrydes-us-east-1"
  //                 ]
  //               ]
  //             },
  //             "arn:aws:s3:::wildrydes-us-east-1/WebApplication/1_StaticWebHosting/website/*"
  //           ]
  //         },
  //         {
  //           "Action": [
  //             "s3:ListBucket",
  //             "s3:GetObject",
  //             "s3:PutObject",
  //             "s3:PutObjectAcl",
  //             "s3:PutObjectVersionAcl",
  //             "s3:DeleteObject",
  //             "s3:DeleteObjectVersion",
  //             "s3:CopyObject"
  //           ],
  //           "Effect": "Allow",
  //           "Resource": [
  //             {
  //               "Fn::Join": [
  //                 "",
  //                 [
  //                   "arn:",
  //                   {
  //                     "Ref": "AWS::Partition"
  //                   },
  //                   ":s3:::",
  //                   {
  //                     "Ref": "CloudFrontToS3S3Bucket9CE6AB04"
  //                   }
  //                 ]
  //               ]
  //             },
  //             {
  //               "Fn::Join": [
  //                 "",
  //                 [
  //                   "arn:aws:s3:::",
  //                   {
  //                     "Ref": "CloudFrontToS3S3Bucket9CE6AB04"
  //                   },
  //                   "/*"
  //                 ]
  //               ]
  //             }
  //           ]
  //         }
  //       ],
  //       "Version": "2012-10-17"
  //     },
  //     "PolicyName": "staticContentHandlerServiceRoleDefaultPolicy0F5C5865",
  //     "Roles": [
  //       {
  //         "Ref": "staticContentHandlerServiceRole3B648F21"
  //       }
  //     ]
  //   }
  // });
});
