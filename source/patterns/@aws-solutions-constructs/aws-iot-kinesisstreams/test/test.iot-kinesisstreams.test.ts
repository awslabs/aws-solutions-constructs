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

import { IotToKinesisStreams, IotToKinesisStreamsProps } from "../lib";
import * as cdk from "aws-cdk-lib";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';

const iotTopicRuleProps: iot.CfnTopicRuleProps = {
  topicRulePayload: {
    description: "sends data to kinesis streams",
    sql: "SELECT * FROM 'solutions/constructs'",
    actions: []
  }
};

test('check iot topic rule properties', () => {
  const stack = new cdk.Stack();

  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps
  };
  const construct = new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Kinesis: {
            StreamName: {
              Ref: "testiotkinesisstreamsKinesisStreamA6FEF4AF"
            },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotkinesisstreamsIotActionsRoleAE74F764",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "sends data to kinesis streams",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'solutions/constructs'"
    }
  });

  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 1,
    RetentionPeriodHours: 24,
    StreamEncryption: {
      EncryptionType: "KMS",
      KeyId: "alias/aws/kinesis"
    }
  });

  expect(construct.iotTopicRule).toBeDefined();
  expect(construct.iotActionsRole).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
});

test('check existing kinesis stream', () => {
  const stack = new cdk.Stack();

  const existingKinesisStream = new kinesis.Stream(stack, `existing-stream`, {
    shardCount: 2,
    streamName: 'testexistingstream',
    retentionPeriod: cdk.Duration.hours(25)
  });

  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps,
    existingStreamObj: existingKinesisStream,
    createCloudWatchAlarms: false
  };
  const construct = new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 2,
    RetentionPeriodHours: 25,
    Name: 'testexistingstream'
  });

  template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

  expect(construct.iotTopicRule).toBeDefined();
  expect(construct.iotActionsRole).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeUndefined();
  expect(construct.kinesisStream).toBeDefined();
});

test('check new kinesis stream with override props', () => {
  const stack = new cdk.Stack();

  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps,
    createCloudWatchAlarms: false,
    kinesisStreamProps: {
      shardCount: 5,
      streamName: 'testnewstream',
      retentionPeriod: cdk.Duration.hours(30)
    }
  };
  const construct = new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 5,
    RetentionPeriodHours: 30,
    Name: 'testnewstream'
  });

  const kinesisStream = construct.kinesisStream;
  expect(kinesisStream).toBeDefined();
});

test('check existing action in topic rule props', () => {
  const stack = new cdk.Stack();

  const existingKinesisStream = new kinesis.Stream(stack, `existing-stream`, {});

  const existingIamRole = new iam.Role(stack, 'existingRole', {
    assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
  });

  const existingKinesisActionProperty: iot.CfnTopicRule.ActionProperty = {
    kinesis: {
      streamName: existingKinesisStream.streamName,
      roleArn: existingIamRole.roleArn
    }
  };

  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        sql: "SELECT * FROM 'solutions/constructs'",
        actions: [existingKinesisActionProperty],
        ruleDisabled: true
      },
      ruleName: 'testiotrulename'
    },
    createCloudWatchAlarms: false,
    kinesisStreamProps: {
      shardCount: 5,
      streamName: 'testnewstream',
      retentionPeriod: cdk.Duration.hours(30)
    }
  };
  new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);

  // Check multiple actions in the Topic Rule
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Kinesis: {
            StreamName: {
              Ref: "testiotkinesisstreamsKinesisStreamA6FEF4AF"
            },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotkinesisstreamsIotActionsRoleAE74F764",
                "Arn"
              ]
            }
          }
        },
        {
          Kinesis: {
            RoleArn: {
              "Fn::GetAtt": [
                "existingRole3E995BBA",
                "Arn"
              ]
            },
            StreamName: {
              Ref: "existingstream0A902451"
            }
          }
        }
      ],
      RuleDisabled: true,
      Sql: "SELECT * FROM 'solutions/constructs'"
    },
    RuleName: "testiotrulename"
  });

  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 5,
    RetentionPeriodHours: 30,
    Name: 'testnewstream'
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 2);
});

test('check name confict', () => {
  const stack = new cdk.Stack();

  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps
  };
  new IotToKinesisStreams(stack, 'test-iot-kinesisstreams1', props);
  new IotToKinesisStreams(stack, 'test-iot-kinesisstreams2', props);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kinesis::Stream', 2);
});

test('check construct chaining', () => {
  const stack = new cdk.Stack();

  const props1: IotToKinesisStreamsProps = {
    iotTopicRuleProps
  };
  const construct = new IotToKinesisStreams(stack, 'test-iot-kinesisstreams1', props1);

  const props2: IotToKinesisStreamsProps = {
    iotTopicRuleProps,
    existingStreamObj: construct.kinesisStream
  };
  new IotToKinesisStreams(stack, 'test-iot-kinesisstreams2', props2);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('check error when stream props and existing stream is supplied', () => {
  const stack = new cdk.Stack();

  const existingKinesisStream = new kinesis.Stream(stack, `existing-stream`, {});
  const props: IotToKinesisStreamsProps = {
    iotTopicRuleProps,
    existingStreamObj: existingKinesisStream,
    kinesisStreamProps: {}
  };

  const app = () => {
    new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);
  };
  expect(app).toThrowError();
});