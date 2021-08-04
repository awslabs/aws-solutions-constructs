import * as cdk from '@aws-cdk/core';

export interface AwsApigatewayS3Props {
  // Define construct properties here
}

export class AwsApigatewayS3 extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: AwsApigatewayS3Props = {}) {
    super(scope, id);

    // Define construct contents here
  }
}
