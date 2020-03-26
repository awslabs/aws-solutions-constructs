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

// Imports
import * as lambda from '@aws-cdk/aws-lambda';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-konstruk/core';
import { overrideProps } from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the KinesisStreamsToLambda class.
 */
export interface KinesisStreamsToLambdaProps {
    /**
     * Whether to create a new Lambda function or use an existing Lambda function.
     * If set to false, you must provide an existing function for the `existingLambdaObj` property.
     *
     * @default - true
     */
    readonly deployLambda: boolean,
    /**
     * An optional, existing Lambda function.
     * This property is required if `deployLambda` is set to false.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional user-provided props to override the default props for the Lambda function.
     * This property is only required if `deployLambda` is set to true.
     *
     * @default - Default props are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps | any
    /**
     * Optional user-provided props to override the default props for the Kinesis stream.
     *
     * @default - Default props are used.
     */
    readonly kinesisStreamProps?: kinesis.StreamProps | any
    /**
     * Optional user-provided props to override the default props for the Lambda event source mapping.
     *
     * @default - Default props are used.
     */
    readonly eventSourceProps?: lambda.EventSourceMappingOptions | any
    /**
     * Optional user-provided props to override the default props for the KMS encryption key.
     *
     * @default - Default props are used.
     */
    readonly encryptionKeyProps?: kms.KeyProps | any
}

/**
 * @summary The KinesisStreamsToLambda class.
 */
export class KinesisStreamsToLambda extends Construct {
    // Private variables
    private kinesisStream: kinesis.Stream;
    private fn: lambda.Function;
    private encryptionKey: kms.Key;

    /**
     * @summary Constructs a new instance of the KinesisStreamsToLambda class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: KinesisStreamsToLambdaProps) {
        super(scope, id);

        // Setup the encryption key
        this.encryptionKey = defaults.buildEncryptionKey(scope, {
            encryptionKeyProps: props.encryptionKeyProps
        });

        // Setup the Kinesis Stream
        this.kinesisStream = defaults.buildKinesisStream(scope, {
            encryptionKey: this.encryptionKey,
            kinesisStreamProps: props.kinesisStreamProps
        });

        // Setup the Lambda function
        this.fn = defaults.buildLambdaFunction(scope, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Add the Lambda event source mapping
        const eventSourceProps = overrideProps(defaults.DefaultKinesisEventSourceProps, props.eventSourceProps);
        eventSourceProps.eventSourceArn = this.kinesisStream.streamArn;
        eventSourceProps.functionName = this.fn.functionName;
        this.fn.addEventSourceMapping('LambdaKinesisEventSourceMapping', eventSourceProps);

        // Add permissions for the Lambda function to access Kinesis
        const policy = new iam.Policy(this, 'LambdaFunctionPolicy');
        const role = this.fn.role as iam.Role;
        policy.addStatements(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ this.kinesisStream.streamArn ],
            actions: [
                'kinesis:GetRecords',
                'kinesis:GetShardIterator',
                'kinesis:DescribeStream'
            ]
        }));
        policy.addStatements(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ '*' ],
            actions: [
                'kinesis:ListStreams',
            ]
        }));
        policy.attachToRole(role);
        this.kinesisStream.grantRead(this.fn.grantPrincipal);

        // Add appropriate cfn_nag metadata
        const cfnCustomPolicy = policy.node.defaultChild as iam.CfnPolicy;
        cfnCustomPolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: "W12",
                        reason: "The kinesis:ListStreams action requires a wildcard resource."
                    }
                ]
            }
        };
    }

    /**
     * @summary Returns an instance of the kinesis.Stream created by the construct.
     * @returns {kinesis.Stream} Instance of the Stream created by the construct.
     * @since 0.8.0
     * @access public
     */
    public stream(): kinesis.Stream {
        return this.kinesisStream;
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
}