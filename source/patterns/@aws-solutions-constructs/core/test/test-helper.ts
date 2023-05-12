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
import { CfnResource, RemovalPolicy, Stack, Aspects, IAspect } from "aws-cdk-lib";
import { buildVpc } from '../lib/vpc-helper';
import { DefaultPublicPrivateVpcProps, DefaultIsolatedVpcProps } from '../lib/vpc-defaults';
import { overrideProps, addCfnSuppressRules } from "../lib/utils";
import { createCacheSubnetGroup  } from "../lib/elasticache-helper";
import * as path from 'path';
import * as cache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { GetDefaultCachePort } from "../lib/elasticache-defaults";
import { Match, Template } from 'aws-cdk-lib/assertions';

export const fakeEcrRepoArn = 'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo';

// Creates a bucket used for testing - minimal properties, destroyed after test
export function CreateScrapBucket(scope: Construct, props?: BucketProps | any) {
  const defaultProps = {
    versioned: true,
    removalPolicy: RemovalPolicy.DESTROY,
    encryption: BucketEncryption.S3_MANAGED,
  };

  let synthesizedProps: BucketProps;
  if (props) {
    synthesizedProps = overrideProps(defaultProps, props);
  } else {
    synthesizedProps = defaultProps;
  }

  const scriptBucket = new Bucket(
    scope,
    "existingScriptLocation",
    synthesizedProps
  );

  addCfnSuppressRules(scriptBucket, [
    {
      id: "W51",
      reason: "This S3 bucket is created for unit/ integration testing purposes only and not part of       the actual construct implementation",
    },
    {
      id: "W35",
      reason: "This S3 bucket is created for unit/ integration testing purposes only and not part of       the actual construct implementation",
    },
    {
      id: "W41",
      reason: "This S3 bucket is created for unit/ integration testing purposes only and not part of       the actual construct",
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

export function suppressAutoDeleteHandlerWarnings(stack: Stack) {
  stack.node.children.forEach(child => {
    if (child.node.id === 'Custom::S3AutoDeleteObjectsCustomResourceProvider') {
      const handlerFunction = child.node.findChild('Handler') as CfnFunction;
      addCfnSuppressRules(handlerFunction, [{ id: "W58", reason: "CDK generated custom resource"}]);
      addCfnSuppressRules(handlerFunction, [{ id: "W89", reason: "CDK generated custom resource"}]);
      addCfnSuppressRules(handlerFunction, [{ id: "W92", reason: "CDK generated custom resource"}]);
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

  const [ logicalId ] = Object.keys(resource);
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
        { id: 'W58', reason: 'CDK generated custom resource' },
        { id: 'W89', reason: 'CDK generated custom resource' },
        { id: 'W92', reason: 'CDK generated custom resource' }
      ]);
    }
  }
}

/**
 * Used to suppress cfn nag W58, W89, and W92 rules on lambda integration test resources.
 *
 * @param stack - The stack to suppress cfn nag lambda rules on
 */
export function SuppressCfnNagLambdaWarnings(stack: Stack) {
  Aspects.of(stack).add(new CfnNagLambdaAspect());
}
