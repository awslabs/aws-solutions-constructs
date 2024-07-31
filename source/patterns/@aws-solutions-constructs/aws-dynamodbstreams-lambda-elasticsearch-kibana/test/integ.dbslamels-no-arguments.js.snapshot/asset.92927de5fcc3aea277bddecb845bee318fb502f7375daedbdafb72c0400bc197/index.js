var AWS = require('aws-sdk');

const { fromEnv } = require('@aws-sdk/credential-providers');

var path = require('path');

console.log('Loading function');

var esDomain = {
    endpoint: process.env.DOMAIN_ENDPOINT,
    region: process.env.AWS_REGION,
    index: 'lambda-index',
    doctype: 'lambda-type'
};

var creds = // JS SDK v3 switched credential providers from classes to functions.
// This is the closest approximation from codemod of what your application needs.
// Reference: https://www.npmjs.com/package/@aws-sdk/credential-providers
fromEnv('AWS');
var endpoint =  new URL(esDomain.endpoint);

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