var AWS = require('aws-sdk');
var path = require('path');

console.log('Loading function');

var esDomain = {
    endpoint: process.env.DOMAIN_ENDPOINT,
    region: process.env.AWS_REGION,
    index: 'records',
    doctype: 'movie'
};

var creds = new AWS.EnvironmentCredentials('AWS');
var endpoint =  new AWS.Endpoint(esDomain.endpoint);

function postDocumentToES(doc, context) {
    var req = new AWS.HttpRequest(endpoint);

    req.method = 'POST';
    req.path = path.join('/', esDomain.index, esDomain.doctype);
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
            console.log('All movie records added to ES.');
            context.succeed();
        });
    }, function(err) {
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