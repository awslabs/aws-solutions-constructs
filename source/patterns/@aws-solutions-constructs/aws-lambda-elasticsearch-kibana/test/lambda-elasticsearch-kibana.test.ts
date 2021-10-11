/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as ec2 from "@aws-cdk/aws-ec2";

function deployNewFunc(stack: cdk.Stack) {
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler'
    },
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
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler'
    },
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

test('check lambda function ustom environment variable', () => {
  const stack = new cdk.Stack();
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
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
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    domainName: 'test-domain',
    cognitoDomainName: 'test-cognito-domain'
  };

  new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);

  expect(stack).toHaveResource('AWS::Cognito::UserPoolDomain', {
    Domain: 'test-cognito-domain'
  });
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

// --------------------------------------------------------------
// Test deployment that deploys a VPC with vpcProps
// --------------------------------------------------------------
test("Test deployment that deploys a VPC with vpcProps", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const vpcProps = {
    maxAzs: 3
  };
  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    domainName: 'test-domain',
    vpcProps,
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {
    maxAzs: 3,
  });

  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    domainName: 'test-domain',
    existingVpc: testVpc,
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
          Ref: "testvpcPrivateSubnet1Subnet865FB50A",
        },
        {
          Ref: "testvpcPrivateSubnet2Subnet23D3396F",
        },
        {
          Ref: "testvpcPrivateSubnet3SubnetD71C361C"
        }
      ],
    },
  });
});

// --------------------------------------------------------------
// Test bad call with existingVpc AND deployVpc
// --------------------------------------------------------------
test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {
    natGateways: 1,
    natGatewaySubnets: {
      subnetType: ec2.SubnetType.PUBLIC
    },
    enableDnsHostnames: true,
    enableDnsSupport: true,
    subnetConfiguration: [
      {
        cidrMask: 18,
        name: "private",
        subnetType: ec2.SubnetType.PRIVATE,
      },
      {
        cidrMask: 18,
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      }
    ]
  });

  const app = () => {
    // Helper declaration
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      domainName: 'test-domain',
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test bad call with existingVpc AND vpcProps
// --------------------------------------------------------------
test("Test bad call with existingVpc AND vpcProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {
    enableDnsHostnames: true,
    enableDnsSupport: true,
  });

  const app = () => {
    // Helper declaration
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      domainName: 'test-domain',
      existingVpc: testVpc,
      vpcProps: {
        maxAzs: 3,
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test bad call with lambdaFunctionProps.vpc
// --------------------------------------------------------------
test("Test bad call with lambdaFunctionProps.vpc", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        vpc: testVpc
      },
      domainName: 'test-domain',
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test bad call with lambdaFunctionProps.vpcSubnets
// --------------------------------------------------------------
test("Test bad call with lambdaFunctionProps.vpcSubnets", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        vpcSubnets: testVpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE
        })
      },
      domainName: 'test-domain',
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test bad call with esDomainProps.vpcOptions
// --------------------------------------------------------------
test("Test bad call with esDomainProps.vpcOptions", () => {
  // Stack
  const stack = new cdk.Stack();

  const app = () => {
    // Helper declaration
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      domainName: 'test-domain',
      esDomainProps: {
        vpcOptions: {},
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test bad call with existingVpc has less than 1 AZs
// --------------------------------------------------------------
test("Test bad call with existingVpc has less than 1 AZs", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {
    maxAzs: 0,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: "private",
        subnetType: ec2.SubnetType.ISOLATED,
      },
    ]
  });

  // Helper declaration
  const app = () => {
    new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      domainName: 'test-domain',
      existingVpc: testVpc,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test ES cluster deploy to 1 AZ when user set zoneAwarenessEnabled to false
// --------------------------------------------------------------
test("Test ES cluster deploy to 1 AZ when user set zoneAwarenessEnabled to false", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const esDomainProps = {
    elasticsearchClusterConfig: {
      zoneAwarenessEnabled: false,
      // zoneAwarenessConfig: {
      //   availabilityZoneCount: 2
      // }
    }
  };

  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    domainName: 'test-domain',
    esDomainProps,
    deployVpc: true,
  });

  // Assertion
  expect(stack).toHaveResource("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3,
      },
      ZoneAwarenessEnabled: false,
    }
  });
});

// --------------------------------------------------------------
// Test ES cluster deploy to 2 AZ when user set availabilityZoneCount to 2
// --------------------------------------------------------------
test("Test ES cluster deploy to 2 AZ when user set availabilityZoneCount to 2", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const esDomainProps = {
    elasticsearchClusterConfig: {
      zoneAwarenessConfig: {
        availabilityZoneCount: 2
      }
    }
  };

  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    domainName: 'test-domain',
    esDomainProps,
    deployVpc: true,
  });

  // Assertion
  expect(stack).toHaveResource("AWS::Elasticsearch::Domain", {
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 2,
      },
      ZoneAwarenessEnabled: true,
    }
  });
});

// --------------------------------------------------------------
// Test ES cluster deploy to 3 AZs when user using default values for ElasticsearchClusterConfig
// --------------------------------------------------------------
test("Test ES cluster deploy to 3 AZs when user using default values for ElasticsearchClusterConfig", () => {
  // Stack
  const stack = new cdk.Stack(undefined, "test", {
    env: {
      account: "dummy_account",
      region: "dummy_region",
    }
  });

  const esDomainProps = {
    elasticsearchClusterConfig: {}
  };

  // Helper declaration
  new LambdaToElasticSearchAndKibana(stack, "lambda-elasticsearch-kibana-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    domainName: 'test-domain',
    esDomainProps,
    deployVpc: true,
  });

  // Assertion
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
});