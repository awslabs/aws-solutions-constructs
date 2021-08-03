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

import { SynthUtils, ResourcePart } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import { CloudFrontDistributionForS3 } from '../lib/cloudfront-distribution-helper';
import { buildS3Bucket } from '../lib/s3-bucket-helper';
import '@aws-cdk/assert/jest';
import { Bucket } from '@aws-cdk/aws-s3';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { LambdaEdgeEventType } from '@aws-cdk/aws-cloudfront';

test('cloudfront distribution with default params', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check bucket policy metadata', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);
  expect(stack).toHaveResource('AWS::S3::BucketPolicy', {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "F16",
            reason: "Public website bucket policy requires a wildcard principal"
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);
});

test('check bucket metadata', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W35",
            reason: "This S3 bucket is used as the access logging bucket for CloudFront Distribution"
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);
});

test('test cloudfront check bucket policy', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);

  expect(stack).toHaveResourceLike("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": ["S3Bucket07682993", "Arn"],
                  },
                  "/*",
                ],
              ],
            },
            {
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "Arn"
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('test cloudfront with no security headers ', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});

  CloudFrontDistributionForS3(stack, sourceBucket, {}, false);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  });
});

test('test cloudfront override cloudfront custom domain names ', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  const certificate = acm.Certificate.fromCertificateArn(stack, 'Cert', 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012');

  const myprops = {
    domainNames: ['mydomains'],
    certificate
  };

  CloudFrontDistributionForS3(stack, sourceBucket, myprops);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [
        "mydomains"
      ],
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ],
      ViewerCertificate: {
        AcmCertificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
        MinimumProtocolVersion: "TLSv1.2_2019",
        SslSupportMethod: "sni-only"
      }
    }
  });
});

test('test cloudfront override cloudfront logging bucket ', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  const logBucket = new Bucket(stack, 'loggingbucket');

  const myprops = {
    enableLogging: true,
    logBucket
  };

  CloudFrontDistributionForS3(stack, sourceBucket, myprops);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
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
      DefaultRootObject: "index.html",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "loggingbucket6D73BD53",
            "RegionalDomainName"
          ]
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  });
});

test('test cloudfront override properties', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});
  const props: cloudfront.DistributionProps = {
    defaultBehavior: {
      origin: new origins.S3Origin(sourceBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS
    },
  };

  CloudFrontDistributionForS3(stack, sourceBucket, props);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  });
});

test('test override cloudfront with custom cloudfront function', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});

  // custom cloudfront function
  const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
    code: cloudfront.FunctionCode.fromInline("exports.handler = (event, context, callback) => {}")
  });

  CloudFrontDistributionForS3(stack, sourceBucket, {
    defaultBehavior: {
      functionAssociations: [
        {
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          function: cloudfrontFunction
        }
      ],
    }
  });

  expect(stack).toHaveResource("AWS::CloudFront::Distribution", {
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  });
});

test('test override cloudfront replace custom lambda@edge', () => {
  const stack = new Stack();
  const [sourceBucket] = buildS3Bucket(stack, {});

  // custom lambda@edg function
  const handler = new lambda.Function(stack, 'SomeHandler', {
    functionName: 'SomeHandler',
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const handlerVersion = new lambda.Version(stack, 'SomeHandlerVersion', {
    lambda: handler,
  });

  CloudFrontDistributionForS3(stack, sourceBucket, {
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

  expect(stack).toHaveResource("AWS::CloudFront::Distribution", {
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "CloudFrontDistributionOrigin176EC3A12",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "CloudFrontDistributionOrigin1S3Origin3D9CA0E9"
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  });
});