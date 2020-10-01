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

import * as deepmerge from 'deepmerge';
import { flagOverriddenDefaults } from './override-warning-service';
import * as log from 'npmlog';

function isObject(val: object) {
    return val != null && typeof val === 'object'
        && Object.prototype.toString.call(val) === '[object Object]';
}

function isPlainObject(o: object) {
  if (Array.isArray(o) === true) {
    return true;
  }

  if (isObject(o) === false) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor !== 'function') {
    return false;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (isObject(prot) === false) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function combineMerge(target: any[], source: any[]) {
    return target.concat(source);
}

function overwriteMerge(target: any[], source: any[]) {
  target = source;
  return target;
}

export function overrideProps(DefaultProps: object, userProps: object, concatArray: boolean = false): any {
  // Notify the user via console output if defaults are overridden
  const overrideWarningsEnabled = (process.env.overrideWarningsEnabled !== 'false');
  if (overrideWarningsEnabled) {
    flagOverriddenDefaults(DefaultProps, userProps);
  }
  // Override the sensible defaults with user provided props
  if (concatArray) {
    return deepmerge(DefaultProps, userProps, {
      arrayMerge: combineMerge,
      isMergeableObject: isPlainObject
    });
  } else {
    return deepmerge(DefaultProps, userProps, {
      arrayMerge: overwriteMerge,
      isMergeableObject: isPlainObject
    });
  }
}

export function printWarning(message: string) {
  // Style the log output
  log.prefixStyle.bold = true;
  log.prefixStyle.fg = 'red';
  log.enableColor();
  log.warn('AWS_SOLUTIONS_CONSTRUCTS_WARNING: ', message);
}
