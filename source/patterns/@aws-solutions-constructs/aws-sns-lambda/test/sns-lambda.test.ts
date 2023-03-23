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

import { SnsToLambda, SnsToLambdaProps } from "../lib";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';

function deployNewFunc(stack: cdk.Stack) {
  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
  };

  return new SnsToLambda(stack, 'test-sns-lambda', props);
}

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: SnsToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.snsTopic !== null);
});

test('override topicProps', () => {
  const stack = new cdk.Stack();

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    topicProps: {
      topicName: "custom-topic"
    }
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
});

test('provide existingTopicObj', () => {
  const stack = new cdk.Stack();

  const topic = new sns.Topic(stack, 'MyTopic', {
    topicName: "custom-topic"
  });

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    existingTopicObj: topic
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
});

test('Topic is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new cdk.Stack();
  const cmk = new kms.Key(stack, 'cmk');
  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    encryptionKey: cmk
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with imported CMK when set on topicProps.masterKey prop', () => {
  const stack = new cdk.Stack();
  const cmk = new kms.Key(stack, 'cmk');
  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    topicProps: {
      masterKey: cmk
    }
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with provided encrytionKeyProps', () => {
  const stack = new cdk.Stack();

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testsnslambdaEncryptionKeyDDDF040B',
        'Arn'
      ]
    },
  });

  template.hasResourceProperties('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'testsnslambdaEncryptionKeyDDDF040B',
        'Arn'
      ]
    }
  });
});

test('Topic is encrypted by default with AWS-managed KMS key when no other encryption properties are set', () => {
  const stack = new cdk.Stack();

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

test('Topic is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new cdk.Stack();

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    enableEncryptionWithCustomerManagedKey: true
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testsnslambdaEncryptionKeyDDDF040B',
        'Arn'
      ]
    },
  });
});
