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

import { Template } from "aws-cdk-lib/assertions";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from "aws-cdk-lib";
import {Duration, RemovalPolicy, Stack} from "aws-cdk-lib";
import {CloudFrontToS3, CloudFrontToS3Props} from "../lib";
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as defaults from '@aws-solutions-constructs/core';

function deploy(stack: cdk.Stack, props?: CloudFrontToS3Props) {
  return new CloudFrontToS3(stack, 'test-cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    ...props
  });
}

test('construct defaults set properties correctly', () => {
  const stack = new cdk.Stack();
  const construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', {});

  expect(construct.cloudFrontWebDistribution).toBeDefined();
  expect(construct.cloudFrontFunction).toBeDefined();
  expect(construct.cloudFrontLoggingBucket).toBeDefined();
  expect(construct.s3Bucket).toBeDefined();
  expect(construct.s3LoggingBucket).toBeDefined();
  expect(construct.s3BucketInterface).toBeDefined();
});

test('check s3Bucket default encryption', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });
});

test('check s3Bucket public access block configuration', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
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
    existingBucketObj: existingBucket
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "my-bucket"
  });

  template.hasResource("AWS::S3::BucketPolicy", {
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
  expect(construct.s3Bucket !== null);
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
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test("Test existingBucketObj", () => {
  // Stack
  const stack = new cdk.Stack();
  const construct: CloudFrontToS3 = new CloudFrontToS3(stack, "existingIBucket", {
    existingBucketObj: s3.Bucket.fromBucketName(stack, 'mybucket', 'mybucket')
  });
  // Assertion
  expect(construct.cloudFrontWebDistribution !== null);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
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

  const construct = deploy(stack, { cloudFrontDistributionProps: { enableLogging: false } });

  expect(construct.cloudFrontLoggingBucket === undefined);
});

test('test cloudfront with custom domain names', () => {
  const stack = new cdk.Stack();

  const certificate = acm.Certificate.fromCertificateArn(stack, 'Cert', 'arn:${Aws.PARTITION}:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012');

  const props: CloudFrontToS3Props = {
    cloudFrontDistributionProps: {
      domainNames: ['mydomains'],
      certificate
    }
  };

  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [
        "mydomains"
      ]
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  new CloudFrontToS3(stack, 'cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "cloudfronts3S3LoggingBucket52EEB708"
    }
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket with destroy removal policy and auto delete objects
// --------------------------------------------------------------
test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const stack = new cdk.Stack();

  new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "cloudfronts3CloudfrontLoggingBucket5B845143"
    }
  });
});

// --------------------------------------------------------------
// Cloudfront logging bucket error providing existing log bucket and logBucketProps
// --------------------------------------------------------------
test('Cloudfront logging bucket error when providing existing log bucket and logBucketProps', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
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

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new cdk.Stack();

  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

// --------------------------------------------------
// CloudFront origin path
// --------------------------------------------------
test('CloudFront origin path present when provided', () => {
  const stack = new cdk.Stack();

  new CloudFrontToS3(stack, 'cloudfront-s3', {
    originPath: '/testPath'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig:
    {
      Origins: [
        {
          OriginPath: "/testPath",
        }
      ]
    }
  });
});

test('CloudFront origin path should not be present if not provided', () => {
  const stack = new cdk.Stack();

  new CloudFrontToS3(stack, 'cloudfront-s3', {});

  defaults.expectNonexistence(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig:
    {
      Origins: [
        {
          OriginPath: "/testPath",
        }
      ]
    }
  });
});

test('Test the deployment with securityHeadersBehavior instead of HTTP security headers', () => {
  // Initial setup
  const stack = new Stack();
  const cloudFrontToS3 = new CloudFrontToS3(stack, 'test-cloudfront-s3', {
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

test("throw exception if insertHttpSecurityHeaders and responseHeadersPolicyProps are provided", () => {
  const stack = new cdk.Stack();

  expect(() => {
    new CloudFrontToS3(stack, "test-cloudfront-s3", {
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
