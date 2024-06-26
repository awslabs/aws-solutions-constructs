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

import { LambdaToKendra, LambdaToKendraProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

test('Launch with minimal code and check  structure', () => {
  const stack = new cdk.Stack();
  const testFunctionName = 'test-function-name24334';
  const testBucketName = 'test-bucket-name12344';

  const lambdaProps: lambda.FunctionProps = {
    functionName: testFunctionName,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
    Environment: {
      Variables: {
        KENDRA_INDEX_ID: {
          "Fn::GetAtt": ["samplekendraindexsample8A81A6C2", "Id"]
        }
      }
    },
  });
  template.hasResourceProperties("AWS::Kendra::Index", {
    RoleArn: {
      "Fn::GetAtt": [
        "samplekendraindexrolesample4F9E7B66",
        "Arn",
      ],
    },
  });
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: testBucketName
      },
    },
    RoleArn: {
      "Fn::GetAtt": ["sampledatasourcerolesample05A05F8BD", "Arn"]
    },
  });
  // Confirm policy for Kendra index
  template.hasResourceProperties("AWS::IAM::Role", {
    Description: "Allow Kendra index to write CloudWatch Logs",
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "cloudwatch:PutMetricData",
              Condition: {
                StringEquals: {
                  "cloudwatch:namespace": "AWS/Kendra"
                }
              },
              Effect: "Allow",
              Resource: "*"
            },
            {
              Action: "logs:CreateLogGroup",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*"
                  ]
                ]
              }
            },
            {
              Action: "logs:DescribeLogGroups",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*"
                  ]
                ]
              }
            },
            {
              Action: [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStream"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*:log-stream:*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "AllowLogging"
      }
    ],
  });
  // Confirm policy for Kendra index
  template.hasResourceProperties("AWS::IAM::Role", {
    Description: "Policy for Kendra S3 Data Source",
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "kendra.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "s3:GetObject",
              Effect: "Allow",
              Resource: `arn:aws:s3:::test-bucket-name12344/*`
            },
            {
              Action: "s3:ListBucket",
              Effect: "Allow",
              Resource: `arn:aws:s3:::test-bucket-name12344`
            },
            {
              Action: [
                "kendra:BatchPutDocument",
                "kendra:BatchDeleteDocument"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  "samplekendraindexsample8A81A6C2",
                  "Arn"
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "s3CrawlPolicy"
      }
    ]
  });
  // Confirm that Lambda function has QUERY access
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "kendra:Query",
            "kendra:Describe*",
            "kendra:Get*",
            "kendra:BatchGet*",
            "kendra:List*",
            "kendra:Retrieve",
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        },
        {
          Action: "kendra:SubmitFeedback",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        }
      ],
    },
    Roles: [
      {
        Ref: "sampletestfunctionname24334ServiceRole99395A01"
      }
    ]
  });
});

test('Check pattern properties on minimal launch', () => {
  const stack = new cdk.Stack();

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const newConstruct = new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: 'your-bucket-name',
        }
      }
    }
    ],
  });

  expect(newConstruct.lambdaFunction).toBeDefined();
  expect(newConstruct.kendraDataSources).toBeDefined();
  expect(newConstruct.kendraDataSources.length).toEqual(1);
  expect(newConstruct.kendraIndex).toBeDefined();

});

test('Launch with VPC', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name12539';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    deployVpc: true,
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);

  // Check the VPC
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "10.0.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  // Is the Lambda function associated with the VPC
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "sampleReplaceDefaultSecurityGroupsecuritygroupE5725669",
            "GroupId"
          ]
        }
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055"
        }
      ]
    }
  });
  // Check that the Lambda function Policy has proper network access
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ec2:CreateNetworkInterface",
            "ec2:DescribeNetworkInterfaces",
            "ec2:DeleteNetworkInterface",
            "ec2:AssignPrivateIpAddresses",
            "ec2:UnassignPrivateIpAddresses"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {},
        {},
        {}
      ],
    },
    Roles: [
      {
        Ref: "sampleLambdaFunctionServiceRole7A3C4AF5"
      }
    ]
  });

  // Check for the Kendra endpoint in the VPC
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".kendra"
        ]
      ]
    },
    VpcId: {
      Ref: "Vpc8378EB38"
    },
    PrivateDnsEnabled: true,
    SecurityGroupIds: [
      {
        "Fn::GetAtt": [
          "DefaultKENDRAsecuritygroup34536A79",
          "GroupId"
        ]
      }
    ],
    SubnetIds: [
      {
        Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
      },
      {
        Ref: "VpcisolatedSubnet2Subnet39217055"
      }
    ],
    VpcEndpointType: "Interface"
  });
});

test('Launch with existing lambda', () => {
  const stack = new cdk.Stack();
  const testTimeout = 17;

  const testFunctionName = 'test-name';

  const existingFunction = new lambda.Function(stack, 'existing-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    timeout: cdk.Duration.seconds(testTimeout),
    functionName: testFunctionName
  });

  new LambdaToKendra(stack, 'sample', {
    existingLambdaObj: existingFunction,
    kendraDataSourcesProps: [],
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.hasResourceProperties("AWS::Lambda::Function", {
    Timeout: testTimeout,
    FunctionName: testFunctionName,
  });
});

test('Confirm error with data source with no bucket name', () => {
  const stack = new cdk.Stack();

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const app = () => {
    new LambdaToKendra(stack, 'sample', {
      lambdaFunctionProps: lambdaProps,
      kendraDataSourcesProps: [{
        type: 'S3',
        dataSourceConfiguration: {
          s3Configuration: {
          }
        }
      }
      ],
    });
  };

  expect(app).toThrowError(/Error - an S3 Kendra DataSource requires the DataSourceConfiguration.S3Configuration.bucketName prop/);
});

test('Launch with existing vpc', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    existingVpc: defaults.getTestVpc(stack),
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::VPCEndpoint", 1);
  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

});

