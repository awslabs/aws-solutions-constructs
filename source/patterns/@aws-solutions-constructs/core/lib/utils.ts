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

import * as deepmerge from 'deepmerge';
import { flagOverriddenDefaults } from './override-warning-service';
import * as log from 'npmlog';
import * as crypto from 'crypto';
import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";

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

/**
 * @summary Creates a resource name in the style of the CDK (string+hash)
 * @param {string[]} parts - the various string components of the name (eg - stackName, solutions construct ID, L2 construct ID)
 * @param {number} maxLength - the longest string that can be returned
 * @returns {string} - a string with concatenated parts (truncated if neccessary) + a hash of the full concatenated parts
 *
 * This is based upon this discussion - https://github.com/aws/aws-cdk/issues/1424
 */
export function generateResourceName(
  parts: string[],
  maxLength: number
): string {
  const hashLength = 12;

  const maxPartLength = Math.floor( (maxLength -  hashLength) / parts.length);

  const sha256 = crypto.createHash("sha256");
  let finalName: string = '';

  parts.forEach((part) => {
    sha256.update(part);
    finalName += removeNonAlphanumeric(part.slice(0, maxPartLength));
  });

  const hash = sha256.digest("hex").slice(0, hashLength);
  finalName += hash;
  return finalName.toLowerCase();
}

/**
 * Removes all non-alphanumeric characters in a string.
 */
function removeNonAlphanumeric(s: string) {
  return s.replace(/[^A-Za-z0-9]/g, '');
}

/**
 * The CFN NAG suppress rule interface
 * @interface CfnNagSuppressRule
 */
export interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

/**
 * Adds CFN NAG suppress rules to the CDK resource.
 * @param resource The CDK resource
 * @param rules The CFN NAG suppress rules
 */
export function addCfnSuppressRules(resource: cdk.Resource | cdk.CfnResource, rules: CfnNagSuppressRule[]) {
  if (resource instanceof cdk.Resource) {
    resource = resource.node.defaultChild as cdk.CfnResource;
  }

  if (resource.cfnOptions.metadata?.cfn_nag?.rules_to_suppress) {
    resource.cfnOptions.metadata?.cfn_nag.rules_to_suppress.push(...rules);
  } else {
    resource.addMetadata('cfn_nag', {
      rules_to_suppress: rules
    });
  }
}

/**
 * Creates the props to be used to instantiate a CDK L2 construct within a Solutions Construct
 *
 * @param defaultProps The default props to be used by the construct
 * @param clientProps Optional properties passed in from the client in the props object
 * @param constructProps Optional properties required by the construct for the construct to work (override any other values)
 * @returns The properties to use - all values prioritized:
 *  1) constructProps value
 *  2) clientProps value
 *  3) defaultProps value
 */
export function consolidateProps(defaultProps: object, clientProps?: object, constructProps?: object, concatArray: boolean = false): any {
  let result: object = defaultProps;

  if (clientProps) {
    result = overrideProps(result, clientProps, concatArray);
  }

  if (constructProps) {
    result = overrideProps(result, constructProps, concatArray);
  }

  return result;
}

/**
 * Generates a name unique to this location in this stack with this stackname. Truncates to under 64 characters if needed.
 * (will allow 2 copies of the stack with different stack names, but will collide if both stacks have the same name)
 *
 * @param scope the construct within to create the name
 * @param resourceId an id for the construct about to be created under scope (empty string if name is for scoep)
 * @returns a unique name
 *
 * Note: This appears to overlap with GenerateResourceName above (I wrote it before noticing that
 * function). As this offloads the logic to the CDK, I'm leaving this here but someone may want to
 * blend these routines in the future.
 */
export function generateName(scope: Construct, resourceId: string = ""): string {
  const name = resourceId + cdk.Names.uniqueId(scope);
  if (name.length > 64) {
    return name.substring(0, 32) + name.substring(name.length - 32);
  }
  return name;
}
