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
import { Construct, IConstruct } from 'constructs';
import { Bucket, BucketProps, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { CfnResource, RemovalPolicy, Stack, Aspects, IAspect, Aws, Fn } from "aws-cdk-lib";
import { buildVpc } from '../lib/vpc-helper';
import { DefaultPublicPrivateVpcProps, DefaultIsolatedVpcProps } from '../lib/vpc-defaults';
import { overrideProps, addCfnSuppressRules } from "../lib/utils";
import * as defaults from '../index';
import { createCacheSubnetGroup } from "../lib/elasticache-helper";
import * as path from 'path';
import * as cache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { GetDefaultCachePort } from "../lib/elasticache-defaults";
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sftasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as api from "aws-cdk-lib/aws-apigateway";

export const fakeEcrRepoArn = 'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo';

// Creates a bucket used for testing - minimal properties, destroyed after test
export function CreateScrapBucket(scope: Construct, id: string, props?: BucketProps | any) {

  if (props?.serverAccessLogsBucket) {
    throw new Error("Don't try to send a log bucket to CreateScrapBucket");
  }

  // Basic props for scrap and log buckets
  const defaultProps: BucketProps = {
    versioned: true,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    encryption: BucketEncryption.S3_MANAGED,
    enforceSSL: true
  };

  // Create basic log bucket
  const logBucket = new Bucket(scope, `${id}Log`, defaultProps);

  // Combine basic props with special props from test client
  let synthesizedProps: BucketProps;
  if (props) {
    synthesizedProps = overrideProps(defaultProps, props);
  } else {
    synthesizedProps = defaultProps;
  }

  // Finally - set up logging for the scrap bucket
  const finalProps = overrideProps(synthesizedProps, { serverAccessLogsBucket: logBucket });

  const scriptBucket = new Bucket(
    scope,
    id,
    finalProps
  );

  addCfnSuppressRules(logBucket, [
    {
      id: "W35",
      reason: "This is a log bucket",
    }
  ]);

  return scriptBucket;
}

/**
 * @summary Creates a stack name for Integration tests
 * @param {string} filename - the filename of the integ test
 * @returns {string} - a string with current filename after removing anything before the prefix '.' and suffix '.js'
 * e.g. 'integ.apigateway-dynamodb-CRUD.js' will return 'apigateway-dynamodb-CRUD'
 */
export function generateIntegStackName(filename: string): string {
  const file = path.basename(filename, path.extname(filename));
  const stackname = file.slice(file.lastIndexOf('.') + 1).replace(/_/g, '-');
  return stackname;
}

// Helper Functions
export function getTestVpc(stack: Stack, publicFacing: boolean = true, userVpcProps?: ec2.VpcProps) {
  return buildVpc(stack, {
    defaultVpcProps: publicFacing ?
      DefaultPublicPrivateVpcProps() :
      DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/16'),
    },
    userVpcProps
  });
}

export function getFakeCertificate(scope: Construct, id: string): acm.ICertificate {
  return acm.Certificate.fromCertificateArn(
    scope,
    id,
    "arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012"
  );
}

// Creates a bucket used for testing - minimal properties, destroyed after test
export function CreateTestStateMachineDefinitionBody(scope: Construct, id: string): sfn.DefinitionBody {

  const smStep = new lambda.Function(scope, `lambda${id}`, {
    code: new lambda.InlineCode(
      "exports.handler = async (event) => console.log(event)"
    ),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
  });

  const task = new sftasks.LambdaInvoke(scope, `task${id}`, {
    lambdaFunction: smStep,
  });

  SuppressCfnNagLambdaWarnings(Stack.of(scope));

  return sfn.DefinitionBody.fromChainable(task);
}

export function suppressCustomHandlerCfnNagWarnings(stack: Stack, handlerId: string) {
  stack.node.children.forEach(child => {
    if (child.node.id === handlerId) {
      const handlerFunction = child.node.findChild('Handler') as CfnFunction;
      addCfnSuppressRules(handlerFunction, [{ id: "W58", reason: "CDK generated custom resource" }]);
      addCfnSuppressRules(handlerFunction, [{ id: "W89", reason: "CDK generated custom resource" }]);
      addCfnSuppressRules(handlerFunction, [{ id: "W92", reason: "CDK generated custom resource" }]);
    }
  });
}

export function CreateTestCache(scope: Construct, id: string, vpc: ec2.IVpc, port?: number) {
  const cachePort = port ?? GetDefaultCachePort();

  // Create the subnet group from all the isolated subnets in the VPC
  const subnetGroup = createCacheSubnetGroup(scope, vpc, id);
  const emptySG = new ec2.SecurityGroup(scope, `${id}-cachesg`, {
    vpc,
    allowAllOutbound: true,
  });
  addCfnSuppressRules(emptySG, [{ id: "W40", reason: "Test Resource" }]);
  addCfnSuppressRules(emptySG, [{ id: "W5", reason: "Test Resource" }]);
  addCfnSuppressRules(emptySG, [{ id: "W36", reason: "Test Resource" }]);

  const cacheProps = {
    clusterName: `${id}-cdk-cluster`,
    cacheNodeType: "cache.t3.medium",
    engine: "memcached",
    numCacheNodes: 2,
    port: cachePort,
    azMode: "cross-az",
    vpcSecurityGroupIds: [emptySG.securityGroupId],
    cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
  };

  const newCache = new cache.CfnCacheCluster(
    scope,
    `${id}-cluster`,
    cacheProps
  );
  newCache.addDependency(subnetGroup);
  return newCache;
}

