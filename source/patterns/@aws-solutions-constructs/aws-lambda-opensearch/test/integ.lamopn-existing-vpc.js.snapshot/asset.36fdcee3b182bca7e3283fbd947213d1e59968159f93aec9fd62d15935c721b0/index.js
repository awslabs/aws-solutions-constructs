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

var openSearchDomain = {
    endpoint: process.env.DOMAIN_ENDPOINT,
    region: process.env.AWS_REGION,
    index: 'records',
    doctype: 'movie'
};

var creds = new AWS.EnvironmentCredentials('AWS');
var endpoint = new AWS.Endpoint(openSearchDomain.endpoint);

function postDocumentToOpenSearch(doc, context) {
    var req = new AWS.HttpRequest(endpoint);

    req.method = 'POST';
    req.path = path.join('/', openSearchDomain.index, openSearchDomain.doctype);
    req.region = openSearchDomain.region;
    req.body = doc;
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = openSearchDomain.endpoint;
    req.headers['Content-Type'] = 'application/json';

    // Sign the request (Sigv4)
    var signer = new AWS.Signers.V4(req, 'es');
    signer.addAuthorization(creds, new Date());

    // Post document to the OpenSearch Service
    var send = new AWS.NodeHttpClient();

    send.handleRequest(req, null, (httpResp) => {
        var body = '';
        httpResp.on('data', (chunk) => {
            body += chunk;
        });
        httpResp.on('end', (chunk) => {
            console.log('All movie records added to the OpenSearch Service.');
            context.succeed();
        });
    }, (err) => {
        console.log('Error: ' + err);
        context.fail();
    });
}

exports.handler = (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    postDocumentToOpenSearch("{ \"title\": \"Moby Dick\" }", context);
    postDocumentToOpenSearch("{ \"title\": \"A Tale of Two Cities\" }", context);
    postDocumentToOpenSearch("{ \"title\": \"The Phantom of the Opera\" }", context);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: `Hello from AWS Solutions Constructs!\n`
    };
};