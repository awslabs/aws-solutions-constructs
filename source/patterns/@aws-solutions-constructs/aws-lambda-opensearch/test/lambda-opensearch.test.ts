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

import { LambdaToOpenSearch, LambdaToOpenSearchProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';
import { getTestVpc } from "@aws-solutions-constructs/core";

function deployLambdaToOpenSearch(stack: cdk.Stack) {
  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain'
  };

  return new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);
}

function getDefaultTestLambdaProps(): lambda.FunctionProps {
  return {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
  };
}

test('Check pattern properties', () => {
  const stack = new cdk.Stack();

  const construct: LambdaToOpenSearch = deployLambdaToOpenSearch(stack);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.openSearchDomain).toBeDefined();
  expect(construct.identityPool).toBeDefined();
  expect(construct.userPool).toBeDefined();
  expect(construct.userPoolClient).toBeDefined();
  expect(construct.cloudWatchAlarms).toBeDefined();
  expect(construct.openSearchRole).toBeDefined();
});

test('Check properties with no CloudWatch alarms ', () => {
  const stack = new cdk.Stack();

  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    createCloudWatchAlarms: false
  };

  const construct = new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.openSearchDomain).toBeDefined();
  expect(construct.identityPool).toBeDefined();
  expect(construct.userPool).toBeDefined();
  expect(construct.userPoolClient).toBeDefined();
  expect(construct.cloudWatchAlarms).toBeUndefined();
  expect(construct.openSearchRole).toBeDefined();
});

test('Check that TLS 1.2 is the default', () => {
  const stack = new cdk.Stack();

  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    createCloudWatchAlarms: false
  };

  new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainEndpointOptions: {
      EnforceHTTPS: true,
      TLSSecurityPolicy: "Policy-Min-TLS-1-2-2019-07"
    },
  });
});

test('Check for an existing Lambda object', () => {
  const stack = new cdk.Stack();

  const existingLambdaObj = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      functionName: 'test-function'
    }
  });

  const props: LambdaToOpenSearchProps = {
    openSearchDomainName: 'test-domain',
    existingLambdaObj
  };

  new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'test-function'
  });

});

test('Check Lambda function custom environment variable', () => {
  const stack = new cdk.Stack();
  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    domainEndpointEnvironmentVariableName: 'CUSTOM_DOMAIN_ENDPOINT'
  };

  new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_DOMAIN_ENDPOINT: {
          'Fn::GetAtt': [
            'testlambdaopensearchstackOpenSearchDomain46D6A86E',
            'DomainEndpoint'
          ]
        }
      }
    }
  });
});

test('Check domain name', () => {
  const stack = new cdk.Stack();

  deployLambdaToOpenSearch(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain",
    UserPoolId: {
      Ref: "testlambdaopensearchstackCognitoUserPoolF5169460"
    }
  });

  template.hasResourceProperties('AWS::OpenSearchService::Domain', {
    DomainName: "test-domain",
  });
});

test('Check cognito domain name override', () => {
  const stack = new cdk.Stack();
  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    cognitoDomainName: 'test-cogn-domain'
  };

  new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
    Domain: 'test-cogn-domain'
  });
});

test('Check engine version override', () => {
  const stack = new cdk.Stack();
  const props: LambdaToOpenSearchProps = {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    openSearchDomainProps: {
      engineVersion: 'OpenSearch_1.0',
    }
  };

  new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::OpenSearchService::Domain', {
    EngineVersion: 'OpenSearch_1.0'
  });
});

test("Test minimal deployment that deploys a VPC in 2 AZ without vpcProps", () => {
  const stack = new cdk.Stack(undefined, undefined, {});

  new LambdaToOpenSearch(stack, "lambda-opensearch-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdaopensearchstackReplaceDefaultSecurityGroupsecuritygroup293B90D7",
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

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
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

  new LambdaToOpenSearch(stack, "lambda-opensearch-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdaopensearchstackReplaceDefaultSecurityGroupsecuritygroup293B90D7",
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

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
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

test("Test cluster deploy to 1 AZ when user set zoneAwarenessEnabled to false", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const openSearchDomainProps = {
    clusterConfig: {
      dedicatedMasterCount: 3,
      dedicatedMasterEnabled: true,
      zoneAwarenessEnabled: false,
      instanceCount: 3
    }
  };

  new LambdaToOpenSearch(stack, "lambda-opensearch-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    openSearchDomainProps,
    deployVpc: true,
    vpcProps: {
      maxAzs: 1
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: false,
    }
  });

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
        }
      ]
    }
  });
});

test("Test cluster deploy to 2 AZ when user set availabilityZoneCount to 2", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const openSearchDomainProps = {
    clusterConfig: {
      dedicatedMasterCount: 3,
      dedicatedMasterEnabled: true,
      instanceCount: 2,
      zoneAwarenessEnabled: true,
      zoneAwarenessConfig: {
        availabilityZoneCount: 2
      }
    }
  };

  new LambdaToOpenSearch(stack, "lambda-opensearch-stack", {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: 'test-domain',
    openSearchDomainProps,
    deployVpc: true,
    vpcProps: {
      maxAzs: 2
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 2,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 2,
      },
      ZoneAwarenessEnabled: true,
    }
  });

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
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

  const construct = new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: "test",
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

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
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

  const vpc = getTestVpc(stack, true, {
    vpcName: "existing-private-vpc-test"
  });

  const construct = new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: "test",
    existingVpc: vpc
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    Tags: [
      {
        Key: "Name",
        Value: "existing-private-vpc-test"
      }
    ]
  });

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    VPCOptions: {
      SubnetIds: [
        {
          Ref: "VpcPrivateSubnet1Subnet536B997A"
        },
        {
          Ref: "VpcPrivateSubnet2Subnet3788AAA1"
        },
        {
          Ref: "VpcPrivateSubnet3SubnetF258B56E"
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

  const construct = new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
    lambdaFunctionProps: getDefaultTestLambdaProps(),
    openSearchDomainName: "test",
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

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
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
    new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      openSearchDomainName: "test",
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
    new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
      lambdaFunctionProps: defaults.consolidateProps(getDefaultTestLambdaProps(), {}, { vpc }),
      openSearchDomainName: "test",
      deployVpc: true,
    });
  };

  expect(app).toThrowError("Error - Define VPC using construct parameters not Lambda function props");
});

test('Confirm CheckOpenSearchProps is called', () => {
  const stack = new cdk.Stack();

  const app = () => {
    new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      openSearchDomainProps: {
        vpcOptions: {
          subnetIds: ['fake-ids'],
          securityGroupIds: ['fake-sgs']
        }
      },
      openSearchDomainName: "test",
      deployVpc: true,
    });
  };

  expect(app).toThrowError("Error - Define VPC using construct parameters not the OpenSearch Service props");
});

test('Test error for missing existingLambdaObj or lambdaFunctionProps', () => {
  const stack = new cdk.Stack();

  const props: LambdaToOpenSearchProps = {
    openSearchDomainName: 'test-domain'
  };

  try {
    new LambdaToOpenSearch(stack, 'test-lambda-opensearch-stack', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('Confirm CheckVpcProps is being called', () => {
  const stack = new cdk.Stack();
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
      lambdaFunctionProps: getDefaultTestLambdaProps(),
      openSearchDomainName: "test",
      vpcProps: {
        vpcName: "existing-vpc-test"
      },
      deployVpc: true,
      existingVpc: vpc
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

  const props: LambdaToOpenSearchProps = {
    openSearchDomainName: 'name',
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToOpenSearch(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
