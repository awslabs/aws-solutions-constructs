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

// Imports
import { Stack } from "aws-cdk-lib";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToSns, LambdaToSnsProps } from '../lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

test('Test deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const testConstruct = new LambdaToSns(stack, 'lambda-to-sns-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    }
  });

  expect(testConstruct.snsTopic).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        LAMBDA_NAME: 'deployed-function',
        SNS_TOPIC_ARN: {
          Ref: 'lambdatosnsstackSnsTopic6292A14A'
        },
        SNS_TOPIC_NAME: {
          'Fn::GetAtt': [
            'lambdatosnsstackSnsTopic6292A14A',
            'TopicName'
          ]
        }
      }
    }
  });
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

test('Test deployment with existing existingTopicObj', () => {
  // Stack
  const stack = new Stack();

  const topic = new sns.Topic(stack, 'MyTopic', {
    topicName: "custom-topic"
  });

  // Helper declaration
  new LambdaToSns(stack, 'lambda-to-sns-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'override-function'
      }
    },
    existingTopicObj: topic
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
});

test('override topicProps', () => {
  const stack = new Stack();

  const props: LambdaToSnsProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    topicProps: {
      topicName: "custom-topic"
    }
  };

  new LambdaToSns(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
});

test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSns(stack, 'lambda-to-sns-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
    // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func).toBeDefined();
  // Assertion 2
  const topic = pattern.snsTopic;
  expect(topic).toBeDefined();
});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSns(stack, "lambda-to-sns-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosnsstackReplaceDefaultSecurityGroupsecuritygroup64D1B1DA",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSns(stack, "lambda-to-sns-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr("192.68.0.0/16"),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosnsstackReplaceDefaultSecurityGroupsecuritygroup64D1B1DA",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToSns(stack, "lambda-to-sns-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosnsstackReplaceDefaultSecurityGroupsecuritygroup64D1B1DA",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "testvpcPrivateSubnet1Subnet865FB50A",
        },
        {
          Ref: "testvpcPrivateSubnet2Subnet23D3396F",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // buildLambdaFunction should throw an error if the Lambda function is not
    // attached to a VPC
    new LambdaToSns(stack, "lambda-to-sns-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToSns(stack, 'lambda-to-sns-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    topicArnEnvironmentVariableName: 'CUSTOM_TOPIC_ARN',
    topicNameEnvironmentVariableName: 'CUSTOM_TOPIC_NAME'
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_TOPIC_ARN: {
          Ref: 'lambdatosnsstackSnsTopic6292A14A'
        },
        CUSTOM_TOPIC_NAME: {
          'Fn::GetAtt': [
            'lambdatosnsstackSnsTopic6292A14A',
            'TopicName'
          ]
        }
      }
    }
  });
});

test('Topic is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'cmk');
  new LambdaToSns(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    encryptionKey: cmk
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with imported CMK when set on topicProps.masterKey prop', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'cmk');
  new LambdaToSns(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    topicProps: {
      masterKey: cmk
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with provided encryptionKeyProps', () => {
  const stack = new Stack();

  new LambdaToSns(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructtestconstructKey1FB48CCA',
        'Arn'
      ]
    },
  });

  template.hasResourceProperties('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'testconstructtestconstructKey1FB48CCA',
        'Arn'
      ]
    }
  });
});

test('Topic is encrypted by default with AWS-managed KMS key when no other encryption properties are set', () => {
  const stack = new Stack();

  new LambdaToSns(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

test('Topic is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new Stack();

  new LambdaToSns(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    enableEncryptionWithCustomerManagedKey: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructtestconstructKey1FB48CCA',
        'Arn'
      ]
    },
  });
});

test('Confirm CheckVpcProps is called', () => {
  const stack = new Stack();

  const app = () => {
    new LambdaToSns(stack, 'test-construct', {
      existingVpc: new ec2.Vpc(stack, "test-vpc", {}),
      deployVpc: true
    });
  };

  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test that CheckSnsProps is getting called', () => {
  const stack = new Stack();

  const topic = new sns.Topic(stack, 'MyTopic', {
    topicName: "custom-topic"
  });

  const props: LambdaToSnsProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingTopicObj: topic,
    topicProps: {
      topicName: 'topic-name'
    },
  };

  const app = () => {
    new LambdaToSns(stack, 'test-lambda-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide topicProps or existingTopicObj, but not both.\n/);
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToSnsProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToSns(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
