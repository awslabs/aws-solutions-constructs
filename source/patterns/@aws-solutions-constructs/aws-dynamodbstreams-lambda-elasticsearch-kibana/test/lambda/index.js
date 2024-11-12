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

var AWS = require('aws-sdk');
var path = require('path');

console.log('Loading function');

var esDomain = {
    endpoint: process.env.DOMAIN_ENDPOINT,
    region: process.env.AWS_REGION,
    index: 'lambda-index',
    doctype: 'lambda-type'
};

var creds = new AWS.EnvironmentCredentials('AWS');
var endpoint =  new AWS.Endpoint(esDomain.endpoint);

function postDocumentToES(doc, context, id) {
    var req = new AWS.HttpRequest(endpoint);

    req.method = 'POST';
    req.path = path.join('/', esDomain.index, esDomain.doctype, id);
    req.region = esDomain.region;
    req.body = doc;
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = esDomain.endpoint;
    req.headers['Content-Type'] = 'application/json';

    // Sign the request (Sigv4)
    var signer = new AWS.Signers.V4(req, 'es');
    signer.addAuthorization(creds, new Date());

    // Post document to ES
    var send = new AWS.NodeHttpClient();
    send.handleRequest(req, null, function(httpResp) {
        var body = '';
        httpResp.on('data', function (chunk) {
            body += chunk;
        });        
        httpResp.on('end', function (chunk) {
            console.log('DynamoDB record added to ES.');
            context.succeed();
        });
    }, function(err) {
        console.log('Error: ' + err);
        context.fail();
    });
}

exports.handler = (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    let count = 0;

    event.Records.forEach((record) => {
        const id = record.dynamodb.Keys.id.S;
        
        if (record.dynamodb.NewImage) {
            postDocumentToES(JSON.stringify(record.dynamodb.NewImage), context, id);
        }

        count += 1
    });

    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: `${count} records processed.\n`
    };
};