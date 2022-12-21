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
const aws = require('aws-sdk');
const sns = new aws.SNS();
const db_access = require('/opt/db-access');

// Handler
exports.handler = async (event) => {
    
  // Hold the scan results in an array
  let scanResults = [];

  // Execute the operation
  try {
    scanResults = await db_access.scanTable();
  } catch (err) {
    console.log(err);
  }

  // Get all of the servers who worked the service and calculate their tips
  const servers = [];
  const tips = {};
  scanResults.forEach((r) => {
    if (r.tipAmount !== undefined) {
      if (!servers.includes(r.createdBy)) {
        tips[r.createdBy] = Number(r.tipAmount)
      } else {
        tips[r.createdBy] = Number(tips[r.createdBy]) + Number(r.tipAmount)
      }
    }
  });

  // Send a notification to each active server with tip information
  Object.keys(tips).forEach((t) => {
    // Message parameters
    const sns_params = {
      Message: `${t}, your tip total for today is $${tips[t]}}`,
      TopicArn: process.env.SNS_TOPIC_ARN
    };
    console.log(sns_params);
    // Send the message
    sns.publish(sns_params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  })
};
