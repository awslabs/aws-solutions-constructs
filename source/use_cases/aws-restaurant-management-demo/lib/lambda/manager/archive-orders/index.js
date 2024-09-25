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

const { DynamoDBDocument, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3();
const ddb = DynamoDBDocument.from(new DynamoDB({apiVersion: '2012-08-10'}));
const db_access = require('/opt/db-access');

exports.handler = async (event) => {
  
  // ---------------------------------------------------------------------------
  // Gather order records from the table
  // ---------------------------------------------------------------------------
  
  // Hold the scan results in an array
  let scanResults = [];

  // Execute the operation
  try {
    scanResults = await db_access.scanTable();
  } catch (err) {
    console.log(err);
  }
  
  // ---------------------------------------------------------------------------
  // Save the report to S3
  // ---------------------------------------------------------------------------

  // Parameters for S3
  const s3_params = {
    Body: JSON.stringify(scanResults, null, 2), 
    Bucket: process.env.S3_BUCKET_NAME, 
    Key: `${new Date().getTime()}.json`
  };
  
  // Save the report
  try {
    await s3.send(new PutObjectCommand(s3_params));
    console.log(`Successfully saved the report to "${process.env.S3_BUCKET_NAME}"`);
    console.log(`Report filename: "${s3_params.Key}"`);
  } catch (err) {
    console.log(err);
  }
  
  // ---------------------------------------------------------------------------
  // Clear-out the table
  // ---------------------------------------------------------------------------
  await deleteEntries(scanResults);
};


async function deleteEntries(entries) {
  while (entries.length > 0) {
    const entry = entries.pop();
    const params = {
      Key: {
        "id": entry.id
      },
      TableName: process.env.DDB_TABLE_NAME
    };
    console.log(`deleting: ${entry.id}`);
    // Delete the entry
    await ddb.send(new DeleteCommand(params));
  }
}
