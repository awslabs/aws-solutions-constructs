/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as kms from '@aws-cdk/aws-kms';
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';
import { SnsEventSource } from '@aws-cdk/aws-lambda-event-sources';

/**
 * @summary The properties for the SnsToLambda class.
 */
export interface SnsToLambdaProps {
  /**
   * Whether to create a new Lambda function or use an existing Lambda function.
   * If set to false, you must provide an existing function for the `existingLambdaObj` property.
   *
   * @default - true
   */
  readonly deployLambda: boolean,
  /**
   * Existing instance of Lambda Function object.
   * If `deploy` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional user provided properties to override the default properties for the Lambda function.
   * If `deploy` is set to true only then this property is required.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps | any
  /**
   * Optional user provided properties to override the default properties for the SNS topic.
   *
   * @default - Default properties are used.
   */
  readonly topicProps?: sns.TopicProps | any
  /**
   * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
   * the encryptionKey property for this construct.
   *
   * @default - true (encryption enabled, managed by this CDK app).
   */
  readonly enableEncryption?: boolean
  /**
   * An optional, imported encryption key to encrypt the SNS topic with.
   *
   * @default - not specified.
   */
  readonly encryptionKey?: kms.Key
}

/**
 * @summary The SnsToLambda class.
 */
export class SnsToLambda extends Construct {
  // Private variables
  private fn: lambda.Function;
  private topic: sns.Topic;

  /**
   * @summary Constructs a new instance of the LambdaToSns class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSnsProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: SnsToLambdaProps) {
    super(scope, id);

    // Setup the Lambda function
    this.fn = defaults.buildLambdaFunction(scope, {
        deployLambda: props.deployLambda,
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps
    });

    // Setup the SNS topic
    this.topic = defaults.buildTopic(this, {
        enableEncryption: props.enableEncryption,
        encryptionKey: props.encryptionKey
    });

    this.fn.addEventSource(new SnsEventSource(this.topic));

  }

  /**
   * @summary Returns an instance of the lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of the Function created by the construct.
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
      return this.fn;
  }

  /**
   * @summary Returns an instance of the sns.Topic created by the construct.
   * @returns {sns.Topic} Instance of the Topic created by the construct.
   * @since 0.8.0
   * @access public
   */
  public snsTopic(): sns.Topic {
      return this.topic;
  }
}