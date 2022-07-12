/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { LambdaToElasticSearchAndKibana, LambdaToElasticSearchAndKibanaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain'
  };

  return new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);
}

test('check domain names', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain",
    UserPoolId: {
      Ref: "testlambdaelasticsearchstackCognitoUserPool05D1387E"
    }
  });

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: LambdaToElasticSearchAndKibana = deployNewFunc(stack);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.elasticsearchDomain).toBeDefined();
  expect(construct.identityPool).toBeDefined();
  expect(construct.userPool).toBeDefined();
  expect(construct.userPoolClient).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.elasticsearchRole).toBeDefined();
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: LambdaToElasticSearchAndKibanaProps = {
    domainName: 'test-domain'
  };

  try {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check properties with no CW Alarms ', () => {
  const stack = new cdk.Stack();

  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    createCloudWatchAlarms: false
  };

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.elasticsearchDomain).toBeDefined();
  expect(construct.identityPool).toBeDefined();
  expect(construct.userPool).toBeDefined();
  expect(construct.userPoolClient).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeUndefined();
  expect(construct.elasticsearchRole).toBeDefined();
});

test('check lambda function custom environment variable', () => {
  const stack = new cdk.Stack();
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    domainEndpointEnvironmentVariableName: 'CUSTOM_DOMAIN_ENDPOINT'
  };

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_DOMAIN_ENDPOINT: {
          'Fn::GetAtt': [
            'testlambdaelasticsearchstackElasticsearchDomain2DE7011B',
            'DomainEndpoint'
          ]
        }
      }
    }
  });
});

test('check override cognito domain name with provided cognito domain name', () => {
  const stack = new cdk.Stack();
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    cognitoDomainName: 'test-cognito-domain'
  };

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);

  expect(stack).toHaveResource('AWS::Cognito::UserPoolDomain', {
    Domain: 'test-cognito-domain'
  });
});

test("Test minimal deployment that deploys a VPC in 2 AZ without vpcProps", () => {
  const stack = new cdk.Stack(undefined, undefined, {});

  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdaelasticsearchkibanastackReplaceDefaultSecurityGroupsecuritygroup4C50002B",
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
        }
      ],
    },
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

test("Test minimal deployment that deploys a VPC in 3 AZ without vpcProps", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdaelasticsearchkibanastackReplaceDefaultSecurityGroupsecuritygroup4C50002B",
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
        {
          Ref: "VpcisolatedSubnet3Subnet44F2537D",
        },
      ],
    },
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

test("Test ES cluster deploy to 1 AZ when user set zoneAwarenessEnabled to false", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const esDomainProps = {
    elasticsearchClusterConfig: {
      dedicatedMasterCount: 3,
      dedicatedMasterEnabled: true,
      zoneAwarenessEnabled: false,
      instanceCount: 3
    }
  };

  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    esDomainProps,
    deployVpc: true,
    vpcProps: {
      maxAzs: 1
    }
  });

  expect(stack).toHaveResource("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: false,
    }
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
        }
      ]
    }
  });
});

test("Test ES cluster deploy to 2 AZ when user set availabilityZoneCount to 2", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const esDomainProps = {
    elasticsearchClusterConfig: {
      dedicatedMasterCount: 3,
      dedicatedMasterEnabled: true,
      instanceCount: 2,
      zoneAwarenessEnabled: true,
      zoneAwarenessConfig: {
        availabilityZoneCount: 2
      }
    }
  };

  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    esDomainProps,
    deployVpc: true,
    vpcProps: {
      maxAzs: 2
    }
  });

  expect(stack).toHaveResource("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 2,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 2,
      },
      ZoneAwarenessEnabled: true,
    }
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
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
});

test("Test ES cluster deploy to 3 AZs when user using default values for ElasticsearchClusterConfig", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3,
      },
      ZoneAwarenessEnabled: true,
    }
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
});

test('Test minimal deployment with an existing isolated VPC', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
    userVpcProps: {
      vpcName: "existing-isolated-vpc-test"
    }
  });

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
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

test('Test minimal deployment with an existing private VPC', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
    userVpcProps: {
      vpcName: "existing-private-vpc-test"
    }
  });

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    existingVpc: vpc
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "existing-private-vpc-test"
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::Elasticsearch::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "VpcprivateSubnet1SubnetCEAD3716"
        },
        {
          Ref: "VpcprivateSubnet2Subnet2DE7549C"
        },
        {
          Ref: "VpcprivateSubnet3SubnetA5AC68D9"
        }
      ]
    }
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
  expect(construct.vpc).toBeDefined();
});

test('Test minimal deployment with VPC construct props', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
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

test('Test error for vpcProps and undefined deployVpc prop', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      domainName: "test",
      vpcProps: {
        vpcName: "existing-vpc-test"
      }
    });
  };

  expect(app).toThrowError("Error - deployVpc must be true when defining vpcProps");
});

test('Test error for Lambda function VPC props', () => {
  const stack = new cdk.Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
      lambdaFunctionProps: defaults.consolidateProps(getDefaultTestLambdaProps(), { vpc }),
      domainName: "test",
      deployVpc: true,
    });
  };

  expect(app).toThrowError("Error - Define VPC using construct parameters not Lambda function props");
});

test('Test error for Elasticsearch domain VPC props', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      esDomainProps: {
        vpcOptions: {
          subnetIds: ['fake-ids'],
          securityGroupIds: ['fake-sgs']
        }
      },
      domainName: "test",
      deployVpc: true,
    });
  };

  expect(app).toThrowError("Error - Define VPC using construct parameters not Elasticsearch props");
});

function getDefaultTestLambdaProps(): lambda.FunctionProps {
  return {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
  };
}

test('Test 3 AZ Multi AZ ES deployment with VPC that has 6 AZ', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    vpcProps: {
      maxAzs: 6,
      vpcName: "vpc-test"
    },
    domainName: "test",
    deployVpc: true,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "vpc-test"
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
});