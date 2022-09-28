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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DynamoEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';
import { DynamoDBStreamsToLambdaProps, DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';
import { LambdaToElasticSearchAndKibanaProps, LambdaToElasticSearchAndKibana } from '@aws-solutions-constructs/aws-lambda-elasticsearch-kibana';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the DynamoDBStreamsToLambdaToElastciSearchAndKibana Construct
 */
export interface DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableInterface?: dynamodb.ITable,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoEventSourceProps?: DynamoEventSourceProps,
  /**
   * Optional user provided props to override the default props for the API Gateway.
   *
   * @default - Default props are used
   */
  readonly esDomainProps?: elasticsearch.CfnDomainProps,
  /**
   * Cognito & ES Domain Name
   *
   * @default - None
   */
  readonly domainName: string,
  /**
   * Optional Cognito Domain Name, if provided it will be used for Cognito Domain, and domainName will be used for the Elasticsearch Domain
   *
   * @default - None
   */
  readonly cognitoDomainName?: string,
  /**
   * Whether to deploy a SQS dead letter queue when a data record reaches the Maximum Retry Attempts or Maximum Record Age,
   * its metadata like shard ID and stream ARN will be sent to an SQS queue.
   *
   * @default - true.
   */
  readonly deploySqsDlqQueue?: boolean,
  /**
   * Optional user provided properties for the SQS dead letter queue
   *
   * @default - Default props are used
   */
  readonly sqsDlqQueueProps?: sqs.QueueProps,
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   *
   * @default - DefaultIsolatedVpcProps() in vpc-defaults.ts
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

export class DynamoDBStreamsToLambdaToElasticSearchAndKibana extends Construct {
  private dynamoDBStreamsToLambda: DynamoDBStreamsToLambda;
  private lambdaToElasticSearchAndKibana: LambdaToElasticSearchAndKibana;
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTableInterface: dynamodb.ITable;
  public readonly dynamoTable?: dynamodb.Table;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly elasticsearchDomain: elasticsearch.CfnDomain;
  public readonly elasticsearchRole: iam.Role;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: DynamoDBStreamsToLambdaToElasticSearchAndKibanaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    const lambdaToElasticSearchProps: LambdaToElasticSearchAndKibanaProps = {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      domainName: props.domainName,
      esDomainProps: props.esDomainProps,
      cognitoDomainName: props.cognitoDomainName,
      createCloudWatchAlarms: props.createCloudWatchAlarms,
      existingVpc: props.existingVpc,
      vpcProps: props.vpcProps,
      deployVpc: props.deployVpc
    };

    this.lambdaToElasticSearchAndKibana = new LambdaToElasticSearchAndKibana(this, 'LambdaToElasticSearch', lambdaToElasticSearchProps);

    this.lambdaFunction = this.lambdaToElasticSearchAndKibana.lambdaFunction;

    const dbstreamsToLambdaProps: DynamoDBStreamsToLambdaProps = {
      existingLambdaObj: this.lambdaFunction,
      dynamoEventSourceProps: props.dynamoEventSourceProps,
      dynamoTableProps: props.dynamoTableProps,
      existingTableInterface: props.existingTableInterface,
      deploySqsDlqQueue: props.deploySqsDlqQueue,
      sqsDlqQueueProps: props.sqsDlqQueueProps,
    };

    this.dynamoDBStreamsToLambda = new DynamoDBStreamsToLambda(this, 'DynamoDBStreamsToLambda', dbstreamsToLambdaProps);

    this.dynamoTable = this.dynamoDBStreamsToLambda.dynamoTable;
    this.dynamoTableInterface = this.dynamoDBStreamsToLambda.dynamoTableInterface;
    this.userPool = this.lambdaToElasticSearchAndKibana.userPool;
    this.userPoolClient = this.lambdaToElasticSearchAndKibana.userPoolClient;
    this.identityPool = this.lambdaToElasticSearchAndKibana.identityPool;
    this.elasticsearchDomain = this.lambdaToElasticSearchAndKibana.elasticsearchDomain;
    this.elasticsearchRole = this.lambdaToElasticSearchAndKibana.elasticsearchRole;
    this.cloudwatchAlarms = this.lambdaToElasticSearchAndKibana.cloudwatchAlarms;
    this.vpc = this.lambdaToElasticSearchAndKibana.vpc;
  }
}
