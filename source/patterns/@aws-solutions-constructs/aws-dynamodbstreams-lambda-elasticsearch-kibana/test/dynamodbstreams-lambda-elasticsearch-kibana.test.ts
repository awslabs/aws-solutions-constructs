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

import { DynamoDBStreamsToLambdaToElasticSearchAndKibana, DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as defaults from '@aws-solutions-constructs/core';
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain'
  };

  return new DynamoDBStreamsToLambdaToElasticSearchAndKibana(stack, 'test-dynamodb-stream-lambda-elasticsearch-stack', props);
}

function getDefaultTestLambdaProps(): lambda.FunctionProps {
  return {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
  };
}

test('check domain names', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain",
    UserPoolId: {
      Ref: "testdynamodbstreamlambdaelasticsearchstackLambdaToElasticSearchCognitoUserPoolF99F93E5"
    }
  });

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: DynamoDBStreamsToLambdaToElasticSearchAndKibana = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.dynamoTable !== null);
  expect(construct.elasticsearchDomain !== null);
  expect(construct.elasticsearchRole !== null);
  expect(construct.identityPool !== null);
  expect(construct.userPool !== null);
  expect(construct.userPoolClient !== null);
  expect(construct.cloudwatchAlarms !== null);
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps = {
    domainName: 'test-domain'
  };

  try {
    new DynamoDBStreamsToLambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('Test minimal deployment with VPC construct props', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const construct = new DynamoDBStreamsToLambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    deployVpc: true,
    vpcProps: {
      vpcName: "vpc-props-test"
    }
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "vpc-props-test"
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "testlambdaelasticsearchkibanaVpcisolatedSubnet1Subnet70A13487"
        },
        {
          Ref: "testlambdaelasticsearchkibanaVpcisolatedSubnet2Subnet26B35F4A"
        },
        {
          Ref: "testlambdaelasticsearchkibanaVpcisolatedSubnet3SubnetB4A5AAE6"
        }
      ]
    }
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
  expect(construct.vpc).toBeDefined();
});

test('Test minimal deployment with an existing private VPC', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = new ec2.Vpc(stack, 'existing-private-vpc-test', {
    natGateways: 1,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: 'application',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 24,
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      }
    ]
  });

  const construct = new DynamoDBStreamsToLambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    existingVpc: vpc
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "Default/existing-private-vpc-test"
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "existingprivatevpctestapplicationSubnet1Subnet1F7744F0"
        },
        {
          Ref: "existingprivatevpctestapplicationSubnet2SubnetF7B713AD"
        },
        {
          Ref: "existingprivatevpctestapplicationSubnet3SubnetA519E038"
        }
      ]
    }
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
  expect(construct.vpc).toBeDefined();
});

test('Test minimal deployment with an existing isolated VPC', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.getTestVpc(stack, false, {
    vpcName: "existing-isolated-vpc-test"
  });

  const construct = new DynamoDBStreamsToLambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    existingVpc: vpc
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "existing-isolated-vpc-test"
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055"
        },
        {
          Ref: "VpcisolatedSubnet3Subnet44F2537D"
        }
      ]
    }
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
  expect(construct.vpc).toBeDefined();
});