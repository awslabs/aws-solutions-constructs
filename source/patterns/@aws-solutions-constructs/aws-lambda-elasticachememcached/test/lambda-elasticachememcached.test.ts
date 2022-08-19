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

// Imports
// import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
// import { LambdaToElasticachememcached, LambdaToElasticachememcachedProps } from "../lib";
// import * as lambda from '@aws-cdk/aws-lambda';
// import * as cdk from "@aws-cdk/core";
import "@aws-cdk/assert/jest";
import * as defaults from "@aws-solutions-constructs/core";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaToElasticachememcached } from "../lib";

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
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
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
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
  });

  expect(stack).toCountResources("AWS::ElastiCache::CacheCluster", 1);
  expect(stack).toHaveResourceLike("AWS::ElastiCache::CacheCluster", {
    Port: testPort,
  });
});

test("When provided an existingFunction, does not create a second function", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingFunction = new lambda.Function(stack, "test-function", {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: ".handler",
    vpc: existingVpc,
    functionName: testFunctionName,
  });

  new LambdaToElasticachememcached(stack, "testStack", {
    existingVpc,
    existingLambdaObj: existingFunction,
  });

  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
  });
});

test("Test custom environment variable name", () => {
  const stack = new cdk.Stack();

  const testEnvironmentVariableName = "CUSTOM_CLUSTER_NAME";

  new LambdaToElasticachememcached(stack, "test-construct", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
    cacheEndpointEnvironmentVariableName: testEnvironmentVariableName,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
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
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
      functionName: testFunctionName,
    },
  });

  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
  });
});

test("Test setting custom cache properties", () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
    cacheProps: {
      clusterName: testClusterName,
    },
  });

  expect(stack).toHaveResourceLike("AWS::ElastiCache::CacheCluster", {
    ClusterName: testClusterName,
  });
});
test("Test setting custom VPC properties", () => {
  const stack = new cdk.Stack();
  const testCidrBlock = "192.168.0.0/16";

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
    vpcProps: {
      cidr: testCidrBlock,
    },
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: testCidrBlock,
  });
});
test("Test all default values", () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
  });

  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::ElastiCache::CacheCluster", 1);
  expect(stack).toCountResources("AWS::EC2::VPC", 1);

  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
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
    Runtime: "nodejs14.x",
  });

  // All values taken from elasticache-defaults.ts
  expect(stack).toHaveResourceLike("AWS::ElastiCache::CacheCluster", {
    CacheNodeType: "cache.t3.medium",
    Engine: "memcached",
    NumCacheNodes: 2,
    Port: 11222,
    AZMode: "cross-az",
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

test('Test for the proper self referencing security group', () => {
  const stack = new cdk.Stack();

  new LambdaToElasticachememcached(stack, "test-cache", {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: ".handler",
    },
    cacheProps: {
      port: 22223
    }
  });

  expect(stack).toHaveResourceLike("AWS::EC2::SecurityGroupIngress", {
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
// test('', () => {});
test("Test error from existingCache and no VPC", () => {
  const stack = new cdk.Stack();

  const existingVpc = defaults.getTestVpc(stack);
  const existingCache = defaults.CreateTestCache(stack, "test-cache", existingVpc);

  const app = () => {
    new LambdaToElasticachememcached(stack, "testStack", {
      existingCache,
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_14_X,
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
    runtime: lambda.Runtime.NODEJS_14_X,
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
        runtime: lambda.Runtime.NODEJS_14_X,
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
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: ".handler",
      },
    });
  };

  expect(app).toThrowError("This construct can only launch memcached clusters");
});
