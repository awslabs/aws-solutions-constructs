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

// Imports
import * as defaults from '../';
import * as cdk from 'aws-cdk-lib';
import { CfnResource, Stack } from 'aws-cdk-lib';
import * as log from 'npmlog';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';

// Need 2 parts, but they can't overlap
// so we can explicitly find them in the results.
const parts = [ 'firstportionislong', 'secondsection'];
const nonAlphaParts = [ 'part-one', 'part-two'];

test('Test generateResourceName with a truncated part', () => {
  const result = defaults.generateResourceName(parts, 38);

  expect(result).toContain(parts[1]);
  expect(result).not.toContain(parts[0]);
  expect(result).toContain(parts[0].slice(0, 13));

});

test('Test generateResourceName with no truncated parts', () => {
  const result = defaults.generateResourceName(parts, 100);

  expect(result).toContain(parts[1]);
  expect(result).toContain(parts[0]);
  expect(result.length).toEqual(parts[0].length + parts[1].length + 12);
});

test('Test generateResourceName with non Aphanumeric', () => {
  const result = defaults.generateResourceName(nonAlphaParts, 100);

  expect(result).toContain('partoneparttwo');
});

test('Test generateResourceName with randomized extension', () => {
  const resultOne = defaults.generateResourceName(parts, 512, true);
  const startTime = (new Date()).getTime();

  // We need to ensure the time value appended changes between callls
  let currTime = startTime;
  while (currTime  === startTime) {
    currTime = (new Date()).getTime();
  }

  const resultTwo = defaults.generateResourceName(parts, 512, true);

  expect(resultOne).toContain(parts[1]);
  expect(resultOne).toContain(parts[0]);
  expect(resultTwo).toContain(parts[1]);
  expect(resultTwo).toContain(parts[0]);
  expect(resultOne).not.toEqual(resultTwo);
  expect(resultOne.slice(0, -13)).toEqual(resultTwo.slice(0, -13));

});

test('Test generatePhysicalName', () => {
  const result = defaults.generatePhysicalName('/aws/vendedlogs/states/constructs/', parts, 255);

  // The token number is not constant, so need to be flexible checking this value
  const regex = /\/aws\/vendedlogs\/states\/constructs\/firstportionislongsecondsection-\${Token\[TOKEN\.[0-9]+\]}/;
  expect(result).toMatch(regex);
});

test('Test truncation of generatePhysicalName', () => {
  const longParts = [ ...parts, ...parts, ...parts, ...parts, ...parts ];
  const prefix = '/aws/vendedlogs/states/constructs/';
  const lengthOfGuid = 36;
  const maxNameLength = 125;

  const result = defaults.generatePhysicalName(prefix, longParts, maxNameLength);

  const fixedPortion = result.split('$')[0];
  expect(fixedPortion.length).toEqual(maxNameLength - lengthOfGuid);
});

test('Test generateIntegStackName', () => {
  const result = defaults.generateIntegStackName('integ.apigateway-dynamodb-CRUD.js');
  expect(result).toContain('apigateway-dynamodb-CRUD');

  const result1 = defaults.generateIntegStackName('integ.override_auth_api_keys.ts');
  expect(result1).toContain('override-auth-api-keys');
});

test('Test consolidate props with all args', () => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.overrideWarningsEnabled = 'true';

  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg2 = {
    val1: 21,
    val2: 22,
  };

  const arg3 = {
    val1: 31,
  };

  const warn = jest.spyOn(log, 'warn');
  const result = defaults.consolidateProps(arg1, arg2, arg3);

  expect(result).toEqual({
    val1: 31,
    val2: 22,
    val3: 13,
  });

  expect(warn).toBeCalledTimes(2);

});

test('Test consolidate props with first and third args', () => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.overrideWarningsEnabled = 'true';

  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg3 = {
    val1: 31,
  };

  const warn = jest.spyOn(log, 'warn');
  const result = defaults.consolidateProps(arg1, undefined, arg3);

  expect(result).toEqual({
    val1: 31,
    val2: 12,
    val3: 13,
  });

  expect(warn).toBeCalledTimes(0);

});

test('Test consolidate props with first and second args', () => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.overrideWarningsEnabled = 'true';

  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg2 = {
    val1: 21,
    val2: 22,
  };

  const warn = jest.spyOn(log, 'warn');
  const result = defaults.consolidateProps(arg1, arg2);

  expect(result).toEqual({
    val1: 21,
    val2: 22,
    val3: 13,
  });

  expect(warn).toBeCalledTimes(2);

});

