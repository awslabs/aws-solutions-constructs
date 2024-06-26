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

import { LambdaToKinesisStreams, LambdaToKinesisStreamsProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Match, Template } from "aws-cdk-lib/assertions";
import { Stack } from "aws-cdk-lib";
import * as defaults from '@aws-solutions-constructs/core';

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const construct = new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  });

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();

  // By default, we don't create a VPC
  expect(construct.vpc).toBeUndefined();
});

test('New VPC is created when deployVpc flag is true', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    deployVpc: true
  });

  const template = Template.fromStack(stack);

  // Get the VPC created by the construct
  template.resourceCountIs('AWS::EC2::VPC', 1);
  const vpcResource = template.findResources('AWS::EC2::VPC');
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(template, vpcId, "Isolated");
});

test('Existing VPC is used when specified', () => {
  const stack = new cdk.Stack();

  const existingVpc = new ec2.Vpc(stack, 'test-vpc', { vpcName: 'my-vpc-name' });

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingVpc
  });

  const template = Template.fromStack(stack);

  // Get the VPC by its name
  template.resourceCountIs('AWS::EC2::VPC', 1);
  const vpcResource = template.findResources('AWS::EC2::VPC');
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(template, vpcId, "Private");
});

test('New VPC is created from user-provided vpcProps', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    vpcProps: {
      vpcName: 'my-vpc-name'
    },
    deployVpc: true
  });

  const template = Template.fromStack(stack);

  // Get the VPC by its name
  template.resourceCountIs('AWS::EC2::VPC', 1);
  const vpcResource = template.findResources('AWS::EC2::VPC');
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(template, vpcId, "Isolated");
});

test('Lambda Function has default stream environment variable', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        KINESIS_DATASTREAM_NAME: {
          Ref: kinesisStreamId
        }
      }
    }
  });
});

test('Lambda Function stream name environment variable can be overridden', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    streamEnvironmentVariableName: 'CUSTOM_ENV_VAR_NAME'
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        CUSTOM_ENV_VAR_NAME: {
          Ref: kinesisStreamId
        }
      }
    }
  });
});

test('Kinesis Stream is encrypted with AWS-managed CMK by default', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });
});

test('CloudWatch Alarms are created for Kinesis Stream by default', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'GetRecords.IteratorAgeMilliseconds'
  });

  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'ReadProvisionedThroughputExceeded'
  });
});

test('CloudWatch Alarms are not created when createCloudWatchAlarms property is set to false', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    createCloudWatchAlarms: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
});

test('Error is thrown when vpc is specified and existing lambda function is not associated with it', () => {
  const stack = new Stack();

  const existingLambdaObj = new lambda.Function(stack, 'test-lamba', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  });

  const existingVpc = new ec2.Vpc(stack, 'test-vpc', {});

  const app = () => {
    new LambdaToKinesisStreams(stack, 'lambda-to-sqs-stack', {
      existingLambdaObj,
      existingVpc
    });
  };

  expect(app).toThrowError();
});

test('Construct uses existing Lambda Function', () => {
  const stack = new Stack();

  const existingLambdaObj = new lambda.Function(stack, 'test-lamba', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    functionName: 'my-lambda-function'
  });

  new LambdaToKinesisStreams(stack, 'lambda-to-sqs-stack', {
    existingLambdaObj
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'my-lambda-function'
  });
});

