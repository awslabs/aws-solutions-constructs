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

import { Stack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '../index';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CloudFrontDistributionForApiGateway } from '../lib/cloudfront-distribution-helper';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { LambdaEdgeEventType } from 'aws-cdk-lib/aws-cloudfront';
import { Template } from 'aws-cdk-lib/assertions';

test('test cloudfront for Api Gateway with user provided logging bucket', () => {
  const stack = new Stack();

  const logBucket: s3.Bucket = new s3.Bucket(stack, 'MyCloudfrontLoggingBucket', defaults.DefaultS3Props());

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_9,
    handler: 'index.handler'
  };

  const cfdProps = {
    enableLogging: true,
    logBucket
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const _api = new api.LambdaRestApi(stack, 'RestApi1', {
    handler: func
  });

  CloudFrontDistributionForApiGateway(stack, _api, cfdProps);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "SetHttpSecurityHeadersEE936115",
                "FunctionARN"
              ]
            }
          }
        ],
        TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "MyCloudfrontLoggingBucket9AA652E8",
            "RegionalDomainName"
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "https-only"
          },
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
                                  Ref: "RestApi1480AC499"
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
                                  Ref: "RestApi1DeploymentStageprod4FFC9BB4"
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
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          OriginPath: {
            "Fn::Join": [
              "",
              [
                "/",
                {
                  Ref: "RestApi1DeploymentStageprod4FFC9BB4"
                }
              ]
            ]
          }
        }
      ]
    }
  });
});

test('test cloudfront for Api Gateway override properties', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_9,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const _api = new api.LambdaRestApi(stack, 'RestApi1', {
    handler: func
  });

  const props: cloudfront.DistributionProps = {
    defaultBehavior: {
      origin: new origins.HttpOrigin(_api.url, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS
    },
  };

  CloudFrontDistributionForApiGateway(stack, _api, props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
          "PUT",
          "PATCH",
          "POST",
          "DELETE"
        ],
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        CachedMethods: [
          "GET",
          "HEAD",
          "OPTIONS"
        ],
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "SetHttpSecurityHeadersEE936115",
                "FunctionARN"
              ]
            }
          }
        ],
        TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "CloudfrontLoggingBucket3C3EFAA7",
            "RegionalDomainName"
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "http-only"
          },
          DomainName: {
            "Fn::Join": [
              "",
              [
                "https://",
                {
                  Ref: "RestApi1480AC499"
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
                  Ref: "RestApi1DeploymentStageprod4FFC9BB4"
                },
                "/"
              ]
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12"
        }
      ]
    }
  });

});

test('test override cloudfront add custom cloudfront function', () => {
  const stack = new Stack();

  // custom cloudfront function
  const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
    code: cloudfront.FunctionCode.fromInline("exports.handler = (event, context, callback) => {}")
  });

  // APIG Lambda function
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const func = new lambda.Function(stack, 'LambdaFunction', lambdaFunctionProps);
  const _api = new api.LambdaRestApi(stack, 'RestApi', {
    handler: func
  });
  CloudFrontDistributionForApiGateway(stack, _api, {
    defaultBehavior: {
      functionAssociations: [
        {
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          function: cloudfrontFunction
        }
      ],
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "MyFunction3BAA72D1",
                "FunctionARN"
              ]
            }
          }
        ],
        TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "CloudfrontLoggingBucket3C3EFAA7",
            "RegionalDomainName"
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "https-only",
            OriginSSLProtocols: [
              "TLSv1.2"
            ]
          },
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
                                  Ref: "RestApi0C43BF4B"
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
                                  Ref: "RestApiDeploymentStageprod3855DE66"
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
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          OriginPath: {
            "Fn::Join": [
              "",
              [
                "/",
                {
                  Ref: "RestApiDeploymentStageprod3855DE66"
                }
              ]
            ]
          }
        }
      ]
    }
  });
});

test('test override cloudfront replace custom lambda@edge', () => {
  const stack = new Stack();

  // custom lambda@edg function
  const handler = new lambda.Function(stack, 'SomeHandler', {
    functionName: 'SomeHandler',
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const handlerVersion = new lambda.Version(stack, 'SomeHandlerVersion', {
    lambda: handler,
  });

  // APIG Lambda function
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const func = new lambda.Function(stack, 'LambdaFunction', lambdaFunctionProps);
  const _api = new api.LambdaRestApi(stack, 'RestApi', {
    handler: func
  });
  CloudFrontDistributionForApiGateway(stack, _api, {
    defaultBehavior: {
      edgeLambdas: [
        {
          eventType: LambdaEdgeEventType.VIEWER_REQUEST,
          includeBody: false,
          functionVersion: handlerVersion,
        }
      ]
    }
  },
  false);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        LambdaFunctionAssociations: [
          {
            EventType: "viewer-request",
            IncludeBody: false,
            LambdaFunctionARN: {
              Ref: "SomeHandlerVersionDA986E41"
            }
          }
        ],
        TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "CloudfrontLoggingBucket3C3EFAA7",
            "RegionalDomainName"
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "https-only",
            OriginSSLProtocols: [
              "TLSv1.2"
            ]
          },
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
                                  Ref: "RestApi0C43BF4B"
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
                                  Ref: "RestApiDeploymentStageprod3855DE66"
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
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          OriginPath: {
            "Fn::Join": [
              "",
              [
                "/",
                {
                  Ref: "RestApiDeploymentStageprod3855DE66"
                }
              ]
            ]
          }
        }
      ]
    }
  });
});
