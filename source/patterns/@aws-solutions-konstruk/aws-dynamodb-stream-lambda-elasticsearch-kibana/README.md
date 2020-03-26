# aws-dynamodb-stream-lambda-elasticsearch-kibana module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is a _developer preview_ (public beta) module.**
>
> All classes are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---
<!--END STABILITY BANNER-->

| **API Reference**:| <span style="font-weight: normal">http://docs.awssolutionsbuilder.com/aws-solutions-konstruk/latest/api/aws-dynamodb-stream-lambda-elasticsearch-kibana/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png){: style="height:16px;width:16px"} Python|`aws_solutions_konstruk.aws_dynamodb_stream_elasticsearch_kibana`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png){: style="height:16px;width:16px"} Typescript|`@aws-solutions-konstruk/aws-dynamodb-stream-lambda-elasticsearch-kibana`|

This AWS Solutions Konstruk implements Amazon DynamoDB table with stream, AWS Lambda function and Amazon Elasticsearch Service with the least privileged permissions.

Here is a minimal deployable pattern definition:

``` javascript
const { DynamoDBStreamToLambdaToElasticSearchAndKibana, DynamoDBStreamToLambdaToElasticSearchAndKibanaProps } = require('@aws-solutions-konstruk/aws-dynamodb-stream-lambda-elasticsearch-kibana');

const props: DynamoDBStreamToLambdaToElasticSearchAndKibanaProps = {
    deployLambda: true,
    lambdaFunctionProps: {
        code: lambda.Code.asset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
    },
    domainName: 'test-domain'
};

new DynamoDBStreamToLambdaToElasticSearchAndKibana(stack, 'test-dynamodb-stream-lambda-elasticsearch-kibana', props);
```

## Initializer

``` text
new DynamoDBStreamToLambdaToElasticSearchAndKibana(scope: Construct, id: string, props: DynamoDBStreamToLambdaToElasticSearchAndKibanaProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`DynamoDBStreamToLambdaToElasticSearchAndKibanaProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|deployLambda|`boolean`|Whether to create a new Lambda function or use an existing Lambda function|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|Optional user provided props to override the default props for Lambda function|
|dynamoTableProps?|[`dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.TableProps.html)|Optional user provided props to override the default props for DynamoDB Table|
|dynamoEventSourceProps?|[`aws-lambda-event-sources.DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.DynamoEventSourceProps.html)|Optional user provided props to override the default props for DynamoDB Event Source|
|esDomainProps?|[`elasticsearch.CfnDomainProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticsearch.CfnDomainProps.html)|Optional user provided props to override the default props for the Elasticsearch Service|
|domainName|`string`|Domain name for the Cognito and the Elasticsearch Service|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|dynamoTable()|[`dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)|Retruns an instance of dynamodb.Table created by the construct|
|lambdaFunction()|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Retruns an instance of lambda.Function created by the construct|
|userPool()|[`cognito.UserPool`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPool.html)|Retruns an instance of cognito.UserPool created by the construct|
|userPoolClient()|[`cognito.UserPoolClient`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPoolClient.html)|Retruns an instance of cognito.UserPoolClient created by the construct|
|identityPool()|[`cognito.CfnIdentityPool`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.CfnIdentityPool.html)|Retruns an instance of cognito.CfnIdentityPool created by the construct|
|elasticsearchDomain()|[`elasticsearch.CfnDomain`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticsearch.CfnDomain.html)|Retruns an instance of elasticsearch.CfnDomain created by the construct|
|cloudwatchAlarms()|[`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudwatch.Alarm.html)|Retruns a list of cloudwatch.Alarm created by the construct|

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.