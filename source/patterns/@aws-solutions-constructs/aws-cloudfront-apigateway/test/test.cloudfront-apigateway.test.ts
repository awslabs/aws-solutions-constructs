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

import { CloudFrontToApiGateway } from "../lib";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Duration} from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
function deploy(stack: cdk.Stack) {

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const regionalLambdaRestApiResponse = defaults.RegionalLambdaRestApi(stack, func);

  return new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
    existingApiGatewayObj: regionalLambdaRestApiResponse.api
  });
}

test('check getter methods', () => {
  const stack = new cdk.Stack();

  const construct: CloudFrontToApiGateway = deploy(stack);

  expect(construct.cloudFrontWebDistribution).toBeDefined();
  expect(construct.apiGateway).toBeDefined();
  expect(construct.cloudFrontFunction).toBeDefined();
  expect(construct.cloudFrontLoggingBucket).toBeDefined();
});

test('test cloudfront DomainName', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
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
  });
});

test('test api gateway lambda service role', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Role", {
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

function createApi() {
  const stack = new cdk.Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const regionalLambdaRestApiResponse = defaults.RegionalLambdaRestApi(stack, func);
  return {stack, api: regionalLambdaRestApiResponse.api};
}

test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const {stack, api} = createApi();

  new CloudFrontToApiGateway(stack, 'cloudfront-apigateway', {
    existingApiGatewayObj: api,
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    OwnershipControls: { Rules: [ { ObjectOwnership: "ObjectWriter" } ] },
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "cloudfrontapigatewayCloudfrontLoggingBucket5948F496"
    }
  });
});

test('Cloudfront logging bucket error when providing existing log bucket and logBucketProps', () => {
  const {stack, api} = createApi();

  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => { new CloudFrontToApiGateway(stack, 'cloudfront-apigateway', {
    existingApiGatewayObj: api,
    cloudFrontDistributionProps: {
      logBucket
    },
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });
  };

  expect(app).toThrowError();
});

test('Test the deployment with securityHeadersBehavior instead of HTTP security headers', () => {
  // Initial setup
  const {stack, api} = createApi();
  const cloudFrontToS3 = new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
    existingApiGatewayObj: api,
    insertHttpSecurityHeaders: false,
    responseHeadersPolicyProps: {
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(63072),
          includeSubdomains: true,
          override: true,
          preload: true
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: "upgrade-insecure-requests; default-src 'none';",
          override: true
        },
      }
    }
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
    ResponseHeadersPolicyConfig: {
      SecurityHeadersConfig: {
        ContentSecurityPolicy: {
          ContentSecurityPolicy: "upgrade-insecure-requests; default-src 'none';",
          Override: true
        },
        StrictTransportSecurity: {
          AccessControlMaxAgeSec: 63072,
          IncludeSubdomains: true,
          Override: true,
          Preload: true
        }
      }
    }
  });
  expect(cloudFrontToS3.cloudFrontFunction).toEqual(undefined);
});

test("Confirm CheckCloudFrontProps is being called", () => {
  const {stack, api} = createApi();

  expect(() => {
    new CloudFrontToApiGateway(stack, "test-cloudfront-apigateway", {
      existingApiGatewayObj: api,
      insertHttpSecurityHeaders: true,
      responseHeadersPolicyProps: {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(63072),
            includeSubdomains: true,
            override: false,
            preload: true
          }
        }
      }
    });
  }).toThrowError('responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.');
});
