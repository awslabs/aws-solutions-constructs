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
import { CloudFrontToS3, CloudFrontToS3Props } from "../lib";
import * as cdk from "@aws-cdk/core";
import * as s3 from '@aws-cdk/aws-s3';
import '@aws-cdk/assert/jest';

function deploy(stack: cdk.Stack) {
  const props: CloudFrontToS3Props = {
    deployBucket: true
  };

  return new CloudFrontToS3(stack, 'test-cloudfront-s3', props);
}

test('snapshot test CloudFrontToS3 default params', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check s3Bucket default encryption', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault : {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });
});

test('check s3Bucket public access block configuration', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('test s3Bucket override publicAccessBlockConfiguration', () => {
  const stack = new cdk.Stack();

  const props: CloudFrontToS3Props = {
    deployBucket: true,
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });
});

test('check existing bucket', () => {
  const stack = new cdk.Stack();

  const existingBucket = new s3.Bucket(stack, 'my-bucket', {
    bucketName: 'my-bucket'
  });

  const props: CloudFrontToS3Props = {
    deployBucket: false,
    existingBucketObj: existingBucket
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketName: "my-bucket"
  });

});

test('test cloudfront with custom domain names', () => {
  const stack = new cdk.Stack();

  const props: CloudFrontToS3Props = {
    deployBucket: true,
    cloudFrontDistributionProps: {
      aliasConfiguration: {
        acmCertRef: '/acm/mycertificate',
        names: ['mydomains']
      }
    }
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

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
                Ref: "testcloudfronts3SetHttpSecurityHeadersVersionF1C744BB"
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
              "testcloudfronts3CloudfrontLoggingBucket985C0FE8",
              "RegionalDomainName"
            ]
          },
          IncludeCookies: false
        },
        Origins: [
          {
            DomainName: {
              "Fn::GetAtt": [
                "testcloudfronts3S3BucketE0C5F76E",
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
                        Ref: "testcloudfronts3CloudFrontOriginAccessIdentity2C681839"
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

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: CloudFrontToS3Props = {
    deployBucket: false
  };

  try {
    new CloudFrontToS3(stack, 'test-cloudfront-s3', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check getter methods', () => {
  const stack = new cdk.Stack();

  const construct: CloudFrontToS3 = deploy(stack);

  expect(construct.cloudFrontWebDistribution()).toBeDefined();
  expect(construct.bucket()).toBeDefined();
});
