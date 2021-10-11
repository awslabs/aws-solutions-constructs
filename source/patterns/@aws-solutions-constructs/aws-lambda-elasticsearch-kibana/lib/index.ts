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

import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import {Construct} from '@aws-cdk/core';
import {Role} from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as ec2 from "@aws-cdk/aws-ec2";
import {overrideProps} from "@aws-solutions-constructs/core";

/**
 * @summary The properties for the CognitoToApiGatewayToLambda Construct
 */
export interface LambdaToElasticSearchAndKibanaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Optional user provided props to override the default props for the Elasticsearch Service.
   *
   * @default - Default props are used
   */
  readonly esDomainProps?: elasticsearch.CfnDomainProps;
  /**
   * Cognito & ES Domain Name
   *
   * @default - None
   */
  readonly domainName: string;
  /**
   * Optional Cognito Domain Name, if provided it will be used for Cognito Domain, and domainName will be used for the Elasticsearch Domain
   *
   * @default - None
   */
  readonly cognitoDomainName?: string;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * Optional Name for the ElasticSearch domain endpoint environment variable set for the Lambda function.
   *
   * @default - None
   */
  readonly domainEndpointEnvironmentVariableName?: string;
  /**
   * An existing VPC for the lambda to connect (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

export class LambdaToElasticSearchAndKibana extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly elasticsearchDomain: elasticsearch.CfnDomain;
  public readonly elasticsearchRole: iam.Role;
  public readonly lambdaFunction: lambda.Function;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the CognitoToApiGatewayToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CognitoToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToElasticSearchAndKibanaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.lambdaFunctionProps?.vpc || props.lambdaFunctionProps?.vpcSubnets) {
      throw new Error("Error - Define VPC using construct parameters not Lambda function props");
    }

    if (props.esDomainProps?.vpcOptions) {
      throw new Error("Error - Define VPC using construct parameters not Elasticsearch props");
    }

    if (props.deployVpc || props.existingVpc) {
      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      });
    }

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc
    });

    // Find the lambda service Role ARN
    const lambdaFunctionRoleARN = this.lambdaFunction.role?.roleArn;

    // let _esDomainProps = { ...props.esDomainProps };
    let _esDomainProps: elasticsearch.CfnDomainProps = {};

    if (this.vpc) {

      // A ES cluster deploys in 3 AZs with 3 subnets maximum(each subnet in a different AZ).
      // To successfully deploy a ES cluster, construct will need to specify exactly same subnets number as cluster AZs number
      // In a word, 1. Subnets number must equals to AZs number.   2. Each subnet belongs to different AZ.
      let subnets: string[] = this.vpc.selectSubnets({onePerAz: true}).subnetIds;

      if (props.esDomainProps?.elasticsearchClusterConfig) {
        // If zoneAwarenessEnabled set to false, ES cluster deploy in 1 AZ with 1 subnet
        // If zoneAwarenessConfig.availabilityZoneCount set to 2, ES cluster deploy in 2 AZ with 2 subnets.
        if ('zoneAwarenessEnabled' in props.esDomainProps.elasticsearchClusterConfig &&
          !props.esDomainProps.elasticsearchClusterConfig.zoneAwarenessEnabled) {
          subnets = subnets.slice(0, 1);
        } else if ('zoneAwarenessConfig' in props.esDomainProps.elasticsearchClusterConfig &&
          props.esDomainProps.elasticsearchClusterConfig.zoneAwarenessConfig &&
          'availabilityZoneCount' in props.esDomainProps.elasticsearchClusterConfig.zoneAwarenessConfig &&
          props.esDomainProps.elasticsearchClusterConfig.zoneAwarenessConfig.availabilityZoneCount === 2) {
          subnets = subnets.slice(0, 2);
        } else {
          subnets = subnets.slice(0, 3);
        }
      } else {
        subnets = subnets.slice(0, 3);
      }

      const securityGroupIds: string[] = [];
      this.lambdaFunction.connections.securityGroups.forEach(element => securityGroupIds.push(element.securityGroupId));

      _esDomainProps = {
        vpcOptions: {
          subnetIds: subnets,
          securityGroupIds,
        },
      };

      if (props.esDomainProps) {
        _esDomainProps = overrideProps(_esDomainProps, props.esDomainProps);
      }

      // Add Inbound rule to allow tcp call internally
      this.lambdaFunction.connections.allowInternally(ec2.Port.allTcp());
    }

    this.userPool = defaults.buildUserPool(this);
    this.userPoolClient = defaults.buildUserPoolClient(this, this.userPool);
    this.identityPool = defaults.buildIdentityPool(this, this.userPool, this.userPoolClient);

    let cognitoDomainName = props.domainName;

    if (props.cognitoDomainName) {
      cognitoDomainName = props.cognitoDomainName;
    }

    const cognitoAuthorizedRole: Role = defaults.setupCognitoForElasticSearch(this, cognitoDomainName, {
      userpool: this.userPool,
      identitypool: this.identityPool,
      userpoolclient: this.userPoolClient
    });

    [this.elasticsearchDomain, this.elasticsearchRole] = defaults.buildElasticSearch(this, props.domainName, {
      userpool: this.userPool,
      identitypool: this.identityPool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      serviceRoleARN: lambdaFunctionRoleARN
    }, _esDomainProps);

    // Add ES Domain to lambda environment variable
    const domainEndpointEnvironmentVariableName = props.domainEndpointEnvironmentVariableName || 'DOMAIN_ENDPOINT';
    this.lambdaFunction.addEnvironment(domainEndpointEnvironmentVariableName, this.elasticsearchDomain.attrDomainEndpoint);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for ES
      this.cloudwatchAlarms = defaults.buildElasticSearchCWAlarms(this);
    }
  }
}
