const aws = require('aws-sdk');

console.log('Loading function');

exports.handler = () => {
  const params = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify({})
  };
  const stepFunction = new aws.StepFunctions();
  stepFunction.startExecution(params, function (err, data) {
    if (err) {
      throw Error('An error occurred executing the step function.');
    } else {
      console.log('Step function was successfully executed.');
    }
  })
};