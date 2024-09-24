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


const { SNS, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNS();
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
        tips[r.createdBy] = Number(r.tipAmount);
        servers.push(r.createdBy);
      } else {
        tips[r.createdBy] = Number(tips[r.createdBy]) + Number(r.tipAmount);
      }
    }
  });

  for (var i = 0; i<Object.keys(tips).length; i++) {
    var key = Object.keys(tips)[i];
    const sns_params = {
      Message: `${key}, your tip total for today is $${tips[key]}`,
      TopicArn: process.env.SNS_TOPIC_ARN
    };
    await sns.send(new PublishCommand(sns_params));
  }

};
