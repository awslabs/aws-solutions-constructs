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

import * as deepdiff from 'deep-diff';
import * as log from 'npmlog';

/**
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
    // Style the log output
    log.prefixStyle.bold = true;
    log.prefixStyle.fg = 'red';
    log.enableColor();
    // Output
    const details = (valuesAreReadable) ? ` Default value: '${e.lhs}'. You provided: '${e.rhs}'.` : '';
    log.warn('AWS_SOLUTIONS_CONSTRUCTS_WARNING: ', `An override has been provided for the property: ${path}.` + details);
  }
}

/**
 * Performs a diff check of the userProps against the defaultProps to detect overridden properties.
 * @param {object} defaultProps the prescriptive defaults for the pattern.
 * @param {object} userProps the properties provided by the user, to be compared against the defaultProps.
 * @return {Array} an array containing the overridden values.
 */
function findOverrides(defaultProps: object, userProps: object) {
  const diff = deepdiff.diff(defaultProps, userProps,
    /** This prefilter function returns true for any filtered path/key that should be excluded from the diff check.
     * S3 Bucket Props with lifecycleRules uses cdk.Duration which is not properly handled by
     * 'deep-diff' library, whenever it encounters a Duration object, it throws the exception
     * 'argument to intrinsic must be a plain value object', so the lifecycleRules needs to be excluded from
     * the diff check.
     */
    (_path, _key) => {
      if ( _path.includes('lifecycleRules') ) {
        return true;
      }
      return false;
    }
  );
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
    .replace(/\]{1}/, '')
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