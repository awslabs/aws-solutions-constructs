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

import { CloudFrontToApiGatewayToLambda, CloudFrontToApiGatewayToLambdaProps } from "../lib";
import * as cdk from "aws-cdk-lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as s3 from "aws-cdk-lib/aws-s3";
import { Template } from 'aws-cdk-lib/assertions';

function deployNewFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: 'index.handler'
  };

  return new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    lambdaFunctionProps
  });
}

function useExistingFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  return new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    existingLambdaObj: new lambda.Function(stack, 'MyExistingFunction', lambdaFunctionProps)
  });
}

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: CloudFrontToApiGatewayToLambda = deployNewFunc(stack);

  expect(construct.cloudFrontWebDistribution).toBeDefined();
  expect(construct.apiGateway).toBeDefined();
  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.cloudFrontFunction).toBeDefined();
  expect(construct.cloudFrontLoggingBucket).toBeDefined();
  expect(construct.apiGatewayCloudWatchRole).toBeDefined();
  expect(construct.apiGatewayLogGroup).toBeDefined();
});

test('check lambda function properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testcloudfrontapigatewaylambdaLambdaFunctionServiceRoleCB74590F",
        "Arn"
      ]
    },
    Runtime: "nodejs16.x",
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test('check lambda function role for deploy: false', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    ManagedPolicyArns: [
      {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          ]
        ]
      }
    ]
  });
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: CloudFrontToApiGatewayToLambdaProps = {
  };

  try {
    new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check no prop', () => {
  const stack = new cdk.Stack();

  const props: CloudFrontToApiGatewayToLambdaProps = {
  };

  try {
    new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('override api gateway properties with existingLambdaObj', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: 'index.handler'
  };

  const fn: lambda.Function = new lambda.Function(stack, 'MyExistingFunction', lambdaFunctionProps);

  new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    existingLambdaObj: fn,
    apiGatewayProps: {
      description: "Override description"
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::RestApi',
    {
      Description: "Override description",
      EndpointConfiguration: {
        Types: [
          "REGIONAL"
        ]
      },
      Name: "LambdaRestApi"
    });
});

test('override api gateway properties without existingLambdaObj', () => {
  const stack = new cdk.Stack();

  new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler'
    },
    apiGatewayProps: {
      endpointConfiguration: {
        types: [api.EndpointType.PRIVATE],
      },
      description: "Override description"
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::RestApi',
    {
      Description: "Override description",
      EndpointConfiguration: {
        Types: [
          "PRIVATE"
        ]
      },
      Name: "LambdaRestApi"
    });
});

test('Cloudfront logging bucket with destroy removal policy and auto delete objects', () => {
  const stack = new cdk.Stack();

  new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler'
    },
    apiGatewayProps: {
      endpointConfiguration: {
        types: [api.EndpointType.PRIVATE],
      }
    },
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    OwnershipControls: { Rules: [ { ObjectOwnership: "ObjectWriter" } ] },
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "testcloudfrontapigatewaylambdaCloudFrontToApiGatewayCloudfrontLoggingBucket7F467421"
    }
  });
});

test('Cloudfront logging bucket error when providing existing log bucket and logBucketProps', () => {
  const stack = new cdk.Stack();
  const logBucket = new s3.Bucket(stack, 'cloudfront-log-bucket', {});

  const app = () => { new CloudFrontToApiGatewayToLambda(stack, 'cloudfront-s3', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler'
    },
    apiGatewayProps: {
      endpointConfiguration: {
        types: [api.EndpointType.PRIVATE],
      }
    },
    cloudFrontLoggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    },
    cloudFrontDistributionProps: {
      logBucket
    },
  });
  };

  expect(app).toThrowError();
});

test('Confirm CheckLambdaProps is being called', () => {
  const stack = new cdk.Stack();
  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: CloudFrontToApiGatewayToLambdaProps = {
    existingLambdaObj,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  };

  const app = () => {
    new CloudFrontToApiGatewayToLambda(stack, 'cf-test-apigateway-lambda', props);
  };
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test("Confirm CheckCloudFrontProps is being called", () => {
  const stack = new cdk.Stack();

  expect(() => {
    new CloudFrontToApiGatewayToLambda(stack, "test-cloudfront-apigateway-lambda", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      insertHttpSecurityHeaders: true,
      responseHeadersPolicyProps: {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(63072),
            includeSubdomains: true,
            override: false,
            preload: true
          }
        }
      }
    });
  }).toThrowError('responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.');
});
