var AWS = require('aws-sdk');

const { fromEnv } = require('@aws-sdk/credential-providers');

var path = require('path');

console.log('Loading function');

var openSearchDomain = {
    endpoint: process.env.DOMAIN_ENDPOINT,
    region: process.env.AWS_REGION,
    index: 'records',
    doctype: 'movie'
};

var creds = // JS SDK v3 switched credential providers from classes to functions.
// This is the closest approximation from codemod of what your application needs.
// Reference: https://www.npmjs.com/package/@aws-sdk/credential-providers
fromEnv('AWS');
var endpoint = new URL(openSearchDomain.endpoint);

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