test('Test consolidate props with one arg', () => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.overrideWarningsEnabled = 'true';

  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const warn = jest.spyOn(log, 'warn');
  const result = defaults.consolidateProps(arg1);

  expect(result).toEqual(arg1);

  expect(warn).toBeCalledTimes(0);

});

test('Test generateName sunny day for current construct with undefined name argument', () => {
  const stack = new cdk.Stack(undefined, "some-new-id");

  const newName = defaults.generateName(stack);
  // 5 is not specific, just checking the name is several characters longer than just a CR/LF
  expect(newName.length).toBeGreaterThan(5);
});

test('Test generateName sunny day for current construct', () => {
  const stack = new cdk.Stack(undefined, "some-new-id");

  const newName = defaults.generateName(stack, "");
  expect(newName.length).toBeGreaterThan(5);
});

test('Test generateName sunny day for child construct', () => {
  const stack = new cdk.Stack(undefined, "some-new-id");

  const newName = defaults.generateName(stack, "child");
  expect(newName.length).toBeGreaterThan(5);
  expect(newName.includes(newName)).toBe(true);
});

test('Test generateName longer than 64 characters', () => {
  const stack = new cdk.Stack(undefined, "some-new-id");
  const seventyCharacterName = '123456789-123456789-123456789-123456789-123456789-123456789-123456789-';
  const newName = defaults.generateName(stack, seventyCharacterName);
  expect(newName.length).toEqual(64);
});

test('Test generateName uniqueness', () => {
  const stackOne = new cdk.Stack(undefined, "some-new-id");
  const stackTwo = new cdk.Stack(undefined, "other-id");

  const nameOne = defaults.generateName(stackOne, "");
  const nameTwo = defaults.generateName(stackTwo, "");
  expect(nameOne === nameTwo).toBe(false);
});

test('Test successful CheckListValues', () => {

  const app = () => {
    defaults.CheckListValues(['one', 'two', 'four'], ['four', 'one'], 'test value');
  };

  // Assertion
  expect(app).not.toThrowError();
});

test('Test fail OpenSearch improper vpc specification', () => {

  const props: defaults.OpenSearchProps = {
    openSearchDomainProps: {
      vpcOptions: {}
    },
  };

  const app = () => {
    defaults.CheckOpenSearchProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Define VPC using construct parameters not the OpenSearch Service props\n');
});

test('Test unsuccessful CheckListValues', () => {

  const app = () => {
    defaults.CheckListValues(['one', 'two', 'four'], ['four', 'three'], 'test value');
  };

  // Assertion
  expect(app).toThrowError('Invalid test value submitted - three');
});

test('ConsolidateProps does not generate warnings for construct props overrides', () => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.overrideWarningsEnabled = 'true';

  const defaultProps = {
    val1: 'one'
  };

  const clientProps = {
    val1: 'two',
    val2: 'three'
  };

  const constructProps = {
    val2: 'four'
  };

  const warn = jest.spyOn(log, 'warn');
  defaults.consolidateProps(defaultProps, clientProps,  constructProps);

  // Assert
  expect(warn).toBeCalledTimes(1);

});

test('CheckBooleanWithDefault', () => {
  let response;

  response = defaults.CheckBooleanWithDefault(undefined, true);
  expect(response).toBe(true);

  response = defaults.CheckBooleanWithDefault(undefined, false);
  expect(response).toBe(false);

  response = defaults.CheckBooleanWithDefault(true, true);
  expect(response).toBe(true);

  response = defaults.CheckBooleanWithDefault(true, false);
  expect(response).toBe(true);

  response = defaults.CheckBooleanWithDefault(false, true);
  expect(response).toBe(false);

  response = defaults.CheckBooleanWithDefault(false, false);
  expect(response).toBe(false);
});

test('test addCfnGuardSuppressRules', () => {
  const stack = new Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket');
  defaults.addCfnGuardSuppressRules(testBucket, ["ADDED_TO_BUCKET"]);
  defaults.addCfnGuardSuppressRules(testBucket.node.findChild('Resource') as CfnResource, ["ADDED_TO_CFN_RESOURCE"]);

  const template = Template.fromStack(stack);
  const bucket = template.findResources("AWS::S3::Bucket");
  defaults.printWarning(`DBG*********${JSON.stringify(bucket.testbucketE6E05ABE.Metadata)}`);
  expect(bucket.testbucketE6E05ABE.Metadata.guard.SuppressedRules[0]).toEqual("ADDED_TO_BUCKET");
  expect(bucket.testbucketE6E05ABE.Metadata.guard.SuppressedRules[1]).toEqual("ADDED_TO_CFN_RESOURCE");
});