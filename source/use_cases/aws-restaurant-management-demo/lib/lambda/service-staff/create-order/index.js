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
const { v4: uuidv4 } = require('uuid');

// Handler
exports.handler = async (event) => {
    
  // Setup the parameters
  const req = JSON.parse(event.body);
  const params = {
    TableName: process.env.DDB_TABLE_NAME,
    Item: {
      id: uuidv4(),
      createdBy: req.createdBy,
      tableNumber: req.tableNumber,
      items: req.items,
      orderStatus: 'OPEN',
      orderTotal: req.orderTotal,
      tipAmount: req.tipAmount,
      timeOpened: new Date().getTime(),
      timeClosed: undefined,
      gsi1pk: 'order',
      gsi1sk: `OPEN#${req.timeOpened}`,
    }
  };

  // Add the item to the database
  try {
    const res = await ddb.put(params).promise();
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: JSON.stringify(res),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
  catch (err) {
    console.log(err);
  }
};
