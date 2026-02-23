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

import { Match, Template } from 'aws-cdk-lib/assertions';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { createCloudFrontDistributionForS3, createCloudFrontOaiDistributionForS3 } from '../lib/cloudfront-distribution-helper';
import { buildS3Bucket } from '../lib/s3-bucket-helper';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { LambdaEdgeEventType } from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as defaults from '../';

test('check bucket policy metadata', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket
  });
  const template = Template.fromStack(stack);
  template.hasResource('AWS::S3::BucketPolicy', {
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
  });
});

test('test cloudfront check bucket policy', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
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
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "S3Bucket07682993",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
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
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {},
    httpSecurityHeaders: false
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
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
      }
    }
  });
});

test('test cloudfront override cloudfront logging bucket ', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {}, 'content-bucket');
  const logBucket = new Bucket(stack, 'cloudfront-log-bucket');

  const myprops = {
    enableLogging: true,
    logBucket
  };

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontDistributionProps: myprops
  });

  const template = Template.fromStack(stack);
  // Should be content bucket and it's associated S3 logging bucket, plus simple CloudFront log bucket
  template.resourceCountIs("AWS::S3::Bucket", 3);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "cloudfrontlogbucketDF7058FB",
            "RegionalDomainName"
          ]
        }
      }
    }
  });
});

test('test cloudfront with logging disabled', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {});

  const cfDistroProps = {
    enableLogging: false,
  };

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontDistributionProps: cfDistroProps
  });

  const template = Template.fromStack(stack);
  // Should only be content bucket and it's associated S3 logging bucket
  template.resourceCountIs("AWS::S3::Bucket", 2);
  // There should be no logging of distribution
  template.resourcePropertiesCountIs("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        Logging: Match.anyValue()
      }
    }
  }, 0);
});
test('test cloudfront override properties', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  const props: cloudfront.DistributionProps = {
    defaultBehavior: {
      origin: new origins.S3Origin(buildS3BucketResponse.bucket, { originPath: '/testPath' }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS
    },
  };

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: props
  });

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
          OriginPath: '/testPath',
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
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  // custom cloudfront function
  const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
    code: cloudfront.FunctionCode.fromInline("exports.handler = (event, context, callback) => {}")
  });

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {
      defaultBehavior: {
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
            function: cloudfrontFunction
          }
        ],
      }
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
      }
    }
  });
});

test('test override cloudfront replace custom lambda@edge', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

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

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {
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
    httpSecurityHeaders: false
  });

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
      }
    }
  });
});

test('test cloudfront override cloudfront custom domain names ', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  const certificate = acm.Certificate.fromCertificateArn(stack, 'Cert', 'arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012');

  const myprops = {
    domainNames: ['mydomains'],
    certificate
  };

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: myprops
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [
        "mydomains"
      ],
    }
  });
});

test('Are cloudfront log bucket access log bucket properties used', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {});
  const testName = 'random-name-avcb';

  const response = createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontLoggingBucketS3AccessLogBucketProps: { bucketName: testName }
  });

  expect(response.loggingBucket).toBeDefined();
  expect(response.loggingBucketS3AccesssLogBucket).toBeDefined();

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket Access Log, CloudFront Log, CloudFront Log Access Log
  template.resourceCountIs("AWS::S3::Bucket", 4);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });
});
test('Is logCloudFrontAccessLog observed', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  const response = createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    logCloudFrontAccessLog: false,
    cloudFrontDistributionProps: {},
  });

  expect(response.loggingBucket).toBeDefined();
  expect(response.loggingBucketS3AccesssLogBucket).not.toBeDefined();

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket Access Log, CloudFront Log, NO CloudFront Log Access Log
  template.resourceCountIs("AWS::S3::Bucket", 3);
});

