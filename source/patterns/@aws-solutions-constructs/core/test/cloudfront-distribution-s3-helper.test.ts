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

import { SynthUtils, ResourcePart } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { CloudFrontDistributionForS3 } from '../lib/cloudfront-distribution-helper';
import { buildS3Bucket } from '../lib/s3-bucket-helper';
import '@aws-cdk/assert/jest';
import { Bucket } from '@aws-cdk/aws-s3';

test('cloudfront distribution with default params', () => {
  const stack = new Stack();
  const sourceBucket = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check bucket policy metadata', () => {
  const stack = new Stack();
  const sourceBucket = buildS3Bucket(stack, {});
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
  const sourceBucket = buildS3Bucket(stack, {});
  CloudFrontDistributionForS3(stack, sourceBucket);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W35",
            reason: "This S3 bucket is used as the access logging bucket for CloudFront Distribution"
          },
          {
            id: "W51",
            reason: "This S3 bucket is used as the access logging bucket for CloudFront Distribution"
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);
});

test('test cloudfront check bucket policy', () => {
    const stack = new Stack();
    const sourceBucket = buildS3Bucket(stack, {});
    CloudFrontDistributionForS3(stack, sourceBucket);

    expect(stack).toHaveResourceLike("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              "s3:GetObject*",
              "s3:GetBucket*",
              "s3:List*"
            ],
            Effect: "Allow",
            Principal: {
              AWS: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":iam::cloudfront:user/CloudFront Origin Access Identity ",
                    {
                      Ref: "CloudFrontOriginAccessIdentity"
                    }
                  ]
                ]
              }
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
                  "CloudFrontOriginAccessIdentity",
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

test('test cloudfront with no security headers ', () => {
  const stack = new Stack();
  const sourceBucket = buildS3Bucket(stack, {});

  CloudFrontDistributionForS3(stack, sourceBucket, {}, false);

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
            "CloudfrontLoggingBucket3C3EFAA7",
            "RegionalDomainName"
          ]
        },
        IncludeCookies: false
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "S3Bucket07682993",
              "RegionalDomainName"
            ]
          },
          Id: "origin1",
          S3OriginConfig: {
              OriginAccessIdentity: {
                "Fn::Join": [
                  "",
                  [
                    "origin-access-identity/cloudfront/",
                    {
                      Ref: "CloudFrontOriginAccessIdentity"
                    }
                  ]
                ]
              }
          }
        }
      ],
      PriceClass: "PriceClass_100",
      ViewerCertificate: {
        CloudFrontDefaultCertificate: true
      }
    }
  });
});

test('test cloudfront override cloudfront custom domain names ', () => {
  const stack = new Stack();
  const sourceBucket = buildS3Bucket(stack, {});

  const myprops = {
    aliasConfiguration: {
      acmCertRef: '/acm/mycertificate',
      names: ['mydomains']
    }
  };

  CloudFrontDistributionForS3(stack, sourceBucket, myprops);

  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
        Aliases: [
            "mydomains"
        ],
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
          LambdaFunctionAssociations: [
            {
              EventType: "origin-response",
              LambdaFunctionARN: {
                Ref: "SetHttpSecurityHeadersVersion660E2F72"
              }
            }
          ],
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
            DomainName: {
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "RegionalDomainName"
              ]
            },
            Id: "origin1",
            S3OriginConfig: {
                OriginAccessIdentity: {
                  "Fn::Join": [
                    "",
                    [
                      "origin-access-identity/cloudfront/",
                      {
                        Ref: "CloudFrontOriginAccessIdentity"
                      }
                    ]
                  ]
                }
            }
          }
        ],
        PriceClass: "PriceClass_100",
        ViewerCertificate: {
          AcmCertificateArn: "/acm/mycertificate",
          SslSupportMethod: "sni-only"
        }
      }
  });
});

test('test cloudfront override cloudfront logging bucket ', () => {
  const stack = new Stack();
  const sourceBucket = buildS3Bucket(stack, {});
  const loggingBucket = new Bucket(stack, 'loggingbucket');

  const myprops = {
    loggingConfig: {
      bucket: loggingBucket,
      includeCookies: true
    }
  };

  CloudFrontDistributionForS3(stack, sourceBucket, myprops);

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
          LambdaFunctionAssociations: [
            {
              EventType: "origin-response",
              LambdaFunctionARN: {
                Ref: "SetHttpSecurityHeadersVersion660E2F72"
              }
            }
          ],
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
              "loggingbucket6D73BD53",
              "RegionalDomainName"
            ]
          },
          IncludeCookies    : true
        },
        Origins: [
          {
            DomainName: {
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "RegionalDomainName"
              ]
            },
            Id: "origin1",
            S3OriginConfig: {
                OriginAccessIdentity: {
                  "Fn::Join": [
                    "",
                    [
                      "origin-access-identity/cloudfront/",
                      {
                        Ref: "CloudFrontOriginAccessIdentity"
                      }
                    ]
                  ]
                }
            }
          }
        ],
        PriceClass: "PriceClass_100",
        ViewerCertificate: {
          CloudFrontDefaultCertificate: true
        }
      }
  });
});

test('test cloudfront override properties', () => {
    const stack = new Stack();
    const sourceBucket = buildS3Bucket(stack, {});
    // Create CloudFront Origin Access Identity User
    const cfnOrigAccessId = new cloudfront.CfnCloudFrontOriginAccessIdentity(stack, 'CloudFrontOriginAccessIdentity1', {
      cloudFrontOriginAccessIdentityConfig: {
          comment: 'Access S3 bucket content only through CloudFront'
      }
    });

    const oaiImported = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(
      stack,
      'OAIImported1',
      cfnOrigAccessId.ref
    );

    const props: cloudfront.CloudFrontWebDistributionProps = {
        originConfigs: [ {
            s3OriginSource: {
                s3BucketSource: sourceBucket,
                originAccessIdentity: oaiImported
            },
            behaviors: [ {
                    isDefaultBehavior: true,
                    allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                    cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS
                } ]
        } ]
    };

    CloudFrontDistributionForS3(stack, sourceBucket, props);

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
                DomainName: {
                  "Fn::GetAtt": [
                    "S3Bucket07682993",
                    "RegionalDomainName"
                  ]
                },
                Id: "origin1",
                S3OriginConfig: {
                    OriginAccessIdentity: {
                      "Fn::Join": [
                        "",
                        [
                          "origin-access-identity/cloudfront/",
                          {
                            Ref: "CloudFrontOriginAccessIdentity1"
                          }
                        ]
                      ]
                    }
                }
              }
            ],
            PriceClass: "PriceClass_100",
            ViewerCertificate: {
              CloudFrontDefaultCertificate: true
            }
          }
    });
  });