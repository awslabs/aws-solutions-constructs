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

import { Stack, RemovalPolicy } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as kinesisanalytics from "aws-cdk-lib/aws-kinesisanalytics";
import * as kinesisFirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as defaults from "../index";
import { overrideProps } from "../lib/utils";
import { Template } from 'aws-cdk-lib/assertions';

test("test kinesisanalytics override inputProperty", () => {
  const stack = new Stack();

  const inputProperty: kinesisanalytics.CfnApplication.InputProperty = {
    inputSchema: {
      recordColumns: [{ name: "x", sqlType: "y" }],
      recordFormat: { recordFormatType: "csv" },
    },
    namePrefix: "zzz",
  };

  const defaultProps: kinesisanalytics.CfnApplicationProps =
    defaults.DefaultCfnApplicationProps;

  const inProps: kinesisanalytics.CfnApplicationProps = {
    inputs: [inputProperty],
  };

  const outProps = overrideProps(defaultProps, inProps);

  new kinesisanalytics.CfnApplication(stack, "KinesisAnalytics", outProps);

  Template.fromStack(stack).hasResourceProperties("AWS::KinesisAnalytics::Application", {
    Inputs: [
      {
        InputSchema: {
          RecordColumns: [
            {
              Name: "x",
              SqlType: "y",
            },
          ],
          RecordFormat: {
            RecordFormatType: "csv",
          },
        },
        NamePrefix: "zzz",
      },
    ],
  });
});

test("Test default implementation", () => {
  const stack = new Stack();

  const newFirehose = CreateFirehose(stack);
  const kinesisProps: defaults.BuildKinesisAnalyticsAppProps = {
    kinesisFirehose: newFirehose,
    kinesisAnalyticsProps: {
      inputs: [{
        inputSchema: {
          recordColumns: [{
            name: 'ts',
            sqlType: 'TIMESTAMP',
            mapping: '$.timestamp'
          }, {
            name: 'trip_id',
            sqlType: 'VARCHAR(64)',
            mapping: '$.trip_id'
          }],
          recordFormat: {
            recordFormatType: 'JSON'
          },
          recordEncoding: 'UTF-8'
        },
        namePrefix: 'SOURCE_SQL_STREAM'
      }]
    },
  };

  defaults.buildKinesisAnalyticsApp(stack, kinesisProps);

  Template.fromStack(stack).hasResourceProperties("AWS::KinesisAnalytics::Application", {
    Inputs: [{
      InputSchema: {
        RecordColumns: [{
          Name: 'ts',
          SqlType: 'TIMESTAMP',
          Mapping: '$.timestamp'
        }, {
          Name: 'trip_id',
          SqlType: 'VARCHAR(64)',
          Mapping: '$.trip_id'
        }],
        RecordFormat: {
          RecordFormatType: 'JSON'
        },
        RecordEncoding: 'UTF-8'
      },
      NamePrefix: 'SOURCE_SQL_STREAM'
    }]
  });
});

// test('Test for customer overrides', {
// test('Check policy created', {

function CreateFirehose(stack: Stack): kinesisFirehose.CfnDeliveryStream {
  // Creating the Firehose is kind of a big deal. FirehoseToS3 is not readily available here in core,
  // so this routine pretty much replicates it. If this function ceases to work correctly, look at
  // FirehoseToS3 and see if that changed.
  const destinationBucket = defaults.CreateScrapBucket(stack, "scrapBucket", {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });

  const kinesisFirehoseLogGroup = defaults.buildLogGroup(
    stack,
    "firehose-log-group",
    {}
  );

  const cwLogStream: logs.LogStream = kinesisFirehoseLogGroup.addStream(
    "firehose-log-stream"
  );

  const firehoseRole = new iam.Role(stack, "test-role", {
    assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
  });

  // Setup the IAM policy for Kinesis Firehose
  const firehosePolicy = new iam.Policy(stack, "KinesisFirehosePolicy", {
    statements: [
      new iam.PolicyStatement({
        actions: [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject",
        ],
        resources: [
          `${destinationBucket.bucketArn}`,
          `${destinationBucket.bucketArn}/*`,
        ],
      }),
      new iam.PolicyStatement({
        actions: ["logs:PutLogEvents"],
        resources: [
          `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:${kinesisFirehoseLogGroup.logGroupName}:log-stream:${cwLogStream.logStreamName}`,
        ],
      }),
    ],
  });

  // Attach policy to role
  firehosePolicy.attachToRole(firehoseRole);

  const awsManagedKey: kms.IKey = kms.Alias.fromAliasName(
    stack,
    "aws-managed-key",
    "alias/aws/s3"
  );

  const defaultKinesisFirehoseProps: kinesisFirehose.CfnDeliveryStreamProps = defaults.DefaultCfnDeliveryStreamProps(
    destinationBucket.bucketArn,
    firehoseRole.roleArn,
    kinesisFirehoseLogGroup.logGroupName,
    cwLogStream.logStreamName,
    awsManagedKey
  );

  destinationBucket.grantPut(firehoseRole);

  const firehose = new kinesisFirehose.CfnDeliveryStream(
    stack,
    "KinesisFirehose",
    defaultKinesisFirehoseProps
  );
  return firehose;
}
