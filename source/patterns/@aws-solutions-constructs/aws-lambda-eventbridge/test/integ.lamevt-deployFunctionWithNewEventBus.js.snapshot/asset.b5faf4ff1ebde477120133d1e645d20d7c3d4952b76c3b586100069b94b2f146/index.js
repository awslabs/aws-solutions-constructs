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
const eventbridge = new aws.EventBridge();
exports.handler = () => {
  const params = {
    Entries: [{
      EventBusName: process.env.EVENTBUS_NAME,
      Source: 'solutionsconstructs',
      DetailType: 'test',
      Detail: JSON.stringify({
        Hello: 'World'
      })
    }]
  };
  eventbridge.putEvents(params, function (err, data) {
    if (err) {
      throw Error('An error while putting the event.');
    } else {
      console.log('Event was successfully sent.');
    }
  });
};