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

import * as deepmerge from 'deepmerge';
import { flagOverriddenDefaults } from './override-warning-service';
import * as log from 'npmlog';
import * as crypto from 'crypto';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs";

export const COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME = lambda.Runtime.NODEJS_20_X;
export const COMMERCIAL_REGION_LAMBDA_NODE_STRING = "nodejs20.x";

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

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function overrideProps(DefaultProps: object, userProps: object, concatArray: boolean = false, suppressWarnings?: boolean): any {
  // Notify the user via console output if defaults are overridden

  let overrideWarningsEnabled: boolean;
  if ((process.env.overrideWarningsEnabled === 'false') || (suppressWarnings === true)) {
    overrideWarningsEnabled = false;
  } else  {
    overrideWarningsEnabled = true;
  }
  if (overrideWarningsEnabled) {
    flagOverriddenDefaults(DefaultProps, userProps);
  }
  // Override the sensible defaults with user provided props
  if (concatArray) {
    return deepmerge(DefaultProps, userProps, {
      arrayMerge: (destinationArray, sourceArray) =>  destinationArray.concat(sourceArray),
      isMergeableObject: isPlainObject
    });
  } else {
    return deepmerge(DefaultProps, userProps, {
      arrayMerge: (_destinationArray, sourceArray) => sourceArray, // underscore allows arg to be ignored
      isMergeableObject: isPlainObject
    });
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function printWarning(message: string) {
  // Style the log output
  log.prefixStyle.bold = true;
  log.prefixStyle.fg = 'red';
  log.enableColor();
  log.warn('AWS_SOLUTIONS_CONSTRUCTS_WARNING: ', message);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * @summary Creates a resource name in the style of the CDK (string+hash) - this value should be used for logical IDs, but
 * not Physical Names, as it will not be static within a single stack instance lifetime, or it will not be different in
 * different stack instances
 * @param {string[]} parts - the various string components of the name (eg - stackName, solutions construct ID, L2 construct ID)
 * @param {number} maxLength - the longest string that can be returned
 * @returns {string} - a string with concatenated parts (truncated if necessary) + a hash of the full concatenated parts
 *
 * This is based upon this discussion - https://github.com/aws/aws-cdk/issues/1424
 */
export function generateResourceName(
  parts: string[],
  maxLength: number,
  randomize: boolean = false
): string {
  const hashLength = 12;
  const randomizor: string = randomize ? (new Date()).getTime().toString() : "";

  const maxPartLength = Math.floor( (maxLength -  hashLength - randomizor.length) / parts.length);

  const sha256 = crypto.createHash("sha256");
  let finalName: string = '';

  parts.forEach((part) => {
    sha256.update(part);
    finalName += removeNonAlphanumeric(part.slice(0, maxPartLength));
  });

  const hash = sha256.digest("hex").slice(0, hashLength);
  finalName += hash;
  finalName += randomizor;
  return finalName.toLowerCase();
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * @summary Creates a physical resource name in the style of the CDK (string+hash) - this value incorporates Stack ID,
 * so it will remain static in multiple updates of a single stack, but will be different in a separate stack instance
 * @param {string[]} parts - the various string components of the name (eg - stackName, solutions construct ID, L2 construct ID)
 * @param {number} maxLength - the longest string that can be returned
 * @returns {string} - a string with concatenated parts (truncated if necessary) + a hash of the full concatenated parts
 *
 */
export function generatePhysicalName(
  prefix: string,
  parts: string[],
  maxLength: number,
): string {
  // The result will consist of:
  //    -The prefix - unaltered
  //    -The parts concatenated, but reduced in size to meet the maxLength limit for the overall name
  //    -A hyphen delimiter
  //    -The GUID portion of the stack arn

  const stackIdGuidLength = 36;
  const prefixLength = prefix.length;
  const maxPartsLength = maxLength - prefixLength - 1 - stackIdGuidLength; // 1 is the hyphen

  // Extract the Stack ID Guid
  const uniqueStackIdPart = cdk.Fn.select(2, cdk.Fn.split('/', `${cdk.Aws.STACK_ID}`));

  let allParts: string = '';

  parts.forEach((part) => {
    allParts += part;
  });

  if (allParts.length > maxPartsLength) {
    const subStringLength = maxPartsLength / 2;
    allParts = allParts.substring(0, subStringLength) + allParts.substring(allParts.length - subStringLength);
  }

  const finalName  = prefix.toLowerCase() + allParts + '-' + uniqueStackIdPart;
  return finalName;
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
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
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
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
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
    // Suppress warnings for construct props overriding everything else
    result = overrideProps(result, constructProps, concatArray, true);
  }

  return result;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
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

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CheckListValues(allowedPermissions: string[], submittedValues: string[], valueType: string) {
  submittedValues.forEach((submittedValue) => {
    if (!allowedPermissions.includes(submittedValue)) {
      throw Error(`Invalid ${valueType} submitted - ${submittedValue}`);
    }
  });
}

export function CheckBooleanWithDefault(value: boolean | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  } else {
    return value;
  }
}