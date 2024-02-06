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
const ddb = new aws.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const sns = new aws.SNS();

// Handler
exports.handler = async (event) => {

  // Any order created more than LATE_ORDER_THRESHOLD minutes ago
  // that is still open is overdue
  const lateInterval = Number(process.env.LATE_ORDER_THRESHOLD) * 60000;
  const lateThreshold = Number(new Date().getTime()) - lateInterval;
    
  // Setup the parameters
  const params = {
    KeyConditionExpression:
      "gsi1pk = :type and gsi1sk < :sortEnd",
    ExpressionAttributeValues: {
      ":type": "order",
      ":sortEnd": `OPEN#${lateThreshold}`
    },
    TableName: process.env.DDB_TABLE_NAME,
    IndexName: 'gsi1pk-gsi1sk-index'
  };

  // Hold the late orders in an array
  let lateOrders = [];
  console.log(lateOrders);

  // Query all late orders from the table
  try {
    const result = await ddb.query(params).promise();
    // Extract the order JSON objects
    const orders = Array.from(result.Items);
    // Save the open orders to the array
    lateOrders = orders;
  } catch (error) {
    console.error(error);
  }

  // Send a notification if there is one or more orders running late
  if (lateOrders.length > 0) {
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
