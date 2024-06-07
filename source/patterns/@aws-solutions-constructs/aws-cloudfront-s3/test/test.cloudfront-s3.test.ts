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

import { Match, Template } from "aws-cdk-lib/assertions";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CloudFrontToS3, CloudFrontToS3Props } from "../lib";
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as defaults from '@aws-solutions-constructs/core';
import { Key } from "aws-cdk-lib/aws-kms";
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

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
  expect(construct.cloudFrontLoggingBucketAccessLogBucket).toBeDefined();
  expect(construct.originAccessControl).toBeDefined();
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

  expect(construct.cloudFrontWebDistribution).toBeDefined();
  expect(construct.s3Bucket).toBeDefined();
});

test("Confirm CheckS3Props is called", () => {
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
  expect(app).toThrowError('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test("Test existingBucketObj", () => {
  // Stack
  const stack = new cdk.Stack();
  const construct: CloudFrontToS3 = new CloudFrontToS3(stack, "existingIBucket", {
    existingBucketObj: s3.Bucket.fromBucketName(stack, 'mybucket', 'mybucket')
  });
  // Assertion
  expect(construct.cloudFrontWebDistribution).toBeDefined();
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
          OriginAccessControlId: { "Fn::GetAtt": ["existingIBucketCloudFrontOacEB42E98F", "Id"] },
          S3OriginConfig: {}
        }
      ]
    }
  });
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

test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const stack = new cdk.Stack();

  const cloudfrontLogBucketName = 'cf-log-bucket';
  new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: cloudfrontLogBucketName
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    OwnershipControls: { Rules: [{ ObjectOwnership: "ObjectWriter" }] },
    BucketName: cloudfrontLogBucketName,
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

test('s3 bucket with one content bucket and no access logging of CONTENT bucket', () => {
  const stack = new cdk.Stack();

  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  // Content bucket+Cloudfront Logs bucket+
  // Access Log bucket for Cloudfront Logs bucket = 3 buckets
  template.resourceCountIs("AWS::S3::Bucket", 3);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

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

test("Confirm CheckCloudFrontProps is being called", () => {
  const stack = new cdk.Stack();

  expect(() => {
    new CloudFrontToS3(stack, "test-cloudfront-apigateway", {
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
  }).toThrowError('responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.');
});

test("Custom resource is provisioned if encryption key is provided as bucketProp", () => {
  const stack = new cdk.Stack();
  const encryptionKey = new Key(stack, 'cmkKey', {
    enableKeyRotation: true,
    removalPolicy: RemovalPolicy.DESTROY
  });
  deploy(stack, {
    bucketProps: {
      encryptionKey,
      encryption: s3.BucketEncryption.KMS
    }
  });
  const template = Template.fromStack(stack);
  // 2 Functions - our custom resource and a function created by the CDK
  template.resourceCountIs('AWS::Lambda::Function', 2);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Description: "Custom resource function that updates a provided key policy to allow CloudFront access.",
    Role: {
      "Fn::GetAtt": ["testcloudfronts3LambdaFunctionServiceRole2A43EA92", "Arn"]
    }
  });
});

test("Custom resource is provisioned if CMK was used to encrypt an existing bucket", () => {
  const stack = new cdk.Stack();
  const encryptionKey = new Key(stack, 'cmkKey', {
    enableKeyRotation: true,
    removalPolicy: RemovalPolicy.DESTROY
  });
  const existingBucketObj = defaults.buildS3Bucket(stack, {
    bucketProps: {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey
    }
  }, 'existing-s3-bucket-encrypted-with-cmk').bucket;
  new CloudFrontToS3(stack, 'test-cloudfront-s3', {
    existingBucketObj
  });
  const template = Template.fromStack(stack);
  // 2 Functions - our custom resource and a function created by the CDK
  template.resourceCountIs('AWS::Lambda::Function', 2);

  // ensure that our Function has the correct role attached
  template.hasResourceProperties('AWS::Lambda::Function', {
    Description: "Custom resource function that updates a provided key policy to allow CloudFront access.",
    Role: {
      "Fn::GetAtt": ["testcloudfronts3LambdaFunctionServiceRole2A43EA92", "Arn"]
    }
  });
});

test("Custom resource is not provisioned if encryption key is not provided as bucketProp", () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 0);
});

test("Custom resource is not provisioned if CMK was not used to encrypt an existing bucket", () => {
  const stack = new cdk.Stack();
  const existingBucketObj = defaults.buildS3Bucket(stack, {}, 'existing-s3-bucket-encrypted-with-cmk').bucket;
  new CloudFrontToS3(stack, 'test-cloudfront-s3', {
    existingBucketObj
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 0);
});

test("HttpOrigin is provisioned if a static website bucket is used", () => {
  const stack = new cdk.Stack();
  const blockPublicAccess = false;
  const props: CloudFrontToS3Props = {
    bucketProps: {
      enforceSSL: false,
      publicReadAccess: true, // <-- required for isWebsite
      blockPublicAccess: {
        blockPublicAcls: blockPublicAccess,
        restrictPublicBuckets: blockPublicAccess,
        blockPublicPolicy: blockPublicAccess,
        ignorePublicAcls: blockPublicAccess
      },
      websiteIndexDocument: "index.html" // <-- required for isWebsite
    },
    insertHttpSecurityHeaders: false
  };
  const construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', props);
  const template = Template.fromStack(stack);
  // Assert resources
  template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 0);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "http-only"
          }
        }
      ]
    }
  });
  template.resourceCountIs('AWS::CloudFront::OriginAccessIdentity', 0);
  // Assert pattern properties (output props)
  expect(construct.originAccessControl).toBe(undefined);
});

