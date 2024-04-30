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

import * as log from 'npmlog';
import * as process from 'process';
import { flagOverriddenDefaults } from '../lib/override-warning-service';
import { overrideProps } from '../';

// Mock setup
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  delete process.env.overrideWarningsEnabled;
});

test('Test override detection: positive, not-nested', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  flagOverriddenDefaults(a, b);
  // Assert
  expect(warn).toBeCalledTimes(1);
});

test('Test override detection: negative, not-nested', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  flagOverriddenDefaults(a, b);
  // Assert
  expect(warn).toBeCalledTimes(0);
});

test('Test override detection: positive, nested', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC',
    keyD: {
      keyDA: 'valueDA',
      keyDB: 'valueDB'
    }
  };
  const b = {
    keyC: 'valueCAnew',
    keyD: {
      keyDA: 'valueDAnew'
    }
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  flagOverriddenDefaults(a, b);
  // Assert
  expect(warn).toBeCalledTimes(2);
});

test('Test override detection: negative, nested', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC',
    keyD: {
      keyDA: 'valueDA',
      keyDB: 'valueDB'
    }
  };
  const b = {
    keyD: {
      keyDA: 'valueDA'
    }
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  flagOverriddenDefaults(a, b);
  // Assert
  expect(warn).toBeCalledTimes(0);
});

test('Test override warning on/off: default on', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(1);
});

test('Test override warning on/off: explicit on', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  process.env.overrideWarningsEnabled = 'true';
  // Act
  const warn = jest.spyOn(log, 'warn');
  overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(1);
});

test('Test override warning on/off: explicit off', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  process.env.overrideWarningsEnabled = 'false';
  const result = overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(0);

  expect(result).toEqual({
    keyA: 'new-valueA',
    keyB: 'valueB',
    keyC: 'valueC',
    keyD: 'valueD'
  });

});

test('Test override warning on/off: undefined on', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  process.env.overrideWarningsEnabled = undefined;
  const result = overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(1);

  expect(result).toEqual({
    keyA: 'new-valueA',
    keyB: 'valueB',
    keyC: 'valueC',
    keyD: 'valueD'
  });

});

test('Test current prefilters', () => {
  // Arrange
  const a = {
    destination: 'sampleDestinationValueA',
    maxRecordAge: 'sampleMaxRecordAgeValueA',
    expiration: 'sampleExpirationValueA',
    transitionAfter: 'sampleTransitionValueA',
    timeout: 'sampleTimeoutValueA',
    period: 'samplePeriodValueA',
    node: 'sampleNodeA'
  };
  const b = {
    destination: 'sampleDestinationValueB',
    maxRecordAge: 'sampleMaxRecordAgeValueB',
    expiration: 'sampleExpirationValueB',
    transitionAfter: 'sampleTransitionValueB',
    timeout: 'sampleTimeoutValueB',
    period: 'samplePeriodValueA',
    node: 'sampleNodeA'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  process.env.overrideWarningsEnabled = undefined;
  const result = overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(6);
  expect(result).toEqual({
    destination: 'sampleDestinationValueB',
    maxRecordAge: 'sampleMaxRecordAgeValueB',
    expiration: 'sampleExpirationValueB',
    transitionAfter: 'sampleTransitionValueB',
    timeout: 'sampleTimeoutValueB',
    period: 'samplePeriodValueA',
    node: 'sampleNodeA'
  });
});

test('Test overrideProps with warnings disabled in argument', () => {
  process.env.overrideWarningsEnabled = 'true';
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD'
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  overrideProps(a, b, undefined, true);
  // Assert
  expect(warn).toBeCalledTimes(0);

});

test('Test overrideProps with deep arguments', () => {
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: {
      keyCA: 'valueCA',
      keyCB: 'valueCB'
    },
    keyD: 'valueD'
  };
  const b = {
    keyA: 'new-valueA',
    keyB: 'valueB',
    keyC: {
      keyCA: 'valueCANew',
    },
    keyD: {
      keyDA: 'valueDANew',
      keyDB: 'valueDBNew'
    }
  };
  // Act
  const warn = jest.spyOn(log, 'warn');
  overrideProps(a, b);
  // Assert
  expect(warn).toBeCalledTimes(3);
});

test('Confirm node stops circular reference traversal', () => {
  // Arrange
  const a = {
    keyA: 'valueA',
    keyB: 'valueB',
    keyC: 'valueC'
  };
  const b = {
    keyA: 'new-valueA',
    keyD: 'valueD',
    keyE: {
      node: {}
    }
  };
  b.keyE.node = b;

  const warn = jest.spyOn(log, 'warn');
  flagOverriddenDefaults(a, b);
  // Assert
  expect(warn).toBeCalledTimes(1);
});
