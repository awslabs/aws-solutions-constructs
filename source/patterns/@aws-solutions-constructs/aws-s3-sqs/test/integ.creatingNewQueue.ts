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

// Imports
import { App, Stack } from "@aws-cdk/core";
import { S3ToSqs, S3ToSqsProps } from "../lib";
import * as kms from '@aws-cdk/aws-kms';
import * as s3 from '@aws-cdk/aws-s3';

// Setup
const app = new App();
const stack = new Stack(app, 'test-s3-sqs-deploy-queue');
stack.templateOptions.description = 'Integration Test for aws-s3-sqs with standard Queue';

// For S3 to SQS bucket notification a customer managed CMK must be used:
const encryptionKeyProps: kms.KeyProps = {
    enableKeyRotation: true
};
const kmsKey = new kms.Key(stack, 'ImportedEncryptionKey', encryptionKeyProps);

// Configure notification filter
const filter: s3.NotificationKeyFilter = {
    prefix: 'the/place',
    suffix: '*.mp3'
};

// Define construct properties so that a new queue myQueue is created
const props: S3ToSqsProps = {
    queueProps: {
        queueName: `myQueue`,
        encryptionMasterKey: kmsKey
    },
    deadLetterQueueProps: {
        queueName: `myDLQueue`
    },
    s3EventTypes: [s3.EventType.OBJECT_REMOVED],
    s3EventFilters: [filter]
};

new S3ToSqs(stack, 'test-s3-sqs', props);

// Synth
app.synth();