test('Launch with Read/Write permissions on kendra index', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["ReaD", "SubmitFeedBack", "wrITE"], // this also checks case sensitivity
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "kendra:Query",
            "kendra:Describe*",
            "kendra:Get*",
            "kendra:BatchGet*",
            "kendra:List*",
            "kendra:Retrieve",
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        },
        {
          Action: "kendra:SubmitFeedback",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        },
        {
          Action: [
            "kendra:Associate*",
            "kendra:BatchPut*",
            "kendra:Clear",
            "kendra:Create*",
            "kendra:Delete*",
            "kendra:Disassociate*",
            "kendra:Put*",
            "kendra:Update*",
            "kendra:Start*",
            "kendra:Submit*",
            "kendra:Stop*",
            "kendra:TagResource",
            "kendra:UntagResource"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Launch with Write permissions on kendra index', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["WRITE"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "kendra:Associate*",
            "kendra:BatchPut*",
            "kendra:Clear",
            "kendra:Create*",
            "kendra:Delete*",
            "kendra:Disassociate*",
            "kendra:Put*",
            "kendra:Update*",
            "kendra:Start*",
            "kendra:Submit*",
            "kendra:Stop*",
            "kendra:TagResource",
            "kendra:UntagResource"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Launch with Read permissions on kendra index', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["READ"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "kendra:Query",
            "kendra:Describe*",
            "kendra:Get*",
            "kendra:BatchGet*",
            "kendra:List*",
            "kendra:Retrieve",
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Launch with SubmitFeedback permissions on kendra index', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["SUBMITFEEDBACK"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "kendra:SubmitFeedback",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "samplekendraindexsample8A81A6C2",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Launch with existing kendra index', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const existingRole = new iam.Role(stack, 'existing-role', {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
  });

  const existingIndex = new kendra.CfnIndex(stack, 'existing-index', {
    edition: 'ENTERPRISE',
    name: 'existingIndex',
    roleArn: existingRole.roleArn
  });

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["WRITE"],
    existingKendraIndexObj: existingIndex,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);

  // Make sure we didn't create an index anyway
  template.resourceCountIs("AWS::Kendra::Index", 1);
  template.hasResourceProperties("AWS::Kendra::Index", {
    Edition: 'ENTERPRISE'
  });
});

test('Launch with S3 data source with overridden defaults', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name223423';
  const testInclusionPattern = 'this-folder';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["WRITE"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          inclusionPatterns: [testInclusionPattern],
          bucketName: testBucketName,
        }
      }
    }
    ],
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Kendra::DataSource", 1);
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        InclusionPatterns: [testInclusionPattern],
        BucketName: testBucketName
      },
    }
  });
});

test('Launch with S3 data source and unsupported data source', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22';
  const nonImplementedSourceType = "WEBCRAWLER";
  const nonImplementedSourceName = "test-other-source";

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  // Create a role
  const fakeRole = new iam.Role(stack, 'fakeRole', {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    roleName: 'externalFakeRole'
  });

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["WRITE"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    },
    {
      name: nonImplementedSourceName,
      roleArn: fakeRole.roleArn,
      type: nonImplementedSourceType,
    }],
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Kendra::DataSource", 2);

  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: testBucketName
      },
    },
    RoleArn: {
      "Fn::GetAtt": ["sampledatasourcerolesample05A05F8BD", "Arn"]
    },
  });
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Name: nonImplementedSourceName,
    Type: nonImplementedSourceType,
  });

});

test('Launch with multiple S3 data sources', () => {
  const stack = new cdk.Stack();
  const testBucketName = 'test-bucket-name22342';
  const secondBucketName = 'second-bucket-name22342342';

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'two-sources', {
    lambdaFunctionProps: lambdaProps,
    indexPermissions: ["WRITE"],
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    },
    {
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: secondBucketName,
        }
      }
    }],
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Kendra::DataSource", 2);
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: testBucketName
      },
    },
    RoleArn: {
      "Fn::GetAtt": ["twosourcesdatasourceroletwosources0B8E24996", "Arn"]
    },
  });
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: secondBucketName
      },
    },
    RoleArn: {
      "Fn::GetAtt": ["twosourcesdatasourceroletwosources164176C5E", "Arn"]
    },
  });
});

test('Test with custom environment variable name', () => {
  const stack = new cdk.Stack();

  const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  new LambdaToKendra(stack, 'sample', {
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: 'your-bucket-name',
        }
      }
    }
    ],
    indexIdEnvironmentVariableName: "MY_VAR_NAME",
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        MY_VAR_NAME: {
          "Fn::GetAtt": ["samplekendraindexsample8A81A6C2", "Id"]
        }
      }
    }
  });

});

test('Confirm CheckVpcProps is being called', () => {
  const stack = new cdk.Stack();
  const testFunctionName = 'test-function-name24334';
  const testBucketName = 'test-bucket-name12344';

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const lambdaProps: lambda.FunctionProps = {
    functionName: testFunctionName,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  const props: LambdaToKendraProps = {
    lambdaFunctionProps: lambdaProps,
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: testBucketName,
        }
      }
    }
    ],
    deployVpc: true,
    existingVpc: vpc
  };

  const app = () => {
    new LambdaToKendra(stack, 'sample', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToKendraProps = {
    kendraDataSourcesProps: [{
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: 'testBucketName',
        }
      }
    }
    ],
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToKendra(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