test('check default and custom origins for additional behaviors', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  const additionalBucket = defaults.CreateScrapBucket(stack, "second-bucket", {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,

  });

  const originAccessControl = new cloudfront.CfnOriginAccessControl(stack, 'second-oac', {
    originAccessControlConfig: {
      name: defaults.generatePhysicalOacName('aws-cloudfront-s3-', [__filename]),
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
      description: 'Origin access control provisioned by aws-cloudfront-s3'
    }
  });

  const additionalOrigin = new defaults.S3OacOrigin(additionalBucket, {
    originAccessControl
  });

  createCloudFrontDistributionForS3(stack, 'sample-cf-distro', {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {
      additionalBehaviors: {
        '/assets/public/*': {
          origin: additionalOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
        'ngsw.json': {
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        }
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      CacheBehaviors: [
        {
          CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
          Compress: true,
          PathPattern: "/assets/public/*",
          TargetOriginId: "CloudFrontDistributionOrigin223EBF2F9",
          ViewerProtocolPolicy: "allow-all"
        },
        {
          CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
          Compress: true,
          PathPattern: "ngsw.json",
          TargetOriginId: "CloudFrontDistributionOrigin176EC3A12",
          ViewerProtocolPolicy: "allow-all"
        }
      ]
    }
  });
});

// ---------------------------
// Duplicate tests for createCloudFrontOaiDistributinForS3
// ---------------------------

test('check bucket policy metadata - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket
  });
  const template = Template.fromStack(stack);
  template.hasResource('AWS::S3::BucketPolicy', {
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
  });
});

test('check createCloudFrontOaiDistributionForS3 response', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  const response = createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket
  });

  expect(response.originAccessIdentity).toBeDefined();
  expect(response.distribution).toBeDefined();
  expect(response.loggingBucket).toBeDefined();
  expect(response.cloudfrontFunction).toBeDefined();
  expect(response.loggingBucketS3AccesssLogBucket).toBeDefined();
});

test('test cloudfront check bucket policy - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
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
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "S3Bucket07682993",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        },
        {
          Action: "s3:GetObject",
          Effect: "Allow",
          Principal: {
            CanonicalUser: {
              "Fn::GetAtt": [
                "constructsGeneratedOai6A430BBF",
                "S3CanonicalUserId"
              ]
            }
          },
          Resource: {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::GetAtt": [
                    "S3Bucket07682993",
                    "Arn"
                  ]
                },
                "/*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('test cloudfront with no security headers - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {},
    httpSecurityHeaders: false
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
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
      }
    }
  });
});

test('test cloudfront override cloudfront logging bucket - oai', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {}, 'content-bucket');
  const logBucket = new Bucket(stack, 'cloudfront-log-bucket');

  const myprops = {
    enableLogging: true,
    logBucket
  };

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontDistributionProps: myprops
  });

  const template = Template.fromStack(stack);
  // Should be content bucket and it's associated S3 logging bucket, plus simple CloudFront log bucket
  template.resourceCountIs("AWS::S3::Bucket", 3);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Logging: {
        Bucket: {
          "Fn::GetAtt": [
            "cloudfrontlogbucketDF7058FB",
            "RegionalDomainName"
          ]
        }
      }
    }
  });
});

test('test cloudfront with logging disabled - oai', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {});

  const cfDistroProps = {
    enableLogging: false,
  };

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontDistributionProps: cfDistroProps
  });

  const template = Template.fromStack(stack);
  // Should only be content bucket and it's associated S3 logging bucket
  template.resourceCountIs("AWS::S3::Bucket", 2);
  // There should be no logging of distribution
  template.resourcePropertiesCountIs("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        Logging: Match.anyValue()
      }
    }
  }, 0);
});
test('test cloudfront override properties - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  const props: cloudfront.DistributionProps = {
    defaultBehavior: {
      origin: new origins.S3Origin(buildS3BucketResponse.bucket, { originPath: '/testPath' }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS
    },
  };

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: props
  });

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
          OriginPath: '/testPath',
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

test('test override cloudfront with custom cloudfront function - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  // custom cloudfront function
  const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
    code: cloudfront.FunctionCode.fromInline("exports.handler = (event, context, callback) => {}")
  });

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {
      defaultBehavior: {
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
            function: cloudfrontFunction
          }
        ],
      }
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
      }
    }
  });
});

test('test override cloudfront replace custom lambda@edge - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

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

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: {
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
    httpSecurityHeaders: false
  });

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
      }
    }
  });
});

test('test cloudfront override cloudfront custom domain names - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});
  const certificate = acm.Certificate.fromCertificateArn(stack, 'Cert', 'arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012');

  const myprops = {
    domainNames: ['mydomains'],
    certificate
  };

  createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    cloudFrontDistributionProps: myprops
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [
        "mydomains"
      ],
    }
  });
});

