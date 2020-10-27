const AWS = require('aws-sdk');
console.log('Loading function');
exports.handler = (event, context) => {

  console.log('Received event:', JSON.stringify(event, null, 2));

  var sagemakerruntime = new AWS.SageMakerRuntime();
  
  var params = {
    Body: Buffer.from(event.data),
    EndpointName: '<Your Sagemaker Endpoint name>',
    Accept: 'application/json',
    ContentType: 'application/json',    
  };
  
  sagemakerruntime.invokeEndpoint(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
};