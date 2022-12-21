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

import { Stack } from 'aws-cdk-lib';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('test TopicRuleProps override sql and description', () => {
  const stack = new Stack();

  const action1: iot.CfnTopicRule.ActionProperty = {
    lambda: {
      functionArn: 'xyz'
    }
  };

  const defaultProps: iot.CfnTopicRuleProps = defaults.DefaultCfnTopicRuleProps([action1]);

  const inProps: iot.CfnTopicRuleProps = {
    topicRulePayload: {
      ruleDisabled: true,
      description: "Processing of vehicle messages",
      sql: "SELECT * FROM 'connectedcar/#'",
      actions: []
    }
  };

  const outProps = overrideProps(defaultProps, inProps, true);

  new iot.CfnTopicRule(stack, 'IotTopic', outProps);

  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Lambda: {
            FunctionArn: "xyz"
          }
        }
      ],
      Description: "Processing of vehicle messages",
      RuleDisabled: true,
      Sql: "SELECT * FROM 'connectedcar/#'"
    }
  });
});

test('test TopicRuleProps override actions', () => {
  const stack = new Stack();

  const defaultProps: iot.CfnTopicRuleProps = defaults.DefaultCfnTopicRuleProps([], '');

  const action: iot.CfnTopicRule.ActionProperty = {
    lambda: {
      functionArn: 'abc'
    }
  };

  const inProps: iot.CfnTopicRuleProps = {
    topicRulePayload: {
      ruleDisabled: true,
      sql: '',
      actions: [action]
    }
  };

  const outProps = overrideProps(defaultProps, inProps);

  new iot.CfnTopicRule(stack, 'IotTopic', outProps);

  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Lambda: {
            FunctionArn: "abc"
          }
        }
      ],
      RuleDisabled: true,
      Sql: ""
    }
  });
});
