/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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

import '@aws-cdk/assert/jest';
import { Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CloudFrontDistributionForMediaStore, CloudFrontOriginAccessIdentity } from '../lib/cloudfront-distribution-helper';

test('CloudFront distribution for MediaStore with user provided log bucket', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);
  const logBucket: s3.Bucket = new s3.Bucket(stack, 'LoggingBucket');
  const cfProps = {
    enableLogging: true,
    logBucket
  };

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, cfProps);
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
                "SetHttpSecurityHeadersEE936115",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'CloudfrontOriginRequestPolicy299A10DB'
        },
        TargetOriginId: 'CloudFrontDistributionOrigin176EC3A12',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'LoggingBucket1E5A6F3B',
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
                              'MediaStoreContainer',
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
          Id: 'CloudFrontDistributionOrigin176EC3A12'
        }
      ]
    }
  });
});

test('CloudFront distribution for MediaStore with user provided origin request policy', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);
  const originRequestPolicyProps: cloudfront.OriginRequestPolicyProps = {
    headerBehavior: {
      behavior: 'all'
    },
    queryStringBehavior: {
      behavior: 'none'
    },
    cookieBehavior: {
      behavior: 'all'
    }
  };
  const originRequestPolicy = new cloudfront.OriginRequestPolicy(stack, 'MyCloudfrontOriginRequestPolicy', originRequestPolicyProps);
  const cfProps = {
    defaultBehavior: {
      originRequestPolicy
    }
  };

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, cfProps);
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
                "SetHttpSecurityHeadersEE936115",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'MyCloudfrontOriginRequestPolicy632B7DED'
        },
        TargetOriginId: 'CloudFrontDistributionOrigin176EC3A12',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'CloudfrontLoggingBucket3C3EFAA7',
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
                              'MediaStoreContainer',
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
          Id: 'CloudFrontDistributionOrigin176EC3A12'
        }
      ]
    }
  });
  expect(stack).toHaveResourceLike('AWS::CloudFront::OriginRequestPolicy', {
    OriginRequestPolicyConfig: {
      CookiesConfig: {
        CookieBehavior: 'all'
      },
      HeadersConfig: {
        HeaderBehavior: 'all'
      },
      QueryStringsConfig: {
        QueryStringBehavior: 'none'
      },
      Name: 'MyCloudfrontOriginRequestPolicy'
    }
  });
});

test('CloudFront distribution for MediaStore with user provided custom headers with CloudFrontOriginAccessIdentity', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);
  const cloudfrontOriginAccessIdentity = CloudFrontOriginAccessIdentity(stack);
  const cfProps = {
    customHeaders: {
      'User-Agent': cloudfrontOriginAccessIdentity.originAccessIdentityName
    }
  };

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, cfProps);
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
                "SetHttpSecurityHeadersEE936115",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: 'CloudfrontOriginRequestPolicy299A10DB'
        },
        TargetOriginId: 'CloudFrontDistributionOrigin176EC3A12',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'CloudfrontLoggingBucket3C3EFAA7',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          OriginCustomHeaders: [
            {
              HeaderName: 'User-Agent',
              HeaderValue: {
                Ref: 'CloudFrontOriginAccessIdentity04EB66DA'
              }
            }
          ],
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
                              'MediaStoreContainer',
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
          Id: 'CloudFrontDistributionOrigin176EC3A12'
        }
      ]
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
              Ref: 'AWS::Region'
            },
            '-',
            {
              Ref: 'AWS::StackName'
            }
          ]
        ]
      }
    }
  });
});

test('CloudFront distribution without HTTP security headers for MediaStore', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, {}, false);
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
          Ref: 'CloudfrontOriginRequestPolicy299A10DB'
        },
        TargetOriginId: 'CloudFrontDistributionOrigin176EC3A12',
        ViewerProtocolPolicy: 'redirect-to-https'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'CloudfrontLoggingBucket3C3EFAA7',
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
                              'MediaStoreContainer',
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
          Id: 'CloudFrontDistributionOrigin176EC3A12'
        }
      ]
    }
  });
});

test('CloudFront distribution for MediaStore override params', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);
  const cfProps: cloudfront.DistributionProps = {
    defaultBehavior: {
      origin: new origins.HttpOrigin(mediaStoreContainer.attrEndpoint, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD
    }
  };

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, cfProps);
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
        OriginRequestPolicyId: {
          Ref: 'CloudfrontOriginRequestPolicy299A10DB'
        },
        TargetOriginId: 'CloudFrontDistributionOrigin176EC3A12',
        ViewerProtocolPolicy: 'https-only'
      },
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            'CloudfrontLoggingBucket3C3EFAA7',
            'RegionalDomainName'
          ]
        }
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'http-only'
          },
          DomainName: {
            'Fn::GetAtt': [
              'MediaStoreContainer',
              'Endpoint'
            ]
          },
          Id: 'CloudFrontDistributionOrigin176EC3A12'
        }
      ]
    }
  });
});

test('test override cloudfront with custom cloudfront function', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer'
  };
  const mediaStoreContainer = new mediastore.CfnContainer(stack, 'MediaStoreContainer', mediaStoreContainerProps);

  // custom cloudfront function
  const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
    code: cloudfront.FunctionCode.fromInline("exports.handler = (event, context, callback) => {}")
  });

  CloudFrontDistributionForMediaStore(stack, mediaStoreContainer, {
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
        AllowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS"
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
                "MyFunction3BAA72D1",
                "FunctionARN"
              ]
            }
          }
        ],
        OriginRequestPolicyId: {
          Ref: "CloudfrontOriginRequestPolicy299A10DB"
        },
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
                            "Fn::GetAtt": [
                              "MediaStoreContainer",
                              "Endpoint"
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
          Id: "CloudFrontDistributionOrigin176EC3A12"
        }
      ]
    }
  });
});
