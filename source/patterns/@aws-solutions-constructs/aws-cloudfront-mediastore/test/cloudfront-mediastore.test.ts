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

// Imports
import '@aws-cdk/assert/jest';
import {Stack, RemovalPolicy, Duration} from 'aws-cdk-lib';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CloudFrontToMediaStore } from '../lib';
import * as cdk from "aws-cdk-lib";

// --------------------------------------------------------------
// Test the default deployment pattern variables
// --------------------------------------------------------------
test('Test the default deployment pattern variables', () => {
  // Initial setup
  const stack = new Stack();
  const cloudFrontToMediaStore = new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {});

  // Assertion
  expect(cloudFrontToMediaStore.cloudFrontWebDistribution).not.toEqual(undefined);
  expect(cloudFrontToMediaStore.mediaStoreContainer).not.toEqual(undefined);
  expect(cloudFrontToMediaStore.cloudFrontLoggingBucket).not.toEqual(undefined);
  expect(cloudFrontToMediaStore.cloudFrontOriginRequestPolicy).not.toEqual(undefined);
  expect(cloudFrontToMediaStore.cloudFrontOriginAccessIdentity).not.toEqual(undefined);
  expect(cloudFrontToMediaStore.cloudFrontFunction).not.toEqual(undefined);
});

// --------------------------------------------------------------
// Test the deployment without HTTP security headers
// --------------------------------------------------------------
test('Test the deployment without HTTP security headers', () => {
  // Initial setup
  const stack = new Stack();
  const cloudFrontToMediaStore = new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
    insertHttpSecurityHeaders: false
  });

  // Assertion
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
        CachedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        Compress: true,
        OriginRequestPolicyId: {
          Ref: 'testcloudfrontmediastoreCloudfrontOriginRequestPolicyA1D988D3'
        },
        TargetOriginId: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'testcloudfrontmediastoreCloudfrontLoggingBucketA3A51E6A',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'https-only'
          },
          DomainName: {
            'Fn::Select': [
              0,
              {
                'Fn::Split': [
                  '/',
                  {
                    'Fn::Select': [
                      1,
                      {
                        'Fn::Split': [
                          '://',
                          {
                            'Fn::GetAtt': [
                              'testcloudfrontmediastoreMediaStoreContainerF60A96BB',
                              'Endpoint'
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
          Id: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
          OriginCustomHeaders: [
            {
              HeaderName: 'User-Agent',
              HeaderValue: {
                Ref: 'testcloudfrontmediastoreCloudFrontOriginAccessIdentity966405A0'
              }
            }
          ]
        }
      ]
    }
  });
  expect(cloudFrontToMediaStore.cloudFrontFunction).toEqual(undefined);
});

test('Test the deployment with securityHeadersBehavior instead of HTTP security headers', () => {
  // Initial setup
  const stack = new Stack();
  const cloudFrontToMediaStore = new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
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
  expect(stack).toHaveResourceLike("AWS::CloudFront::ResponseHeadersPolicy", {
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
  expect(cloudFrontToMediaStore.cloudFrontFunction).toEqual(undefined);
});

test("throw exception if insertHttpSecurityHeaders and responseHeadersPolicyProps are provided", () => {
  const stack = new cdk.Stack();

  expect(() => {
    new CloudFrontToMediaStore(stack, "test-cloudfront-mediastore", {
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
  }).toThrowError();
});

// --------------------------------------------------------------
// Test the deployment with existing MediaStore container
// --------------------------------------------------------------
test('Test the deployment with existing MediaStore container', () => {
  // Initial setup
  const stack = new Stack();
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MyMediaStoreContainer', {
    containerName: 'MyMediaStoreContainer'
  });
  const cloudFrontToMediaStore = new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
    existingMediaStoreContainerObj: mediaStoreContainer
  });

  // Assertion
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
        CachedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "testcloudfrontmediastoreSetHttpSecurityHeaders9995A63D",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'testcloudfrontmediastoreCloudfrontOriginRequestPolicyA1D988D3'
        },
        TargetOriginId: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'testcloudfrontmediastoreCloudfrontLoggingBucketA3A51E6A',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'https-only'
          },
          DomainName: {
            'Fn::Select': [
              0,
              {
                'Fn::Split': [
                  '/',
                  {
                    'Fn::Select': [
                      1,
                      {
                        'Fn::Split': [
                          '://',
                          {
                            'Fn::GetAtt': [
                              'MyMediaStoreContainer',
                              'Endpoint'
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
          Id: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D'
        }
      ]
    }
  });
  expect(stack).toHaveResourceLike('AWS::MediaStore::Container', {
    ContainerName: 'MyMediaStoreContainer'
  });
  expect(stack).toHaveResourceLike('AWS::CloudFront::OriginRequestPolicy', {
    OriginRequestPolicyConfig: {
      Comment: 'Policy for Constructs CloudFrontDistributionForMediaStore',
      CookiesConfig: {
        CookieBehavior: 'none'
      },
      HeadersConfig: {
        HeaderBehavior: 'whitelist',
        Headers: [
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Header',
          'Origin'
        ]
      },
      Name: {
        'Fn::Join': [
          '',
          [
            {
              Ref: 'AWS::StackName'
            },
            '-',
            {
              Ref: 'AWS::Region'
            },
            '-CloudFrontDistributionForMediaStore'
          ]
        ]
      },
      QueryStringsConfig: {
        QueryStringBehavior: 'all'
      }
    }
  });
  expect(cloudFrontToMediaStore.cloudFrontOriginAccessIdentity).toEqual(undefined);
});

// --------------------------------------------------------------
// Test the deployment with the user provided MediaStore properties
// --------------------------------------------------------------
test('Test the deployment with the user provided MediaStore properties', () => {
  // Initial setup
  const stack = new Stack();
  const cloudFrontToMediaStore = new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
    mediaStoreContainerProps: {
      containerName: 'MyMediaStoreContainer',
      policy: '{}',
      lifecyclePolicy: '{}',
      corsPolicy: [],
      metricPolicy: {
        containerLevelMetrics: 'DISABLED'
      }
    }
  });

  // Assertion
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
        CachedMethods: [
          'GET',
          'HEAD',
          'OPTIONS'
        ],
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "testcloudfrontmediastoreSetHttpSecurityHeaders9995A63D",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'testcloudfrontmediastoreCloudfrontOriginRequestPolicyA1D988D3'
        },
        TargetOriginId: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'testcloudfrontmediastoreCloudfrontLoggingBucketA3A51E6A',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'https-only'
          },
          DomainName: {
            'Fn::Select': [
              0,
              {
                'Fn::Split': [
                  '/',
                  {
                    'Fn::Select': [
                      1,
                      {
                        'Fn::Split': [
                          '://',
                          {
                            'Fn::GetAtt': [
                              'testcloudfrontmediastoreMediaStoreContainerF60A96BB',
                              'Endpoint'
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
          Id: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D'
        }
      ]
    }
  });
  expect(stack).toHaveResourceLike('AWS::MediaStore::Container', {
    ContainerName: 'MyMediaStoreContainer',
    Policy: '{}',
    LifecyclePolicy: '{}',
    CorsPolicy: [],
    MetricPolicy: {
      ContainerLevelMetrics: 'DISABLED'
    }
  });
  expect(stack).toHaveResourceLike('AWS::CloudFront::OriginRequestPolicy', {
    OriginRequestPolicyConfig: {
      Comment: 'Policy for Constructs CloudFrontDistributionForMediaStore',
      CookiesConfig: {
        CookieBehavior: 'none'
      },
      HeadersConfig: {
        HeaderBehavior: 'whitelist',
        Headers: [
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Header',
          'Origin'
        ]
      },
      Name: {
        'Fn::Join': [
          '',
          [
            {
              Ref: 'AWS::StackName'
            },
            '-',
            {
              Ref: 'AWS::Region'
            },
            '-CloudFrontDistributionForMediaStore'
          ]
        ]
      },
      QueryStringsConfig: {
        QueryStringBehavior: 'all'
      }
    }
  });
  expect(cloudFrontToMediaStore.cloudFrontOriginAccessIdentity).toEqual(undefined);
});

// --------------------------------------------------------------
// Test the deployment with the user provided CloudFront properties
// --------------------------------------------------------------
test('Test the deployment with the user provided CloudFront properties', () => {
  // Initial setup
  const stack = new Stack();
  new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
    cloudFrontDistributionProps: {
      defaultBehavior: {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD
      }
    }
  });

  // Assertion
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: [
          'GET',
          'HEAD',
          'OPTIONS',
          'PUT',
          'PATCH',
          'POST',
          'DELETE'
        ],
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
        CachedMethods: [
          'GET',
          'HEAD'
        ],
        Compress: true,
        FunctionAssociations: [
          {
            EventType: "viewer-response",
            FunctionARN: {
              "Fn::GetAtt": [
                "testcloudfrontmediastoreSetHttpSecurityHeaders9995A63D",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'testcloudfrontmediastoreCloudfrontOriginRequestPolicyA1D988D3'
        },
        TargetOriginId: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
        ViewerProtocolPolicy: 'https-only'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'testcloudfrontmediastoreCloudfrontLoggingBucketA3A51E6A',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'https-only'
          },
          DomainName: {
            'Fn::Select': [
              0,
              {
                'Fn::Split': [
                  '/',
                  {
                    'Fn::Select': [
                      1,
                      {
                        'Fn::Split': [
                          '://',
                          {
                            'Fn::GetAtt': [
                              'testcloudfrontmediastoreMediaStoreContainerF60A96BB',
                              'Endpoint'
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
          Id: 'testcloudfrontmediastoreCloudFrontDistributionOrigin1BBFA2A4D',
          OriginCustomHeaders: [
            {
              HeaderName: 'User-Agent',
              HeaderValue: {
                Ref: 'testcloudfrontmediastoreCloudFrontOriginAccessIdentity966405A0'
              }
            }
          ]
        }
      ]
    }
  });
  expect(stack).toHaveResourceLike('AWS::MediaStore::Container', {
    AccessLoggingEnabled: true,
    ContainerName: {
      Ref: 'AWS::StackName'
    },
    CorsPolicy: [
      {
        AllowedHeaders: [ '*' ],
        AllowedMethods: [ 'GET' ],
        AllowedOrigins: [ '*' ],
        ExposeHeaders: [ "*" ],
        MaxAgeSeconds: 3000
      }
    ]
  });
  expect(stack).toHaveResourceLike('AWS::CloudFront::OriginRequestPolicy', {
    OriginRequestPolicyConfig: {
      Comment: 'Policy for Constructs CloudFrontDistributionForMediaStore',
      CookiesConfig: {
        CookieBehavior: 'none'
      },
      HeadersConfig: {
        HeaderBehavior: 'whitelist',
        Headers: [
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Header',
          'Origin'
        ]
      },
      Name: {
        'Fn::Join': [
          '',
          [
            {
              Ref: 'AWS::StackName'
            },
            '-',
            {
              Ref: 'AWS::Region'
            },
            '-CloudFrontDistributionForMediaStore'
          ]
        ]
      },
      QueryStringsConfig: {
        QueryStringBehavior: 'all'
      }
    }
  });
  expect(stack).toHaveResourceLike('AWS::CloudFront::CloudFrontOriginAccessIdentity', {
    CloudFrontOriginAccessIdentityConfig: {
      Comment: {
        'Fn::Join': [
          '',
          [
            'access-identity-',
            {
              Ref: 'AWS::Region',
            },
            '-',
            {
              Ref: 'AWS::StackName',
            }
          ]
        ]
      }
    }
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket with destroy removal policy and auto delete objects
// --------------------------------------------------------------
test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const stack = new Stack();

  new CloudFrontToMediaStore(stack, 'cloudfront-mediatstore', {
    cloudFrontLoggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
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
      Ref: "cloudfrontmediatstoreCloudfrontLoggingBucket2565C68A"
    }
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket error providing existing log bucket and logBucketProps
// --------------------------------------------------------------
test('Cloudfront logging bucket error when providing existing log bucket and logBucketProps', () => {
  const stack = new Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => { new CloudFrontToMediaStore(stack, 'cloudfront-s3', {
    cloudFrontDistributionProps: {
      logBucket
    },
    cloudFrontLoggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });
  };

  expect(app).toThrowError();
});