test("OAC is provisioned in all other cases", () => {
  const stack = new cdk.Stack();
  const construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', {});
  const template = Template.fromStack(stack);
  // Assert resources
  template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  template.resourceCountIs('AWS::CloudFront::OriginAccessIdentity', 0);
  // Assert pattern properties (output props)
  expect(construct.originAccessControl).not.toBe(undefined);
});

test("If a customer provides their own httpOrigin, or other origin type, use that one", () => {
  const stack = new cdk.Stack();
  const blockPublicAccess = false;
  const props: CloudFrontToS3Props = {
    bucketProps: {
      enforceSSL: false,
      publicReadAccess: true, // <-- required for isWebsite
      blockPublicAccess: {
        blockPublicAcls: blockPublicAccess,
        restrictPublicBuckets: blockPublicAccess,
        blockPublicPolicy: blockPublicAccess,
        ignorePublicAcls: blockPublicAccess
      },
      websiteIndexDocument: "index.html" // <-- required for isWebsite
    },
    insertHttpSecurityHeaders: false,
    cloudFrontDistributionProps: {
      defaultBehavior: {
        origin: new origins.HttpOrigin('example.com', {
          originId: 'custom-http-origin-for-testing'
        })
      }
    }
  };
  new CloudFrontToS3(stack, 'test-cloudfront-s3', props);
  const template = Template.fromStack(stack);
  // Assert resources
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: [
        {
          DomainName: "example.com",
          Id: "custom-http-origin-for-testing"
        }
      ]
    }
  });
});

test('Test that we do not create an Access Log bucket for CF logs if one is provided', () => {
  const stack = new cdk.Stack();
  const cfS3AccessLogBucket = new s3.Bucket(stack, 'cf-s3-access-logs');
  new CloudFrontToS3(stack, 'test-cloudfront-s3', {
    cloudFrontLoggingBucketProps: {
      serverAccessLogsBucket: cfS3AccessLogBucket
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 4);

});

// =====================
// S3 Content Bucket Access Logs Bucket
// =====================
test('Providing loggingBucketProps and existingLoggingBucket is an error', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'log-bucket', {});

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      bucketProps: {
        serverAccessLogsBucket: logBucket,
      },
      loggingBucketProps: {
        bucketName: 'anything'
      }
    });
  };
  expect(app).toThrowError(/Error - bothlog bucket props and an existing log bucket were provided.\n/);
});

test('Providing existingLoggingBucket and logS3AccessLogs=false is an error', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      bucketProps: {
        serverAccessLogsBucket: logBucket,
      },
      logS3AccessLogs: false
    });
  };
  expect(app).toThrowError(/Error - logS3AccessLogs is false, but a log bucket was provided in bucketProps.\n/);
});

test('Providing loggingBucketProps and logS3AccessLogs=false is an error', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      loggingBucketProps: {
        bucketName: 'anything'
      },
      logS3AccessLogs: false
    });
  };
  // NOTE: This error is thrown by CheckS3Props(), not CheckConstructSpecificProps()
  expect(app).toThrowError(/Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n/);
});

// test('No new loggingBucket is created if existingLoggingBucket is supplied', () => {
test('loggingBucketProps is supplied is integrated into architecture correctly', () => {
  const stack = new cdk.Stack();

  const testName = "test-name";
  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: testName
    }
  });

  expect(construct.s3LoggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 4);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });

  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "cloudfronts3S3LoggingBucket52EEB708"
      }
    }
  });
});
test('bucketProps:serverAccessLogsBucket is supplied is integrated into architecture correctly', () => {
  const testName = 'some-name';
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'test-log', {
    bucketName: testName,
  });

  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    bucketProps: {
      serverAccessLogsBucket: logBucket,
    },
  });

  expect(construct.s3LoggingBucket).toBeDefined();
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 4);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "testlogE88B4C6B"
      }
    }
  });
});

