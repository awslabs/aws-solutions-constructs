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

// Handler
exports.handler = async (event) => {
    
  // Setup the parameters
  const params = {
    KeyConditionExpression:
      "gsi1pk = :type and begins_with (gsi1sk, :sort)",
    ExpressionAttributeValues: {
      ":type": "order",
      ":sort": "OPEN#",
    },
    TableName: process.env.DDB_TABLE_NAME,
    IndexName: 'gsi1pk-gsi1sk-index'
  };

  // Perform the query
  try {
    const result = await ddb.query(params).promise();
    // Extract the order JSON objects
    const orders = Array.from(result.Items);
    // Return the open orders
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: JSON.stringify(orders),
      headers: {
        "Content-Type": "application/json",
      },
    };

  }
  catch (err) {
    console.log(err);
  }
};