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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as deepdiff from 'deep-diff';
import { printWarning } from './utils';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Emits a warning to the console when a prescriptive default value is overridden by the user.
 * @param {object} defaultProps the prescriptive defaults for the pattern.
 * @param {object} userProps the properties provided by the user, to be compared against the defaultProps.
 */
export function flagOverriddenDefaults(defaultProps: object, userProps: object) {
  // Compare the properties and return any overrides
  const overrides = findOverrides(defaultProps, userProps);
  // Emit a warning for each override
  for (let i = 0; i < ((overrides !== undefined) ? overrides.length : 0); i++) {
    const e = Object.assign(overrides[i]);
    // Determine appropriate logging granularity
    const valuesAreReadable = (
      checkReadability(e.lhs) &&
      checkReadability(e.rhs)
    );
    // Format the path for readability
    const path = formatOverridePath(e.path);
    // Output
    const details = (valuesAreReadable) ? ` Default value: '${e.lhs}'. You provided: '${e.rhs}'.` : '';
    printWarning(`An override has been provided for the property: ${path}.` + details);
  }
}

/** The prefilter function returns true for any filtered path/key that should be excluded from the diff check.
 * Any Construct Props using cdk.Duration type is not properly handled by
 * 'deep-diff' library, whenever it encounters a Duration object, it throws the exception
 * 'Argument to Intrinsic must be a plain value object', so such props are excluded from the diff check.
 */
function _prefilter(_path: any[], _key: string): boolean {
  const prefilters = ['maxRecordAge', 'expiration', 'transitionAfter', 'destination', 'timeout', 'period', 'node'];

  if (prefilters.indexOf(_key) >= 0) {
    if (_key !== 'node') {
      printWarning(`Possible override of ${_key} value.`);
    }
    return true;
  }
  return false;
}

/**
 * Performs a diff check of the userProps against the defaultProps to detect overridden properties.
 * @param {object} defaultProps the prescriptive defaults for the pattern.
 * @param {object} userProps the properties provided by the user, to be compared against the defaultProps.
 * @return {Array} an array containing the overridden values.
 */
function findOverrides(defaultProps: object, userProps: object) {
  const diff = deepdiff.diff(defaultProps, userProps, _prefilter);
  // Filter the results
  return (diff !== undefined) ? diff?.filter((e) => (
    e.kind === 'E' && // only return overrides
    !e.path?.includes('node') && // stop traversing once the object graph hits the node
    !e.path?.includes('bind') // stop traversing once the object graph hits internal functions
  )) : [];
}

/**
 * Converts the path object from the deep-diff module to a user-readable, bracket notation format.
 * @param {string | string[]} path either a string value or an array of strings.
 * @return {string} the formatted override path.
 */
function formatOverridePath(path: string | string[]) {
  return (path !== undefined && path.length > 1) ? path.toString()
    .replace(/,/g, '][')
    .replace(/\]/, '')
    .replace(/$/, ']') : path;
}

/**
 * Check the readability of an input value and, in the context of the override warning service, return true if it
 * meets the established criteria. This function is used to determine whether more-detailed log output can be given.
 * @param {any} value input to be evaluated against the given criteria.
 * @return {boolean} true if the value meets the given criteria.
 * @return {boolean} false if the value does not meet the given criteria.
 */
function checkReadability(value: any) {
  return (
    typeof(value) === 'string' && // strings only
    !value.includes('${Token[') && // no circular refs
    value !== '' // no empty strings
  );
}