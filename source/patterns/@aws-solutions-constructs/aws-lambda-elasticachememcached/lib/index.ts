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
import { obtainMemcachedCluster, getCachePort, CreateSelfReferencingSecurityGroup } from "../../core";

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
   * Optional user provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   *
   * @default - DefaultIsolatedVpcProps() in vpc-defaults.ts
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Optional Name for the Lambda function environment variable set to the cache endpoint.
   *
   * @default - CACHE_ENDPOINT
   */
  readonly cacheEndpointEnvironmentVariableName?: string;
  /**
   * Optional user provided props to override the default props for the Elasticache cache.
   * Providing both this and `existingCache` will cause an error.  If you provide this,
   * you must provide the associated VPC in existingVpc.
   *
   * @default - Default properties are used (core/lib/elasticacahe-defaults.ts)
   */
  readonly cacheProps?: cache.CfnCacheClusterProps | any;
  /**
   * Existing instance of Elasticache Cluster object, providing both this and `cacheProps` will cause an error.
   *
   * @default - none
   */
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
   * @summary Constructs a new instance of the LambdaToElasticachememcached class.
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

    const cachePort = getCachePort(props.cacheProps, props.existingCache);

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

    // Add the self-referencing security group to the Lambda function props
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
