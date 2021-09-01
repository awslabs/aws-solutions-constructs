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

import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from '@aws-cdk/core';
import { CloudFrontToS3, CloudFrontToS3Props } from "../lib";

function deploy(stack: cdk.Stack, props?: CloudFrontToS3Props) {
  return new CloudFrontToS3(stack, 'test-cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    ...props
  });
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
    existingBucketInterface: existingBucket
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketName: "my-bucket"
  });

  expect(stack).toHaveResource("AWS::S3::BucketPolicy", {
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

test('test cloudfront with custom domain names', () => {
  const stack = new cdk.Stack();

  const certificate = acm.Certificate.fromCertificateArn(stack, 'Cert', 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012');

  const props: CloudFrontToS3Props = {
    cloudFrontDistributionProps: {
      domainNames: ['mydomains'],
      certificate
    }
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

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
                "testcloudfronts3SetHttpSecurityHeaders6C5A1E69",
                "FunctionARN"
              ]
            }
          }
        ],
        TargetOriginId: "testcloudfronts3CloudFrontDistributionOrigin124051039",
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
        }
      },
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": [
              "testcloudfronts3S3BucketE0C5F76E",
              "RegionalDomainName"
            ]
          },
          Id: "testcloudfronts3CloudFrontDistributionOrigin124051039",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "testcloudfronts3CloudFrontDistributionOrigin1S3Origin4695F058"
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

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  try {
    new CloudFrontToS3(stack, 'test-cloudfront-s3', {});
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: CloudFrontToS3 = deploy(stack);

  expect(construct.cloudFrontWebDistribution !== null);
  expect(construct.s3Bucket  !== null);
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new CloudFrontToS3(stack, "bad-s3-args", {
      existingBucketInterface: testBucket,
      bucketProps: {
        removalPolicy: RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test("Test existingBucketInterface", () => {
  // Stack
  const stack = new cdk.Stack();
  const construct: CloudFrontToS3 = new CloudFrontToS3(stack, "existingIBucket", {
    existingBucketInterface: s3.Bucket.fromBucketName(stack, 'mybucket', 'mybucket')
  });
  // Assertion
  expect(construct.cloudFrontWebDistribution !== null);
  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Origins: [
        {
          DomainName: {
            "Fn::Join": [
              "",
              [
                "mybucket.s3.",
                {
                  Ref: "AWS::Region"
                },
                ".",
                {
                  Ref: "AWS::URLSuffix"
                }
              ]
            ]
          },
          Id: "existingIBucketCloudFrontDistributionOrigin1D5849125",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "existingIBucketCloudFrontDistributionOrigin1S3OriginDDDB1606"
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

test('test cloudfront disable cloudfront logging', () => {
  const stack = new cdk.Stack();

  const construct = deploy(stack, {cloudFrontDistributionProps: {enableLogging: false}} );

  expect(construct.cloudFrontLoggingBucket === undefined);
});
