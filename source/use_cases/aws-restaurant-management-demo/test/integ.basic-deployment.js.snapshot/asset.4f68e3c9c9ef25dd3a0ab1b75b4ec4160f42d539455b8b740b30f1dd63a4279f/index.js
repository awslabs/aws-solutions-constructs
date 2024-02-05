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

exports.handler = async (event) => {
  
  // ---------------------------------------------------------------------------
  // Retrieve a report from the bucket
  // ---------------------------------------------------------------------------
  
  // Setup the parameters
  const req = JSON.parse(event.body);
  const params = {
    Bucket: process.env.S3_BUCKET_NAME, 
    Key: req.filename
   };
  
  // Get the report
  try {
    const res = await s3.getObject(params).promise();
    const parsed = res.Body.toString('utf-8');
    console.log(parsed);
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: parsed,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
  catch (err) {
    console.log(err);
  }
}