test('Construct uses existing Kinesis Stream', () => {
  const stack = new Stack();

  const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
    streamName: 'my-stream',
  });

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingStreamObj
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    Name: 'my-stream'
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('Construct uses unencrypted existing stream', () => {
  const stack = new Stack();

  const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
    streamName: 'my-stream',
    encryption: kinesis.StreamEncryption.UNENCRYPTED
  });

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingStreamObj
  });

  const template = Template.fromStack(stack);
  defaults.expectNonexistence(stack, 'AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('Construct uses unencrypted streams from stream props', () => {
  const stack = new Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    kinesisStreamProps: {
      streamName: 'my-stream',
      encryption: kinesis.StreamEncryption.UNENCRYPTED
    }
  });

  const template = Template.fromStack(stack);
  defaults.expectNonexistence(stack, 'AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('Construct grants PutRecord permission for the Lambda Function to write to the Kinesis Stream', () => {
  const stack = new Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords'
          ],
          Effect: 'Allow',
          Resource: '*'
        },
        {
          Action: [
            'kinesis:ListShards',
            'kinesis:PutRecord',
            'kinesis:PutRecords'
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::GetAtt': [
              kinesisStreamId,
              'Arn'
            ]
          }
        }
      ]
    }
  });
});

test('When a Customer-manged CMK is used on an existing stream, construct grants the Lambda Function permission to use the encryption key so it can publish messages to it', () => {
  const stack = new Stack();

  const encryptionKey = new kms.Key(stack, 'Key', {
    description: 'my-key-description'
  });

  const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
    streamName: 'my-stream',
    encryptionKey
  });

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingStreamObj
  });

  const template = Template.fromStack(stack);
  const resource = template.findResources('AWS::KMS::Key', {
    Properties: {
      Description: Match.exact('my-key-description')
    }
  });
  const [ kmsKey ] = Object.keys(resource);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords'
          ],
          Effect: 'Allow',
          Resource: '*'
        },
        {
          Action: [
            'kinesis:ListShards',
            'kinesis:PutRecord',
            'kinesis:PutRecords'
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::GetAtt': [
              'teststream04374A09',
              'Arn'
            ]
          }
        },
        {
          Action: [
            'kms:Encrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*'
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::GetAtt': [
              kmsKey,
              'Arn'
            ]
          }
        },
        {
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey*'
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::GetAtt': [
              kmsKey,
              'Arn'
            ]
          }
        }
      ]
    }
  });
});

function verifyLambdaFunctionVpcProps(template: Template, vpcId: string, subnetType: string) {
  // Get the Security Group associated with the VPC
  const securityGroupResource = template.findResources('AWS::EC2::SecurityGroup', {
    Properties: {
      VpcId: {
        Ref: Match.exact(vpcId)
      }
    }
  });
  const [ securityGroupId ] = Object.keys(securityGroupResource);

  // Get the Private or Isolated Subnets associated with the VPC
  const subnetResources = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      Tags: Match.arrayWith([
        {
          Key: "aws-cdk:subnet-type",
          Value: subnetType
        }
      ])
    }
  });
  const [subnet1, subnet2] = Object.keys(subnetResources);

  // Verify the Lambda Function has the same Security Group
  template.hasResourceProperties('AWS::Lambda::Function', {
    VpcConfig: {
      SecurityGroupIds: [
        {
          'Fn::GetAtt': [
            securityGroupId,
            'GroupId'
          ]
        }
      ],
      SubnetIds: [
        {
          Ref: subnet1
        },
        {
          Ref: subnet2
        }
      ]
    }
  });

  // Verify the VPC has an interface endpoint for Kinesis Streams
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': [
        '',
        [
          'com.amazonaws.',
          {
            Ref: 'AWS::Region'
          },
          '.kinesis-streams'
        ]
      ]
    },
    VpcId: {
      Ref: vpcId
    },
  });

  // Verify the VPC has dns hostnames and support enabled
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
}

test('Confirm CheckVpcProps() is being called', () => {
  const stack = new cdk.Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    // Helper declaration
    new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler'
      },
      deployVpc: true,
      existingVpc: vpc
    });
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

  const props: LambdaToKinesisStreamsProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToKinesisStreams(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm call to CheckKinesisStreamProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();

  const props: LambdaToKinesisStreamsProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingStreamObj: new kinesis.Stream(stack, 'test', {}),
    kinesisStreamProps: {}
  };
  const app = () => {
    new LambdaToKinesisStreams(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});
