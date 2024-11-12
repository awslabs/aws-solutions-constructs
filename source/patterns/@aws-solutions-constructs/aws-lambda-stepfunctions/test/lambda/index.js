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

const aws = require('aws-sdk');

console.log('Loading function');

exports.handler = () => {
  const params = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify({})
  };
  const stepFunction = new aws.StepFunctions();
  stepFunction.startExecution(params, function (err, data) {
    if (err) {
      throw Error('An error occurred executing the step function.');
    } else {
      console.log('Step function was successfully executed.');
    }
  })
};