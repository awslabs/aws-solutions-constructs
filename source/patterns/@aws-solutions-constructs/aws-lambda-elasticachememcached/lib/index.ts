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
import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cache from "@aws-cdk/aws-elasticache";
import * as defaults from "../../core";
import { Construct } from "@aws-cdk/core";
import { obtainMemcachedCluster, GetCachePort } from "../../core";

const defaultEnvironmentVariableName = "CACHE_ENDPOINT";

/**
 * @summary The properties for the LambdaToElasticachememcached class.
 */
export interface LambdaToElasticachememcachedProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Optional Name for the Elasticache Endpoint environment variable
   *
   * @default - None
   */
  readonly cacheEndpointEnvironmentVariableName?: string;

  readonly cacheProps?: cache.CfnCacheClusterProps | any;

  readonly existingCache?: cache.CfnCacheCluster;
}

/**
 * @summary The LambdaToElasticachememcached class.
 */
export class LambdaToElasticachememcached extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc: ec2.IVpc;
  public readonly cache: cache.CfnCacheCluster;

  /**
   * @summary Constructs a new instance of the LambdaToSns class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToElasticachememcachedProps} props - user provided props for the construct.
   * @access public
   */
  constructor(
    scope: Construct,
    id: string,
    props: LambdaToElasticachememcachedProps
  ) {
    super(scope, id);
    defaults.CheckProps(props);

    if ((props.existingCache || props.existingLambdaObj) && (!props.existingVpc)) {
      throw Error('If providing an existing Cache or Lambda Function, you must also supply the associated existingVpc');
    }

    if (
      props.cacheProps &&
      props.cacheProps.engine &&
      props.cacheProps.engine !== "memcached"
    ) {
      throw Error("This construct can only launch memcached clusters");
    }
    if (props.cacheProps && props.existingCache) {
      throw Error("Cannot specify existingCache and cacheProps");
    }

    const cachePort = GetCachePort(props.cacheProps, props.existingCache);

    this.vpc = defaults.buildVpc(scope, {
      defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
      existingVpc: props.existingVpc,
      userVpcProps: props.vpcProps,
    });

    const lambdaToCacheSecurityGroup = CreateSelfReferencingSecurityGroup(this, id, this.vpc, cachePort);

    this.cache = obtainMemcachedCluster(this, id, {
      cacheSecurityGroupId : lambdaToCacheSecurityGroup.securityGroupId,
      cacheProps: props.cacheProps,
      existingCache: props.existingCache,
      vpc: this.vpc,
      cachePort,
    });

    const lambdaFunctionProps: lambda.FunctionProps = defaults.consolidateProps(
      {},
      props.lambdaFunctionProps,
      { securityGroups: [lambdaToCacheSecurityGroup] },
      true
    );

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps,
      vpc: this.vpc,
    });

    AddLambdaEnvironmentVariable(
      this.lambdaFunction,
      `${this.cache.attrConfigurationEndpointAddress}:${this.cache.attrConfigurationEndpointPort}`,
      defaultEnvironmentVariableName,
      props.cacheEndpointEnvironmentVariableName
    );
  }
}

function AddLambdaEnvironmentVariable(targetFunction: lambda.Function, value: string, defaultName: string, clientName?: string) {
  const variableName = clientName || defaultName;
  targetFunction.addEnvironment(variableName, value);
}

function CreateSelfReferencingSecurityGroup(scope: Construct, id: string, vpc: ec2.IVpc, cachePort: any) {
  const newCacheSG = new ec2.SecurityGroup(scope, `${id}-cachesg`, {
    vpc,
    allowAllOutbound: true,
  });
  const selfReferenceRule = new ec2.CfnSecurityGroupIngress(
    scope,
    `${id}-ingress`,
    {
      groupId: newCacheSG.securityGroupId,
      sourceSecurityGroupId: newCacheSG.securityGroupId,
      ipProtocol: "TCP",
      fromPort: cachePort,
      toPort: cachePort,
    }
  );
  selfReferenceRule.node.addDependency(newCacheSG);

  defaults.addCfnSuppressRules(newCacheSG, [
    {
      id: "W5",
      reason: "Egress of 0.0.0.0/0 is default and generally considered OK",
    },
    {
      id: "W40",
      reason:
        "Egress IPProtocol of -1 is default and generally considered OK",
    },
  ]);
  return newCacheSG;
}