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
const s3 = new aws.S3();
const ddb = new aws.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
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
    await s3.putObject(s3_params).promise();
    console.log(`Successfully saved the report to "${process.env.S3_BUCKET_NAME}"`);
    console.log(`Report filename: "${s3_params.Key}"`);
  } catch (err) {
    console.log(err);
  }
  
  // ---------------------------------------------------------------------------
  // Clear-out the table
  // ---------------------------------------------------------------------------
  deleteEntries(scanResults);
};

/**
 * Method to delete an entry from the DynamoDB table using recursion. Takes an 
 * array of entries, pops the array and deletes the popped item before repeating
 * until the array is reduced to 0 indices.
 * @param {array} entries - an array of entries
 */
const deleteEntries = (entries) => {
  if (entries.length > 0) {
    const entry = entries.pop();
    const params = {
      Key: {
        "id": entry.id
      },
      TableName: process.env.DDB_TABLE_NAME
    };
    // Delete the entry
    ddb.delete(params, function(err, data) {
      if (err) console.log(err);
      else {
        console.log(data);
        deleteEntries(entries);
      }
    });
  }
}
