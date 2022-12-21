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

import { LambdaToKinesisStreams } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as kms from 'aws-cdk-lib/aws-kms';
import '@aws-cdk/assert/jest';
import { Match, Template } from "aws-cdk-lib/assertions";
import { Stack } from "aws-cdk-lib";

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const construct = new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    deployVpc: true
  });

  const template = Template.fromStack(stack);

  // Get the VPC created by the construct
  const vpcResource = template.findResources('AWS::EC2::VPC');
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(stack, template, vpcId);
});

test('Existing VPC is used when specified', () => {
  const stack = new cdk.Stack();

  const existingVpc = new ec2.Vpc(stack, 'test-vpc', {
    vpcName: 'my-vpc-name'
  });

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    existingVpc
  });

  const template = Template.fromStack(stack);

  // Get the VPC by its name
  const vpcResource = template.findResources('AWS::EC2::VPC', {
    Properties: {
      Name: 'my-vpc-name'
    }
  });
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(stack, template, vpcId);
});

test('New VPC is created from user-provided vpcProps', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    vpcProps: {
      vpcName: 'my-vpc-name'
    },
    deployVpc: true
  });

  const template = Template.fromStack(stack);

  // Get the VPC by its name
  const vpcResource = template.findResources('AWS::EC2::VPC', {
    Properties: {
      Name: 'my-vpc-name'
    }
  });
  const [ vpcId ] = Object.keys(vpcResource);

  verifyLambdaFunctionVpcProps(stack, template, vpcId);
});

test('Lambda Function has default stream environment variable', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    streamEnvironmentVariableName: 'CUSTOM_ENV_VAR_NAME'
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    }
  });

  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    }
  });

  expect(stack).toHaveResourceLike('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'GetRecords.IteratorAgeMilliseconds'
  });

  expect(stack).toHaveResourceLike('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'ReadProvisionedThroughputExceeded'
  });
});

test('CloudWatch Alarms are not created when createCloudWatchAlarms property is set to false', () => {
  const stack = new cdk.Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    createCloudWatchAlarms: false
  });

  expect(stack).toCountResources('AWS::CloudWatch::Alarm', 0);
});

test('Error is thrown when vpc is specified and existing lambda function is not associated with it', () => {
  const stack = new Stack();

  const existingLambdaObj = new lambda.Function(stack, 'test-lamba', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_18_X,
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
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    functionName: 'my-lambda-function'
  });

  new LambdaToKinesisStreams(stack, 'lambda-to-sqs-stack', {
    existingLambdaObj
  });

  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    existingStreamObj
  });

  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
    Name: 'my-stream'
  });

  expect(stack).toCountResources('AWS::Kinesis::Stream', 1);
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    existingStreamObj
  });

  expect(stack).not.toHaveResourceLike('AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });

  expect(stack).toCountResources('AWS::Kinesis::Stream', 1);
});

test('Construct uses unencrypted streams from stream props', () => {
  const stack = new Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    },
    kinesisStreamProps: {
      streamName: 'my-stream',
      encryption: kinesis.StreamEncryption.UNENCRYPTED
    }
  });

  expect(stack).not.toHaveResourceLike('AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });

  expect(stack).toCountResources('AWS::Kinesis::Stream', 1);
});

test('Construct grants PutRecord permission for the Lambda Function to write to the Kinesis Stream', () => {
  const stack = new Stack();

  new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
      runtime: lambda.Runtime.NODEJS_18_X,
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

  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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

function verifyLambdaFunctionVpcProps(stack: Stack, template: Template, vpcId: string) {
  // Get the Security Group associated with the VPC
  const securityGroupResource = template.findResources('AWS::EC2::SecurityGroup', {
    Properties: {
      VpcId: {
        Ref: Match.exact(vpcId)
      }
    }
  });
  const [ securityGroupId ] = Object.keys(securityGroupResource);

  // Get the Subnets associated with the VPC
  const subnetResources = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      VpcId: {
        Ref: Match.exact(vpcId)
      }
    }
  });
  const [subnet1, subnet2] = Object.keys(subnetResources);

  // Verify the Lambda Function has the same Security Group
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
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
  expect(stack).toHaveResourceLike('AWS::EC2::VPCEndpoint', {
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
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
}