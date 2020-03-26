/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '../index';
import * as s3 from '@aws-cdk/aws-s3';
import { CloudFrontDistributionForApiGateway } from '../lib/cloudfront-distribution-helper';
import '@aws-cdk/assert/jest';
import { OriginProtocolPolicy } from '@aws-cdk/aws-cloudfront';

test('cloudfront distribution for ApiGateway with default params', () => {
  const stack = new Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: lambda.Code.asset(`${__dirname}/lambda`)
  };

  const func = new lambda.Function(stack, 'LambdaFunction', lambdaFunctionProps);
  const _api = new api.LambdaRestApi(stack, 'RestApi', {
    handler: func
  });
  CloudFrontDistributionForApiGateway(stack, _api);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test cloudfront for Api Gateway with user provided logging bucket', () => {
  const stack = new Stack();

  const loggingBucket: s3.Bucket = new s3.Bucket(stack, 'MyCloudfrontLoggingBucket', defaults.DefaultS3Props());

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler'
  };

  const cfdProps = {
    loggingConfig: {
      bucket: loggingBucket
    }
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const _api = new api.LambdaRestApi(stack, 'RestApi1', {
    handler: func
  });

  CloudFrontDistributionForApiGateway(stack, _api, cfdProps);
  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          "GET",
          "HEAD"
        ],
        CachedMethods: [
          "GET",
          "HEAD"
        ],
        Compress: true,
        ForwardedValues: {
          Cookies: {
            Forward: "none"
          },
          QueryString: false
        },
        TargetOriginId: "origin1",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      DefaultRootObject: "index.html",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "MyCloudfrontLoggingBucket9AA652E8",
            "RegionalDomainName"
          ]
        },
        IncludeCookies: false
      },
      Origins: [
        {
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginKeepaliveTimeout: 5,
            OriginProtocolPolicy: "https-only",
            OriginReadTimeout: 30,
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
          Id: "origin1"
        }
      ],
      PriceClass: "PriceClass_100",
      ViewerCertificate: {
        CloudFrontDefaultCertificate: true
      }
    }
  });
});

test('test cloudfront for Api Gateway override properties', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const _api = new api.LambdaRestApi(stack, 'RestApi1', {
    handler: func
  });

  const props: cloudfront.CloudFrontWebDistributionProps = {
    originConfigs: [ {
      customOriginSource: {
          domainName: _api.url,
          originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY
        },
        behaviors: [ {
                isDefaultBehavior: true,
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS
            } ]
    } ]
  };

  CloudFrontDistributionForApiGateway(stack, _api, props);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
        DefaultCacheBehavior: {
          AllowedMethods: [
            "DELETE",
            "GET",
            "HEAD",
            "OPTIONS",
            "PATCH",
            "POST",
            "PUT"
          ],
          CachedMethods: [
            "GET",
            "HEAD",
            "OPTIONS"
          ],
          Compress: true,
          ForwardedValues: {
            Cookies: {
              Forward: "none"
            },
            QueryString: false
          },
          TargetOriginId: "origin1",
          ViewerProtocolPolicy: "redirect-to-https"
        },
        DefaultRootObject: "index.html",
        Enabled: true,
        HttpVersion: "http2",
        IPV6Enabled: true,
        Logging: {
          Bucket: {
            "Fn::GetAtt": [
              "CloudfrontLoggingBucket3C3EFAA7",
              "RegionalDomainName"
            ]
          },
          IncludeCookies: false
        },
        Origins: [
          {
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginKeepaliveTimeout: 5,
              OriginProtocolPolicy: "http-only",
              OriginReadTimeout: 30,
              OriginSSLProtocols: [
                "TLSv1.2"
              ]
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
            Id: "origin1"
          }
        ],
        PriceClass: "PriceClass_100",
        ViewerCertificate: {
          CloudFrontDefaultCertificate: true
        }
      }
  });

});