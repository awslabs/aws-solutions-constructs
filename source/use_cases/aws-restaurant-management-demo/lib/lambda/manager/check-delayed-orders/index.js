/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
const ddb = new aws.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const sns = new aws.SNS();

// Handler
exports.handler = async (event) => {
    
  // Setup the parameters
  const currentTime = new Date().getTime();
  const params = {
    TableName: process.env.DDB_TABLE_NAME
  };

  // Hold the scan results in an array
  let scanResults = [];
  let items;

  // Perform the query
  try {
    do {
        items = await ddb.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item));
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");
  }
  catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      isBase64Encoded: false,
      body: 'Internal server error',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  // Filter by entries over the threshold
  let lateOrders = false;
  scanResults.forEach((r) => {
    // If the current time minus the timeCreated is greater than the threshold, the order is running late
    const isOverThreshold = ((Number(currentTime) - Number(r.timeOpened))/60000) > Number(process.env.OPEN_ORDER_THRESHOLD_MINS);
    if (r.orderStatus === 'OPEN' && isOverThreshold) {
      lateOrders = true;
    }
  });

  // Send a notification if there is one or more orders running late
  if (lateOrders) {
    // Message parameters
    const sns_params = {
      Message: 'One or more orders are running late!',
      TopicArn: process.env.SNS_TOPIC_ARN
    };
    // Send the message
    sns.publish(sns_params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }
};
