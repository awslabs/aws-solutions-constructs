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

import { LambdaToElasticSearchAndKibana, LambdaToElasticSearchAndKibanaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain",
    UserPoolId: {
      Ref: "testlambdaelasticsearchstackCognitoUserPool05D1387E"
    }
  });

  template.hasResourceProperties('AWS::Elasticsearch::Domain', {
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

test('Check that TLS 1.2 is the default', () => {
  const stack = new cdk.Stack();

  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    createCloudWatchAlarms: false
  };

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-opensearch-stack', props);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
    DomainEndpointOptions: {
      EnforceHTTPS: true,
      TLSSecurityPolicy: "Policy-Min-TLS-1-2-2019-07"
    },
  });
});

test('check lambda function custom environment variable', () => {
  const stack = new cdk.Stack();
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: 'test-domain',
    domainEndpointEnvironmentVariableName: 'CUSTOM_DOMAIN_ENDPOINT'
  };

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: false,
    }
  });

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

test('Test minimal deployment with an existing isolated VPC', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.getTestVpc(stack, false, {
    vpcName: "existing-isolated-vpc-test"
  });

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    existingVpc: vpc
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "existing-isolated-vpc-test"
      }
    ]
  });

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.resourceCountIs("AWS::EC2::VPC", 1);
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

  const construct = new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    domainName: "test",
    existingVpc: vpc
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "Default/existing-private-vpc-test"
      }
    ]
  });

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.resourceCountIs("AWS::EC2::VPC", 1);
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "vpc-props-test"
      }
    ]
  });

  template.hasResourceProperties("AWS::Elasticsearch::Domain", {
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

  template.resourceCountIs("AWS::EC2::VPC", 1);
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

  const vpc = defaults.getTestVpc(stack);

  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
      lambdaFunctionProps: defaults.consolidateProps(getDefaultTestLambdaProps(), {}, { vpc }),
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
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
  };
}

test('Confirm CheckVpcProps is being called', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      domainName: "test",
      deployVpc: true,
      vpcProps: {
        vpcName: "existing-vpc-test"
      },
      existingVpc: defaults.getTestVpc(stack),
    });
  };

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

  const props: LambdaToElasticSearchAndKibanaProps = {
    domainName: 'name',
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
