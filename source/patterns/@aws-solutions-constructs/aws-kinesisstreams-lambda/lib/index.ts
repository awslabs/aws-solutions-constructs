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
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the KinesisStreamsToLambda class.
 */
export interface KinesisStreamsToLambdaProps {
    /**
     * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * User provided props to override the default props for the Lambda function.
     *
     * @default - Default props are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps,
    /**
     * Optional user-provided props to override the default props for the Kinesis stream.
     *
     * @default - Default props are used.
     */
    readonly kinesisStreamProps?: kinesis.StreamProps,
    /**
     * Optional user-provided props to override the default props for the Lambda event source mapping.
     *
     * @default - Default props are used.
     */
    readonly eventSourceProps?: lambda.EventSourceMappingOptions | any
}

/**
 * @summary The KinesisStreamsToLambda class.
 */
export class KinesisStreamsToLambda extends Construct {
    public readonly kinesisStream: kinesis.Stream;
    public readonly lambdaFunction: lambda.Function;
    public readonly kinesisStreamRole: iam.Role;

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

        // Setup the Kinesis Stream
        this.kinesisStream = defaults.buildKinesisStream(this, {
            kinesisStreamProps: props.kinesisStreamProps
        });

        // Setup the Lambda function
        this.lambdaFunction = defaults.buildLambdaFunction(this, {
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Add the Lambda event source mapping
        const eventSourceProps = (props.eventSourceProps) ?
            overrideProps(defaults.DefaultKinesisEventSourceProps(this.kinesisStream.streamArn), props.eventSourceProps) :
            defaults.DefaultKinesisEventSourceProps(this.kinesisStream.streamArn);
        this.lambdaFunction.addEventSourceMapping('LambdaKinesisEventSourceMapping', eventSourceProps);

        // Add permissions for the Lambda function to access Kinesis
        const policy = new iam.Policy(this, 'LambdaFunctionPolicy');
        this.kinesisStreamRole = this.lambdaFunction.role as iam.Role;
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
        policy.attachToRole(this.kinesisStreamRole);
        this.kinesisStream.grantRead(this.lambdaFunction.grantPrincipal);

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
}