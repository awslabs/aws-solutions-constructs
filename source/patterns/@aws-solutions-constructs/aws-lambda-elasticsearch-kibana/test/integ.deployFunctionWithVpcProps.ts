/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import { App, Stack } from "@aws-cdk/core";
import { LambdaToElasticSearchAndKibana } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
// import * as ec2 from '@aws-cdk/aws-ec2';

// Setup
const app = new App();

// https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/VpcProps.html
// Be aware that environment-agnostic stacks will be created with access to only 2 AZs,
// so to use more than 2 AZs, be sure to specify the account and region on your stack.
const stack = new Stack(app, 'test-lambda-elasticsearch-kibana-stack5', {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  }
});

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'index.handler',
};

const vpcProps = {
  maxAzs: 3
};

new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana5', {
  lambdaFunctionProps: lambdaProps,
  domainName: "deploywithvpcpropstest",
  deployVpc: true,
  vpcProps
});

// Synth
app.synth();
// tslint:disable-next-line:max-line-length
// sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZG9tYWluLWFyZ3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVnLmRvbWFpbi1hcmd1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7OztHQVdHOztBQUVILGdCQUFnQjtBQUNoQix3Q0FBZ0Q7QUFDaEQsZ0NBQXdEO0FBQ3hELDhDQUE4QztBQUU5QyxRQUFRO0FBQ1IsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFHLEVBQUUsQ0FBQztBQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLFlBQUssQ0FBQyxHQUFHLEVBQUUseUNBQXlDLENBQUMsQ0FBQztBQUV4RSxNQUFNLFdBQVcsR0FBeUI7SUFDeEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsU0FBUyxTQUFTLENBQUM7SUFDbEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztJQUNuQyxPQUFPLEVBQUUsZUFBZTtDQUN6QixDQUFDO0FBRUYsTUFBTSxRQUFRLEdBQUcsU0FBUyxHQUFHLFVBQUcsQ0FBQyxVQUFVLENBQUM7QUFDNUMsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsSUFBSSxvQ0FBOEIsQ0FBQyxLQUFLLEVBQUUsbUNBQW1DLEVBQUU7SUFDN0UsbUJBQW1CLEVBQUUsV0FBVztJQUNoQyxVQUFVLEVBQUUsUUFBUTtJQUNwQixpQkFBaUIsRUFBRSxhQUFhO0NBQ2pDLENBQUMsQ0FBQztBQUVILFFBQVE7QUFDUixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqICBDb3B5cmlnaHQgMjAyMSBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFU1xuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8vLyAhY2RrLWludGVnICpcbmltcG9ydCB7IEFwcCwgU3RhY2ssIEF3cyB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XG5pbXBvcnQgeyBMYW1iZGFUb0VsYXN0aWNTZWFyY2hBbmRLaWJhbmEgfSBmcm9tIFwiLi4vbGliXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnQGF3cy1jZGsvYXdzLWxhbWJkYSc7XG5cbi8vIFNldHVwXG5jb25zdCBhcHAgPSBuZXcgQXBwKCk7XG5jb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHAsICd0ZXN0LWxhbWJkYS1lbGFzdGljc2VhcmNoLWtpYmFuYS1zdGFjazInKTtcblxuY29uc3QgbGFtYmRhUHJvcHM6IGxhbWJkYS5GdW5jdGlvblByb3BzID0ge1xuICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoYCR7X19kaXJuYW1lfS9sYW1iZGFgKSxcbiAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEyX1gsXG4gIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJ1xufTtcblxuY29uc3QgZXNEb21haW4gPSAnZG9tYWluLScgKyBBd3MuQUNDT1VOVF9JRDtcbmNvbnN0IGNvZ25pdG9Eb21haW4gPSAnZG9tYWluYXJndW1lbnRzZG9tYWluJztcblxubmV3IExhbWJkYVRvRWxhc3RpY1NlYXJjaEFuZEtpYmFuYShzdGFjaywgJ3Rlc3QtbGFtYmRhLWVsYXN0aWNzZWFyY2gta2liYW5hMicsIHtcbiAgbGFtYmRhRnVuY3Rpb25Qcm9wczogbGFtYmRhUHJvcHMsXG4gIGRvbWFpbk5hbWU6IGVzRG9tYWluLFxuICBjb2duaXRvRG9tYWluTmFtZTogY29nbml0b0RvbWFpblxufSk7XG5cbi8vIFN5bnRoXG5hcHAuc3ludGgoKTtcbiJdfQ==