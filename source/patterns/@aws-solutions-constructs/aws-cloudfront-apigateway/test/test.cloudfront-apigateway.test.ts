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

import { ResourcePart } from '@aws-cdk/assert';
import { CloudFrontToApiGateway } from "../lib";
import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from '@aws-cdk/aws-lambda';
import '@aws-cdk/assert/jest';

function deploy(stack: cdk.Stack) {
  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const [_api] = defaults.RegionalLambdaRestApi(stack, func);

  return new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
    existingApiGatewayObj: _api
  });
}

test('check getter methods', () => {
  const stack = new cdk.Stack();

  const construct: CloudFrontToApiGateway = deploy(stack);

  expect(construct.cloudFrontWebDistribution !== null);
  expect(construct.apiGateway !== null);
  expect(construct.cloudFrontFunction !== null);
  expect(construct.cloudFrontLoggingBucket !== null);
});

test('test cloudfront DomainName', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Origins: [
        {
          DomainName: {
            "Fn::Select": [
              0,
              {
                "Fn::Split": [
                  "/",
                  {
                    "Fn::Select": [
                      1,
                      {
                        "Fn::Split": [
                          "://",
                          {
                            "Fn::Join": [
                              "",
                              [
                                "https://",
                                {
                                  Ref: "LambdaRestApi95870433"
                                },
                                ".execute-api.",
                                {
                                  Ref: "AWS::Region"
                                },
                                ".",
                                {
                                  Ref: "AWS::URLSuffix"
                                },
                                "/",
                                {
                                  Ref: "LambdaRestApiDeploymentStageprodB1F3862A"
                                },
                                "/"
                              ]
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  }, ResourcePart.Properties);
});

test('test api gateway lambda service role', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/lambda/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "LambdaFunctionServiceRolePolicy"
      }
    ]
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket with destroy removal policy and auto delete objects
// --------------------------------------------------------------
test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const stack = new cdk.Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const [_api] = defaults.RegionalLambdaRestApi(stack, func);

  new CloudFrontToApiGateway(stack, 'cloudfront-s3', {
    existingApiGatewayObj: _api,
    cloudfrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  expect(stack).toHaveResource("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "cloudfronts3CloudfrontLoggingBucket5B845143"
    }
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket error providing existing log bucket and logBuckerProps
// --------------------------------------------------------------
test('Cloudfront logging bucket error when providing existing log bucket and logBuckerProps', () => {
  const stack = new cdk.Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const [_api] = defaults.RegionalLambdaRestApi(stack, func);

  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => { new CloudFrontToApiGateway(stack, 'cloudfront-s3', {
    existingApiGatewayObj: _api,
    cloudFrontDistributionProps: {
      logBucket
    },
    cloudfrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });
  };

  expect(app).toThrowError();
});