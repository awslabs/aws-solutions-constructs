/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { CfnJob, CfnJobProps } from '@aws-cdk/aws-glue';
import { Stream, StreamProps } from '@aws-cdk/aws-kinesis';
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';

export interface KinesisStreamGlueJobProps {
    /**
     * Existing instance of Kineses Data Stream. If not set, it will create an instance
     */
    readonly existingStreamObj?: Stream;
    /**
     * User provided props to override the default props for the Kinesis Stream.
     *
     * @default - Default props are used
     */
    readonly kinesisStreamProps?: StreamProps | any;
    /**
     * User provides props to override the default props for Glue ETL Jobs. This parameter will be ignored if the
     * existingGlueJob parameter is set
     *
     * @default - Default props are used
     */
    readonly glueJobProps?: CfnJobProps;
    /**
     * Existing GlueJob configuration. If not set, it will create the a CfnJob instance using the glueJobProps
     */
    readonly existingGlueJob?: CfnJob;
}

export class KinesisStreamGlueJob extends Construct {
    public readonly kinesisStream: Stream;
    // public readonly glueJob: CfnJob;

    constructor(scope: Construct, id: string, props: KinesisStreamGlueJobProps) {
        super(scope, id);

        this.kinesisStream = defaults.buildKinesisStream(this, {
            existingStreamObj: props.existingStreamObj,
            kinesisStreamProps: props.kinesisStreamProps,
        });
    }
}