/**
 * Asserts that a KMS key with a specific description exists on a resource
 *
 * @param stack The CloudFormation Stack that contains the to validate.
 * @param parentResourceType The type of CloudFormation Resource that should have the key set on it, e.g., `AWS::SNS::Topic`, etc...
 * @param description The value of the Description property on the KMS Key
 */
export function expectKmsKeyAttachedToCorrectResource(stack: Stack, parentResourceType: string, keyDescription: string) {
  const template = Template.fromStack(stack);
  const resource = template.findResources('AWS::KMS::Key', {
    Properties: {
      Description: Match.exact(keyDescription)
    }
  });

  const [logicalId] = Object.keys(resource);
  Template.fromStack(stack).hasResourceProperties(parentResourceType, {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        logicalId,
        "Arn"
      ]
    }
  });
}

export function expectNonexistence(stack: Stack, type: string, props: object) {
  const shouldFindNothing = Template.fromStack(stack).findResources(type, props);
  expect(Object.keys(shouldFindNothing).length).toEqual(0);
}

// private helper class to suppress the standard cfn nag warnings for lambda functions used in integ tests
class CfnNagLambdaAspect implements IAspect {
  public visit(node: IConstruct): void {
    const resource = node as CfnResource;
    if (resource.cfnResourceType === 'AWS::Lambda::Function') {
      addCfnSuppressRules(resource, [
        { id: 'W58', reason: 'This Lambda Function is created for integration testing purposes only and is not part of an actual construct' },
        { id: 'W89', reason: 'This Lambda Function is created for integration testing purposes only and is not part of an actual construct' },
        { id: 'W92', reason: 'This Lambda Function is created for integration testing purposes only and is not part of an actual construct' }
      ]);
    }
  }
}

export function CreateTestApi(stack: Stack, id: string): api.LambdaRestApi {
  const lambdaFunction = new lambda.Function(stack, `${id}Function`, {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: ".handler",
  });
  addCfnSuppressRules(lambdaFunction, [{ id: "W58", reason: "Test Resource" }]);
  addCfnSuppressRules(lambdaFunction, [{ id: "W89", reason: "Test Resource" }]);
  addCfnSuppressRules(lambdaFunction, [{ id: "W92", reason: "Test Resource" }]);

  const restApi = new api.LambdaRestApi(stack, `${id}Api`, {
    handler: lambdaFunction,
    defaultMethodOptions: {
      authorizationType: api.AuthorizationType.CUSTOM,
      authorizer: CreateApiAuthorizer(stack, `${id}-authorizer`)
    }
  });

  const newDeployment = restApi.latestDeployment;
  if (newDeployment) {
    addCfnSuppressRules(newDeployment, [
      { id: "W68", reason: "Test Resource" },
    ]);
  }

  const newMethod = restApi.methods[0];
  addCfnSuppressRules(newMethod, [{ id: "W59", reason: "Test Resource" }]);
  const newMethodTwo = restApi.methods[1];
  addCfnSuppressRules(newMethodTwo, [{ id: "W59", reason: "Test Resource" }]);

  const newStage = restApi.deploymentStage;
  addCfnSuppressRules(newStage, [{ id: "W64", reason: "Test Resource" }]);
  addCfnSuppressRules(newStage, [{ id: "W69", reason: "Test Resource" }]);

  return restApi;
}

export function CreateApiAuthorizer(stack: Stack, id: string): api.IAuthorizer {
  const authFn = new lambda.Function(stack, `${id}AuthFunction`, {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: ".handler",
  });
  addCfnSuppressRules(authFn, [{ id: "W58", reason: "Test Resource" }]);
  addCfnSuppressRules(authFn, [{ id: "W89", reason: "Test Resource" }]);
  addCfnSuppressRules(authFn, [{ id: "W92", reason: "Test Resource" }]);

  const authorizer = new api.RequestAuthorizer(stack, id, {
    handler: authFn,
    identitySources: [api.IdentitySource.header('Authorization')]
  });

  return authorizer;
}

// Create a short, unique to this stack name
// technically this is not 100% OK, as it only uses a portion of the
// stack guid - but it's for tests only so if the last segment of 2 stack guids collide someday
// (VERY unlikely), just running again should take care of it.
export function CreateShortUniqueTestName(stub: string) {
  const stackGuid = Fn.select(2, Fn.split('/', `${Aws.STACK_ID}`));
  const guidPortion = Fn.select(4, Fn.split('-', stackGuid));
  return Fn.join("-", [stub, guidPortion]);
}

/**
 * Used to suppress cfn nag W58, W89, and W92 rules on lambda integration test resources.
 *
 * @param stack - The stack to suppress cfn nag lambda rules on
 */
export function SuppressCfnNagLambdaWarnings(stack: Stack) {
  Aspects.of(stack).add(new CfnNagLambdaAspect());
}
