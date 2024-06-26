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
import * as defaults from "@aws-solutions-constructs/core";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaToElasticachememcached, LambdaToElasticachememcachedProps } from "../lib";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from "aws-cdk-lib/assertions";

const testPort = 12321;
const testFunctionName = "something-unique";
const testClusterName = "something-else";

test("When provided a VPC, does not create a second VPC", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  new LambdaToElasticachememcached(stack, "testStack", {
    existingVpc,
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::EC2::VPC", 1);
});

test("When provided an existingCache, does not create a second cache", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingCache = defaults.CreateTestCache(stack, "test-cache", existingVpc, testPort);

  new LambdaToElasticachememcached(stack, "testStack", {
    existingVpc,
    existingCache,
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::ElastiCache::CacheCluster", 1);
  template.hasResourceProperties("AWS::ElastiCache::CacheCluster", {
    Port: testPort,
  });
});

test("When provided an existingFunction, does not create a second function", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingFunction = new lambda.Function(stack, "test-function", {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: ".handler",
    vpc: existingVpc,
    functionName: testFunctionName,
  });

  new LambdaToElasticachememcached(stack, "testStack", {
    existingVpc,
    existingLambdaObj: existingFunction,
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
  });
});

test("Test custom environment variable name", () => {
  const stack = new cdk.Stack();

  const testEnvironmentVariableName = "CUSTOM_CLUSTER_NAME";

  new LambdaToElasticachememcached(stack, "test-construct", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
    cacheEndpointEnvironmentVariableName: testEnvironmentVariableName,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        CUSTOM_CLUSTER_NAME: {
          "Fn::Join": [
            "",
            [
              {
                "Fn::GetAtt": [
                  "testconstructtestconstructclusterCF9DF48A",
                  "ConfigurationEndpoint.Address",
                ],
              },
              ":",
              {
                "Fn::GetAtt": [
                  "testconstructtestconstructclusterCF9DF48A",
                  "ConfigurationEndpoint.Port",
                ],
              },
            ],
          ],
        },
      },
    },
  });
});

test("Test setting custom function properties", () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
      functionName: testFunctionName,
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
  });
});

test("Test setting custom cache properties", () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
    cacheProps: {
      clusterName: testClusterName,
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ElastiCache::CacheCluster", {
    ClusterName: testClusterName,
  });
});
test("Test setting custom VPC properties", () => {
  const stack = new cdk.Stack();
  const testCidrBlock = "192.168.0.0/16";

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
    vpcProps: {
      ipAddresses: ec2.IpAddresses.cidr(testCidrBlock),
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: testCidrBlock,
  });
});
test("Test all default values", () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.resourceCountIs("AWS::ElastiCache::CacheCluster", 1);
  template.resourceCountIs("AWS::EC2::VPC", 1);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        CACHE_ENDPOINT: {
          "Fn::Join": [
            "",
            [
              {
                "Fn::GetAtt": [
                  "testcachetestcachecluster27D08FAD",
                  "ConfigurationEndpoint.Address",
                ],
              },
              ":",
              {
                "Fn::GetAtt": [
                  "testcachetestcachecluster27D08FAD",
                  "ConfigurationEndpoint.Port",
                ],
              },
            ],
          ],
        },
      },
    },
    Handler: ".handler",
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
  });

  // All values taken from elasticache-defaults.ts
  template.hasResourceProperties("AWS::ElastiCache::CacheCluster", {
    CacheNodeType: "cache.t3.medium",
    Engine: "memcached",
    NumCacheNodes: 2,
    Port: 11222,
    AZMode: "cross-az",
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

test('Test for the proper self referencing security group', () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: ".handler",
    },
    cacheProps: {
      port: 22223
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
    IpProtocol: "TCP",
    FromPort: 22223,
    ToPort: 22223,
    GroupId: {
      "Fn::GetAtt": [
        "testcachetestcachecachesg74A03DA4",
        "GroupId"
      ]
    },
    SourceSecurityGroupId: {
      "Fn::GetAtt": [
        "testcachetestcachecachesg74A03DA4",
        "GroupId"
      ]
    },
  });
});

test("Test error from existingCache and no VPC", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingCache = defaults.CreateTestCache(stack, "test-cache", existingVpc);

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      existingCache,
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: ".handler",
      },
    });
  };

  expect(app).toThrowError(
    "If providing an existing Cache or Lambda Function, you must also supply the associated existingVpc"
  );
});

test("Test error from existing function and no VPC", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingFunction = new lambda.Function(stack, "test-function", {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: ".handler",
    vpc: existingVpc,
  });

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      existingLambdaObj: existingFunction,
    });
  };

  expect(app).toThrowError(
    "If providing an existing Cache or Lambda Function, you must also supply the associated existingVpc"
  );
});

test("Test error from existingCache and cacheProps", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingCache = defaults.CreateTestCache(stack, "test-cache", existingVpc);

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      existingCache,
      existingVpc,
      cacheProps: {
        numCacheNodes: 4,
      },
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: ".handler",
      },
    });
  };

  expect(app).toThrowError("Cannot specify existingCache and cacheProps");
});

test("Test error from trying to launch Redis", () => {
  const stack = new cdk.Stack();

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      cacheProps: {
        numCacheNodes: 4,
        engine: "redis",
      },
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: ".handler",
      },
    });
  };

  expect(app).toThrowError("This construct can only launch memcached clusters");
});

test("Test error from existingCache and no VPC", () => {
  const stack = new cdk.Stack();

  const vpc = defaults.getTestVpc(stack);

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: ".handler",
      },
      vpcProps: {},
      existingVpc: vpc
    });
  };

  expect(app).toThrowError(
    'Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n'
  );
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const testVpc = defaults.getTestVpc(stack);
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    vpc: testVpc,
  });

  const props: LambdaToElasticachememcachedProps = {
    existingVpc: testVpc,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToElasticachememcached(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