// =====================
// CloudFront Log Bucket
// =====================
test('Providing cloudFrontLoggingBucketProps and a log bucket in cloudFrontDistrbutionProps is an error', () => {
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
test('cloudFrontLoggingBucketProps are used correctly', () => {
  const stack = new cdk.Stack();

  const testName = "test-name";
  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: testName
    }
  });

  expect(construct.cloudFrontLoggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 4);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });

});
test('Logging disabled in CloudFront props is handled correctly', () => {
  const stack = new cdk.Stack();

  const construct = deploy(stack, { cloudFrontDistributionProps: { enableLogging: false } });
  const template = Template.fromStack(stack);

  // Only the content bucket and it S3 Access Log bucket (no Cloudfront log bucket)
  template.resourceCountIs("AWS::S3::Bucket", 2);

  // No logging is configured
  template.resourcePropertiesCountIs("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Logging: Match.anyValue()
    }
  }, 0);
  expect(construct.cloudFrontLoggingBucket === undefined);
});
test('No new CloudFrontLoggingBucket is created if cloudFrontLoggingBucketProps:logBucket is supplied', () => {
  const testName = 'random-value';
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {
    bucketName: testName
  });

  // const construct =
  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontDistributionProps: {
      logBucket
    },
  });

  expect(construct.cloudFrontLoggingBucket).toBeDefined();
  const template = Template.fromStack(stack);

  // Content bucket, Content bucket S3 Access Log bucket, cloudfront log bucket
  template.resourceCountIs("AWS::S3::Bucket", 3);

  // Ensure our existing bucket has been used for cloudfront logging
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

// =====================
// CloudFront Logs Bucket Access Log Bucket
// =====================
test('Providing cloudFrontLoggingBucketAccessLogBucketProps and cloudFrontLoggingBucketProps:serverAccessLogsBucket is an error', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      cloudFrontLoggingBucketProps: {
        serverAccessLogsBucket: logBucket,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      },
      cloudFrontLoggingBucketAccessLogBucketProps: {
        bucketName: 'specfic-name-is-inconsequential'
      }
    });
  };

  expect(app).toThrowError(/Error - an existing CloudFront log bucket S3 access log bucket and cloudFrontLoggingBucketAccessLogBucketProps were provided\n/);
});
test('Providing cloudFrontLoggingBucketAccessLogBucketProps and logCloudFrontAccessLog=false is an error', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      logCloudFrontAccessLog: false,
      cloudFrontLoggingBucketAccessLogBucketProps: {
        bucketName: 'specfic-name-is-inconsequential'
      }
    });
  };

  expect(app).toThrowError(/Error - cloudFrontLoggingBucketAccessLogBucketProps were provided but logCloudFrontAccessLog was false\n/);
});
test('Providing logCloudFrontAccessLog=false and cloudFrontLoggingBucketProps:serverAccessLogsBucket is an error', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => {
    new CloudFrontToS3(stack, 'cloudfront-s3', {
      cloudFrontLoggingBucketProps: {
        serverAccessLogsBucket: logBucket,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      },
      logCloudFrontAccessLog: false,
    });
  };

  expect(app).toThrowError(/Error - props.cloudFrontLoggingBucketProps.serverAccessLogsBucket was provided but logCloudFrontAccessLog was false\n/);
});
test('cloudFrontLoggingBucketAccessLogBucketProps are used correctly', () => {
  const stack = new cdk.Stack();

  new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketAccessLogBucketProps: {
      websiteErrorDocument: 'placeholder',
      websiteIndexDocument: 'placeholde-two'
    }
  });

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket S3 Access Log Bucket, CloudFront Log Bucket, CloudFront Log Bucket S3 Access Log Bucket
  template.resourceCountIs("AWS::S3::Bucket", 4);
  template.hasResourceProperties("AWS::S3::Bucket", {
    WebsiteConfiguration: {
      ErrorDocument: 'placeholder',
      IndexDocument: 'placeholde-two'
    }
  });

});
test('If existing CloudFront Log bucket S3 Access Logging bucket is provided, it is used correctly', () => {
  const stack = new cdk.Stack();
  const testName = 'cf-log-s3-log';
  const cfLogS3AccessLogBucket = new s3.Bucket(stack, 'cf-log-s3-access-log-bucket', {
    bucketName: testName
  });

  new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketProps: {
      serverAccessLogsBucket: cfLogS3AccessLogBucket
    }
  });

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket S3 Access Log Bucket, CloudFront Log Bucket, CloudFront Log Bucket S3 Access Log Bucket
  template.resourceCountIs("AWS::S3::Bucket", 4);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });

  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "cflogs3accesslogbucketDE374C27"
      }
    }
  });

});

test('cloudFrontLoggingBucketAccessLogBucket property is set correctly', () => {
  const stack = new cdk.Stack();

  const construct = new CloudFrontToS3(stack, 'cloudfront-s3', {
    cloudFrontLoggingBucketAccessLogBucketProps: {
      websiteErrorDocument: 'placeholder',
      websiteIndexDocument: 'placeholde-two'
    }
  });

  const template = Template.fromStack(stack);

  // Content Bucket, Content Bucket S3 Access Log Bucket, CloudFront Log Bucket, CloudFront Log Bucket S3 Access Log Bucket
  template.resourceCountIs("AWS::S3::Bucket", 4);
  template.hasResourceProperties("AWS::S3::Bucket", {
    WebsiteConfiguration: {
      ErrorDocument: 'placeholder',
      IndexDocument: 'placeholde-two'
    }
  });
  expect(construct.cloudFrontLoggingBucketAccessLogBucket).toBeDefined();
  expect(construct.cloudFrontLoggingBucketAccessLogBucket!.bucketName).toBeDefined();
});
