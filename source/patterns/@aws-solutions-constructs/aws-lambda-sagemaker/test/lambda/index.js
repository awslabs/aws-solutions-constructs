const aws = require('aws-sdk');
console.log('Loading function');
exports.handler = () => {
  var params = {
    NotebookInstanceName: process.env.NOTEBOOK_NAME /* required */
  };
  const sagemaker = new aws.SageMaker;
  sagemaker.describeNotebookInstance(params, function(err, data) {
    if (err) throw('Error') // an error occurred
    else     console.log(data); // successful response
  });
};