test('Are cloudfront log bucket access log bucket properties used - oai', () => {
  const stack = new Stack();
  const contentBucketResponse = buildS3Bucket(stack, {});
  const testName = 'random-name-avcb';

  const response = createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: contentBucketResponse.bucket,
    cloudFrontLoggingBucketS3AccessLogBucketProps: { bucketName: testName }
  });

  expect(response.loggingBucket).toBeDefined();
  expect(response.loggingBucketS3AccesssLogBucket).toBeDefined();

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket Access Log, CloudFront Log, CloudFront Log Access Log
  template.resourceCountIs("AWS::S3::Bucket", 4);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });
});
test('Is logCloudFrontAccessLog observed - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {});

  const response = createCloudFrontOaiDistributionForS3(stack, {
    sourceBucket: buildS3BucketResponse.bucket,
    logCloudFrontAccessLog: false,
    cloudFrontDistributionProps: {},
  });

  expect(response.loggingBucket).toBeDefined();
  expect(response.loggingBucketS3AccesssLogBucket).not.toBeDefined();

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket Access Log, CloudFront Log, NO CloudFront Log Access Log
  template.resourceCountIs("AWS::S3::Bucket", 3);
});

test('Test that web site enabled buckets throw an error - oai', () => {
  const stack = new Stack();
  const buildS3BucketResponse = buildS3Bucket(stack, {
    bucketProps: {
      websiteIndexDocument: "index.html"
    }
  });

  const app = () => {
    createCloudFrontOaiDistributionForS3(stack, {
      sourceBucket: buildS3BucketResponse.bucket,
      logCloudFrontAccessLog: false,
      cloudFrontDistributionProps: {},
    });
  };

  // Assertion
  expect(app).toThrow();

});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test CloudFront insertHttpHeaders bad props', () => {

  const props: defaults.CloudFrontProps = {
    insertHttpSecurityHeaders: true,
    responseHeadersPolicyProps: {
      securityHeadersBehavior: {}
    }
  };

  const app = () => {
    defaults.CheckCloudFrontProps(props);
  };

  // Assertion
  expect(app).toThrow('responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.');
});

test("test CloudFrontS3 props - logS3AccessLogs", () => {
  const props: defaults.CloudfrontS3Props = {
    logS3AccessLogs: false,
    bucketProps: {
      serverAccessLogsBucket: {} as Bucket
    }
  };

  const app = () => {
    defaults.CheckCloudfrontS3Props(props);
  };

  // Assertion
  expect(app).toThrow('Error - logS3AccessLogs is false, but a log bucket was provided in bucketProps.\n');

});

test("test CloudFrontS3 props - loggingBucketProps", () => {
  const props: defaults.CloudfrontS3Props = {
    loggingBucketProps: {
      bucketName: "somename"
    },
    bucketProps: {
      serverAccessLogsBucket: {} as Bucket
    }
  };

  const app = () => {
    defaults.CheckCloudfrontS3Props(props);
  };

  // Assertion
  expect(app).toThrow('Error - bothlog bucket props and an existing log bucket were provided.\n');

});

test("test CloudFrontS3 props - cloudFrontLoggingBucketAccessLogBucketProps", () => {
  const props: defaults.CloudfrontS3Props = {
    cloudFrontLoggingBucketAccessLogBucketProps: {
      bucketName: "somename"
    },
    cloudFrontLoggingBucketProps: {
      serverAccessLogsBucket: {} as Bucket
    }
  };

  const app = () => {
    defaults.CheckCloudfrontS3Props(props);
  };

  // Assertion
  expect(app).toThrow('Error - an existing CloudFront log bucket S3 access log bucket and cloudFrontLoggingBucketAccessLogBucketProps were provided\n');

});

test("test CloudFrontS3 props - serverAccessLogsBucket", () => {
  const props: defaults.CloudfrontS3Props = {
    cloudFrontLoggingBucketAccessLogBucketProps: {},
    logCloudFrontAccessLog: false
  };

  const app = () => {
    defaults.CheckCloudfrontS3Props(props);
  };

  // Assertion
  expect(app).toThrow('Error - cloudFrontLoggingBucketAccessLogBucketProps were provided but logCloudFrontAccessLog was false\n');

});

test("test CloudFrontS3 props - serverAccessLogsBucket", () => {
  const props: defaults.CloudfrontS3Props = {
    cloudFrontLoggingBucketProps: {
      serverAccessLogsBucket: {} as Bucket,
    },
    logCloudFrontAccessLog: false
  };

  const app = () => {
    defaults.CheckCloudfrontS3Props(props);
  };

  // Assertion
  expect(app).toThrow('Error - props.cloudFrontLoggingBucketProps.serverAccessLogsBucket was provided but logCloudFrontAccessLog was false\n');

});
