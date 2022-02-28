# Design Guidelines

# Solutions Constructs Design Guidelines

One of the Solutions Constructs tenets states:

> **Constructs are Consistent** - once customers are familiar with the use of Constructs, they can adopt additional constructs easily. Customers familiar with using the CDK can easily adopt Constructs.

This document defines the ways in which Constructs are consistent. These rules have emerged as we built the original Solutions Constructs, and not every Solutions Construct adheres to every rule. We will go back and refactor non-compliant constructs over time, as we can do so without making breaking changes. When proposing a Solutions Construct, use this document to drive your design.

## Overall Guidelines

**Constructs Can Be Self Contained**

While passing an existing resource to Construct is essential to the ability to link Constructs together, it should never be required. If your Construct requires the client to create a resource to pass in as an argument to the constructor then you have probably not defined your Construct correctly or what you are designing is not a good fit for the Solutions Constructs library.

**Constructs should be decomposed to their smallest architecture**

To make a Construct as flexible as possible, it should perform a single architectural task. For instance, a consistent Solutions Construct would not combine an Event rule with a Lambda function with an DynamoDB table because that would not be a single architectural task. These three services would be used to create 2 Solutions Constructs, an Event Rules with a Lambda function, and a Lambda function with a DynamoDB table. A client could use these constructs to perform the original task, but other constructs could use either construct in completely different workloads. While this rule often means a Construct deploys 2 services, there may be situations where the smallest architectural task requires 3 or more services.

**Use CDK definitions to define a service or resource**

The construct should not create new classes or interfaces to describe services or resources. Although the new class may seem simpler now, as new capabilities are added to the construct the new class will acquire new properties – the ultimate result would be something equivalent to the CDK definition, but not compatible. The CDK definitions are well thought out and interact predictably with other CDK constructs, use them. If you want a client the ability to specify a few attributes of a ConstructProps without specifying every required value, then make the type of that attribute ConstructProps | any. This pattern exists several places in the Solutions Constructs library.

Another practice that this rule prohibits is putting specific attributes of sub resources in your Solutions Constructs Props object. For instance - if your VPC needs an Internet Gateway, then the client should send VPC Props that create the Internet Gateway, don't create a property at in your Construct Props object of InternetGateway: true.

**The client should have the option (but not requirement) to provide any props used within the construct**

When you supply a CDK defined props object to any CDK constructor within your construct (L1 or L2), your construct should be able to generate all the default values required to create that L1 or L2 construct. Alternatively, the client should be able to override any or all of those default props values to completely customize the construct.

There are exceptions to this rule. The Lambda Function L2 construct, for instance, cannot specify a default value for the Lambda code – the client must provide this. Also, at times the workings of the construct require specific props values to work. In this situation, those values will override user provided values. In general, the props values sent to a CDK constructor are generated like this:

```
let actualProps = overrideProps(defaultProps, userProvidedProps);
actualProps = overrideProps(actualProps, constructRequiredProps)
```

Construct required props should be minimized and listed in the README.md file for the Construct.
There is a possibility that the client could specify some props values that are incompatible with default props values.  That is the responsibility of the client – if they choose to not use the default implementation then they take responsibility for the configuration they specify.

**The Minimal Deployable Pattern Definition should be minimal**

While a client should have great flexibility to fully specify how a Construct is deployed, the minimal deployment should consist of a single new statement. At times things like table schema might require some additional code – but if your minimal deployable solution is more than a couple lines long or requires creating one or more services first then your construct is outside the patterns for the library.

**No Business Logic**

The Construct should be restricted to deploying infrastructure. In general this means no schema and no code (eg – no implemented Lambda functions). We don’t rule out the idea that some future use case will require a Lambda function to accomplish an architectural need, but we have not seen that yet. Avoid including coded Lambda functions in your construct unless you’ve talked to us in advance to avoid disappointment.

**Favor L2 CDK Constructs over L1**

L1 CDK constructs are merely thin code wrappers over the raw CloudFormation definitions – they bring little if any additional value to the table. L2 CDK constructs provide additional functionality, security and interoperability. Whenever possible, Solutions Constructs interfaces should speak in terms of L2 CDK constructs. If your definition includes L1 constructs it may not be rejected, but you will be asked to explain the reasons requiring their use. 

## VPCs

Clients may choose to deploy their architectures for any number of reasons. VPC capability should be added to constructs when traffic within the construct can be restricted within a VPC. For instance, for the construct aws-lambda-sqs, traffic from the lambda function can be configured to use an ENI in a VPC, and an Interface Endpoint for SQS can accept those calls within that VPC - so the traffic stays within the VPC. Conversely, aws-sqs-lambda cannot be configured within a VPC because the traffic consists of Lambda polling SQS and invoking the Lambda function synchronously, none of which can be configured within a VPC (although calls between AWS resources stay on the AWS backbone and do not hit the open web).

## Naming

The name of a Solutions Construct is composed by concatenating the names of the individual services or resources configured by the construct. When it is obvious what resource is being deployed by the service, use just the service name, such as SQS, SNS, DynamoDB, etc. When just the service name is ambiguous, append the specific resource type to the service name, such as SagemakerEndpoint (also do this for a different flavor of an already deployed service, such as DynamoDBStream).

For the service name, separate the all lower-case service names by dashes and preface the whole name with “aws-“. For Example:

&emsp; &emsp; &emsp;aws-s3-lambda
&emsp; &emsp; &emsp;aws-apigateway-sagemakerendpoint

For the Typescript class name, use Pascal casing and concatenate the names separated by “To”. For Example:

&emsp; &emsp; &emsp;S3ToLambda
&emsp; &emsp; &emsp;ApigatewayToSagemakerendpoint

Once again, these rules became clear as we wrote all of the existing constructs and not all of the early constructs comply with these rules.

# Service Usage in Constructs
It's important for consistency that services are implemented consistently across Solutions Constructs – that clients specify the same properties for a Lambda function in aws-s3-lambda and aws-sqs-lambda. This section specifies the require attributes on your Construct Props interface for each service currently in the library, as well as the reasons behind any exceptions. We are unlikely to approve a construct with additional attributes, although we may if the proposed new attribute is appropriate for us to implement across all constructs using that service.

If you are creating a construct that uses a service for the first time, defining the appropriate interface is a key step and we will work with you.

This version of the document also lists what Constructs currently violate these standards and whether making the object compliant would be a breaking change.

Existing Inconsistencies would not be published, that’s for our internal use – only the Required Properties and Attributes on Props would be published as requirements (along with specific notes).
 

## API Gateway
**Required Attributes on Props**

| Name| Type | Description | Notes |
| --- | --- | --- | --- |
| apiGatewayProps| [`api.RestApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApiProps.html)|Optional user-provided props to override the default props for the API Gateway.|aws-cloudfront-apigateway is an exception (Covered below). ||
| allow*Name*Operation/*Name*OperationTemplate| `boolean`| Whether to deploy API Gateway Method for *Name* operation on *Target*.|Required in pairs for integration with DDB and SQS. |
| logGroupProps? | [`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.| |

**Required Construct Properties**

| Name    | Type   | Description | Notes    |
| --- | --- | --- | ---|
| apiGateway	| [`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|Returns an instance of the api.RestApi created by the construct.| |
|apiGatewayCloudwatchRole	|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway for CloudWatch access.| |
| apiGatewayLogGroup	|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for API Gateway access logging to CloudWatch.|
| apiGatewayRole| [`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway.| |

## Application Load Balancer
**Required Attributes on Props**

| Name    | Type  | Description | Notes    |
| --- | --- | --- | --- |
| loadBalancerProps?| [`elasticloadbalancingv2.ApplicationLoadBalancer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html)	| Optional custom properties for a new loadBalancer. Providing both this and existingLoadBalancer is an error. This cannot specify a VPC, it will use the VPC in existingVpc or the VPC created by the construct. |
| existingLoadBalancerObj? | [`elasticloadbalancingv2.ApplicationLoadBalancer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html)  | Existing Application Load Balancer to incorporate into the construct architecture. Providing both this and loadBalancerProps is an error. The VPC containing this loadBalancer must match the VPC provided in existingVpc. |
| listenerProps? | [`elasticloadbalancingv2.ApplicationListenerProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationListenerProps.html)  | Props to define the listener. Must be provided when adding the listener to an ALB (eg - when creating the alb), may not be provided when adding a second target to an already established listener. When provided, must include either a certificate or protocol: HTTP. |
| targetProps? | [`elasticloadbalancingv2.ApplicationTargetGroupProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationTargetGroupProps.html) | Optional custom properties for a new target group. While this is a standard attribute of props for ALB constructs, there are few pertinent properties for a Lambda target. |
| ruleProps? | [`elasticloadbalancingv2.AddRuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.AddRuleProps.html) | Rules for directing traffic to the target being created. May not be specified for the first listener added to an ALB, and must be specified for the second target added to a listener. Add a second target by instantiating this construct a second time and providing the existingAlb from the first instantiation. |
| logAlbAccessLogs? | `boolean` | Whether to turn on Access Logs for the Application Load Balancer. Uses an S3 bucket with associated storage costs.Enabling Access Logging is a best practice. Defaults to `true`. |
| albLoggingBucketProps? | [`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html) | Optional properties to customize the bucket used to store the ALB Access Logs. Supplying this and setting logAccessLogs to false is an error. Default to none. |
| publicApi | `boolean` | Whether the construct is deploying a private or public API. This has implications for the VPC and ALB. |

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- | --- |
| loadBalancer | [elasticloadbalancingv2.ApplicationLoadBalancer](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html) | The Load Balancer used by the construct (whether created by the construct or provided by the client). |
|vpc | [ec2.IVpc](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html)| The VPC used by the construct (whether created by the construct or provided by the client). |
| listener? | [elasticloadbalancingv2.ApplicationListener](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationListener.html)|  The listener used by this pattern. | Required only if the pattern requires a listener (eg - This is not set by aws-route53-alb). |

## CloudFront
**Required Attributes on Props**

| Name    | Type   | Description | Notes    |
| --- | --- | --- | --- |
| cloudFrontDistributionProps?	| [`cloudfront.DistributionProps \| any`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.DistributionProps.html)|Optional user provided props to override the default props for CloudFront Distribution.| |
| insertHttpSecurityHeaders?|`boolean`|Optional user provided props to turn on/off the automatic injection of best practice HTTP security headers in all responses from CloudFront|
| cloudFrontLoggingBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the CloudFront Logging Bucket.|

**Required Construct Properties**

| Name    | Type | Description | Notes |
| --- | --- | --- | --- |
| cloudFrontLoggingBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html)|Returns an instance of the logging bucket for CloudFront WebDistribution.|
| cloudFrontWebDistribution|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Returns an instance of cloudfront.CloudFrontWebDistribution created by the construct.| |
| cloudFrontFunction?|[`cloudfront.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.Function.html)|Returns an instance of the Cloudfront function created by the pattern.| |

## DynamoDB
**Required Attributes on Props**

| Name    | Type  | Description | Notes    |
| --- | --- | --- | --- |
| dynamoTableProps?	| [`dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.TableProps.html)|Optional user provided props to override the default props for DynamoDB Table.|
|existingTableInterface?|[`dynamodb.ITable`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.ITable.html)|Existing instance of DynamoDB table object or interface, providing both this and `dynamoTableProps` will cause an error.| Use this instead of `existingTableObj` to support a table object or interface.|
| existingTableObj?	| [`dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)|Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.| This attribute is deprecated, please use `existingTableInterface`.|
| tablePermissions?	|`string`|Optional table permissions to grant to the Lambda function. One of the following may be specified: `All`, `Read`, `ReadWrite`, `Write`.| Required only where DynamoDB is a data store being accessed by the construct.|
| dynamoEventSourceProps?| [`aws-lambda-event-sources.DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.DynamoEventSourceProps.html)| Optional user provided props to override the default props for DynamoDB Event Source. | Required only where DynamoDB is invoking other services (DynamoDB Streams). |

**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
|dynamoTableInterface|[`dynamodb.ITable`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.ITable.html)|Returns an instance of `dynamodb.ITable` created by the construct.|
|dynamoTable?|[`dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)|Returns an instance of `dynamodb.Table` created by the construct. IMPORTANT: If existingTableInterface was provided in Pattern Construct Props, this property will be `undefined`.|

## ElasticSearch
**Required Attributes on Props**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| esDomainProps?| [`elasticsearch.CfnDomainProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticsearch.CfnDomainProps.html)|Optional user provided props to override the default props for the Elasticsearch Service.|
| domainName | `string`	| Domain name for the Cognito and the Elasticsearch Service. |


**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| elasticsearchDomain |[`elasticsearch.CfnDomain`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticsearch.CfnDomain.html)|Returns an instance of `elasticsearch.CfnDomain` created by the construct.|
| elasticsearchDomainRole |[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of `iam.Role` created by the construct for `elasticsearch.CfnDomain`.|

## EventBridge
**Required Attributes on Props**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| eventRuleProps | [`events.RuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.RuleProps.html)|User provided eventRuleProps to override the defaults. |
| existingEventBusInterface? | [`events.IEventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.IEventBus.html)| Optional user-provided custom EventBus for construct to use. Providing both this and `eventBusProps` results an error.|
| eventBusProps?	| [`events.EventBusProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.EventBusProps.html)|Optional user-provided properties to override the default properties when creating a custom EventBus. Setting this value to `{}` will create a custom EventBus using all default properties. If neither this nor `existingEventBusInterface` is provided the construct will use the `default` EventBus. Providing both this and `existingEventBusInterface` results an error.|

**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| eventsRule | [`events.Rule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.Rule.html)|Returns an instance of `events.Rule` created by the construct. |
| eventBus?	| [`events.IEventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.IEventBus.html)|Returns the instance of `events.IEventBus` used by the construct| Required only for non-default Event Buses.|

## Firehose
**Required Attributes on Props**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| kinesisFirehoseProps?	| [`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.StreamProps.html)|Optional user-provided props to override the default props for the Kinesis stream. ||

**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| kinesisFirehose|[`kinesisfirehose.CfnDeliveryStream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesisfirehose.CfnDeliveryStream.html)|Returns an instance of `kinesisfirehose.CfnDeliveryStream` created by the construct.|
| kinesisFirehoseRole| [`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the `iam.Role` created by the construct for Kinesis Data Firehose delivery stream.|
| kinesisFirehoseLogGroup| [`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)|Returns an instance of the `logs.LogGroup` created by the construct for Kinesis Data Firehose delivery stream.|

## IoT
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- | --- |
| iotEndpoint	| `string`|The AWS IoT endpoint subdomain to integrate the API Gateway with (e.g a1234567890123-ats).	| Required only when IoT is *downstream* (e.g. – aws-apigateway-iot). |
| iotTopicRuleProps	| [`iot.CfnTopicRuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iot.CfnTopicRuleProps.html)|User provided CfnTopicRuleProps to override the defaults.| Required only when iot is *upstream* (eg – aws-iot-lambda). |

**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| iotActionsRole | [`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the `iam.Role` created by the construct for IoT Rule.| Required when IoT is upstream. |
| iotTopicRule | [`iot.CfnTopicRule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iot.CfnTopicRule.html)|Returns an instance of `iot.CfnTopicRule` created by the construct. | Required when IoT is upstream.|

## Kinesis Streams
**Required Attributes on Props**

| Name    | Type  | Description | Notes    |
| --- | --- | --- | --- |
| existingStreamObj?|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html)|Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.|
| kinesisStreamProps?| [`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.StreamProps.html)|Optional user-provided props to override the default props for the Kinesis stream.||
|createCloudWatchAlarms|`boolean`|Whether to create recommended CloudWatch alarms for Kinesis Data Stream. Defaults to `true`. |

**Required Construct Properties**

| Name    | Type | Description | Notes    |
| --- | --- | --- | --- |
| kinesisStream	| [`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html)|Returns an instance of the Kinesis stream created or used by the pattern.|
| kinesisStreamRole	| [`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for Kinesis stream	| Required only when Kinesis is upstream (because then the role is important to the construct). |

## Lambda
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- | --- |
| existingLambdaObj?	|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.||
| lambdaFunctionProps?	|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|Optional user provided props to override the default props for the Lambda function.||

**Required Construct Properties**

| Name    | Type     |  Description | Notes    |
| --- | --- | --- | --- |
| lambdaFunction	|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of the Lambda function used in the pattern.|

## Route53
**Required Attributes on Props**

| Name    | Type     |   Description | Notes    |
| --- | --- | --- | --- |
| privateHostedZoneProps? | [route53.PrivateHostedZoneProps](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.PrivateHostedZoneProps.html) | Optional custom properties for a new Private Hosted Zone. Cannot be specified for a public API. Cannot specify a VPC, it will use the VPC in existingVpc or the VPC created by the construct. Providing both this and existingHostedZoneInterface is an error. |
| existingHostedZoneInterface? | [route53.IHostedZone](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.IHostedZone.html) | Existing Public or Private Hosted Zone (type must match publicApi setting). Specifying both this and privateHostedZoneProps is an error. If this is a Private Hosted Zone, the associated VPC must be provided as the existingVpc property |
| publicApi | `boolean` | Whether the construct is deploying a private or public API. This has implications for the Hosted Zone, VPC and ALB. |

**Required Construct Properties**

| Name    | Type     |  Description | Notes    |
| --- | --- | --- | --- |
| hostedZone | [route53.IHostedZone](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.IHostedZone.html) | The hosted zone used by the construct (whether created by the construct or provided by the client). |

## S3
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- | --- |
| existingBucketInterface? | [`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Existing S3 Bucket interface. Providing this property and `bucketProps` results in an error. | Use this instead of `existingBucketObj` to support a table object or interface.|
| existingBucketObj? | [`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Existing instance of S3 Bucket object. If this is provided, then also providing bucketProps is an error. | Deprecated, please use `existingBucketInterface`.|
| bucketProps? | [`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the S3 Bucket. |
| s3EventTypes?	| [`s3.EventType[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.EventType.html)|The S3 event types that will trigger the notification. Defaults to `s3.EventType.OBJECT_CREATED`	| Required only when construct responds to S3 events. |
| s3EventFilters?	| [`s3.NotificationKeyFilter[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.NotificationKeyFilter.html)|S3 object key filter rules to determine which objects trigger this event. If not specified, no filter rules will be applied.|Required only when construct responds to S3 events. |
|loggingBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the S3 Logging Bucket.|
| logS3AccessLogs? | `boolean`| Whether to turn on Access Logs for the S3 bucket with the associated storage costs. Enabling Access Logging is a best practice.|

**Required Construct Properties**

| Name    | Type     |  Description | Notes    |
| --- | --- | --- | --- |
| s3Bucket?	|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)	| If the construct created a new bucket. If an existing bucket interface was submitted, this is `undefined`. |
| s3BucketInterface |[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Returns an instance of `s3.IBucket` created by the construct.|
| s3LoggingBucket	|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)	| Returns an instance of `s3.Bucket` created by the construct as the logging bucket for the primary bucket.|

## SNS
**Required Attributes on Props**

| Name    | Type     |  Description | Notes    |
| --- | --- | --- |--- |
| existingTopicObj?	| [`sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)|An optional, existing SNS topic to be used instead of the default topic. Providing both this and `topicProps` will cause an error|
| topicProps?	| [`sns.TopicProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.TopicProps.html)|Optional user provided properties to override the default properties for the SNS topic.
| enableEncryptionWithCustomerManagedKey?	| `boolean`|Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in the encryptionKey property for this construct.| Sending messages from an AWS service to an encrypted Topic [requires a Customer Master key](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html#compatibility-with-aws-services). Those constructs require these properties.  |
| encryptionKey?		| [`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|An optional, imported encryption key to encrypt the SQS queue, and SNS Topic.|
| encryptionKeyProps?		| [`kms.KeyProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.KeyProps.html)|An optional, user provided properties to override the default properties for the KMS encryption key	|

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| snsTopic	| [`sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)|Returns an instance of the SNS topic created by the pattern. |
| encryptionKey	| [`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|Returns an instance of `kms.Key` used for the SQS queue, and SNS Topic.| Only required when AWS service is writing to the SNS topic (similar to SQS). |

## SQS
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| queueProps?	| [`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user provided props to override the default props for the SQS queue.|
| existingQueueObj?|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Existing SQS queue to be used instead of the default queue. Providing both this and `queueProps` will cause an error. If the SQS queue is encrypted, the KMS key utilized for encryption must be a customer managed CMK.|
| deployDeadLetterQueue?	| `boolean`	|Whether to create a secondary queue to be used as a dead letter queue. Defaults to `true`.|
| deadLetterQueueProps?	| [`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user provided props to override the default props for the SQS queue.|
| maxReceiveCount	| `int`	| The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue. Defaults to `15`. |
| enableQueuePurging	| `boolean`	| Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue. Defaults to `false`. | This is only on 2 constructs, docs talk about a Lambda function role.|
| encryptionKey?	| [`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|Optional imported encryption key to encrypt the SQS queue.	| Sending messages from an AWS service to an encrypted queue [requires a Customer Master key](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html#compatibility-with-aws-services). Those constructs require these properties. |

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| sqsQueue	|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the SQS queue created by the pattern.|
| deadLetterQueue?	|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the SQS queue created by the pattern.|
| encryptionKey	| [`kms.IKey`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.IKey.html)| Returns an instance of `kms.Key` used for the SQS queue.| Only for service to SQS constructs that require a non-default CMK. |

## Step Functions
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| stateMachineProps	|[`sfn.StateMachineProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-stepfunctions.StateMachineProps.html)|Optional user provided props to override the default props for `sfn.StateMachine`|
| createCloudWatchAlarms | `boolean`|Whether to create recommended CloudWatch alarms.|

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| stateMachine| [`sfn.StateMachine`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-stepfunctions.StateMachine.html)|Returns an instance of `sfn.StateMachine` created by the construct.|
| stateMachineLoggingGroup|[`logs.ILogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.ILogGroup.html)|Returns an instance of the `logs.ILogGroup` created by the construct for StateMachine.|
| cloudwatchAlarms? | [`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudwatch.Alarm.html)|Returns a list of `cloudwatch.Alarm` created by the construct.|

## VPC
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| existingVpc? | [`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html)|An existing VPC in which to deploy the construct. Providing both this and vpcProps is an error.|
| deployVpc? |`boolean`|Whether to create a new VPC based on `vpcProps` into which to deploy this pattern. Setting this to true will deploy the minimal, most private VPC to run the pattern:<ul><li> One isolated subnet in each Availability Zone used by the CDK program</li><li>`enableDnsHostnames` and `enableDnsSupport` will both be set to true</li></ul>If this property is `true` then `existingVpc` cannot be specified. Defaults to `false`.|
| vpcProps? |[`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.VpcProps.html)|Optional user-provided properties to override the default properties for the new VPC. `enableDnsHostnames`, `enableDnsSupport`, `natGateways` and `subnetConfiguration` are set by the Construct, so any values for those properties supplied here will be overrriden. If `deployVpc?` is not `true` then this property will be ignored. |

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| vpc? |[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html)| Returns an instance of the VPC created by the pattern, if `deployVpc?` is `true`, or `existingVpc?` is provided.                 |

## WAF WebACL
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| existingWebaclObj? | [`waf.CfnWebACL`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-wafv2.CfnWebACL.html)|Existing instance of a WAF web ACL, an error will occur if this and props is set.|
| webaclProps?	| [`waf.CfnWebACLProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-wafv2.CfnWebACLProps.html)|Optional user-provided props to override the default props for the AWS WAF web ACL. To use a different collection of managed rule sets, specify a new rules property. Use our [`wrapManagedRuleSet(managedGroupName: string, vendorName: string, priority: number)`](../core/lib/waf-defaults.ts) function from core to create an array entry from each desired managed rule set.|

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| webacl| [`waf.CfnWebACL`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-wafv2.CfnWebACL.html)|Returns an instance of the `waf.CfnWebACL` created by the construct.|


## Fargate
**Required Attributes on Props**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| publicApi | `boolean` | Whether the construct is deploying a private or public API. This has implications for the VPC and ALB. |
| clusterProps? | [ecs.ClusterProps](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ClusterProps.html) | Optional properties to create a new ECS cluster. To provide an existing cluster, use the cluster attribute of fargateServiceProps. |
| ecrRepositoryArn? | `string` | The arn of an ECR Repository containing the image to use to generate the containers. Either this or the image property of containerDefinitionProps must be provided. format: arn:aws:ecr:*region*:*account number*:repository/*Repository Name* |
| ecrImageVersion? | `string` | The version of the image to use from the repository. Defaults to `"Latest"` |
| containerDefinitionProps? | [ecs.ContainerDefinitionProps \| any](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinitionProps.html) | Optional props to define the container created for the Fargate Service (defaults found in fargate-defaults.ts) |
| fargateTaskDefinitionProps? | [ecs.FargateTaskDefinitionProps \| any](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateTaskDefinitionProps.html) | Optional props to define the Fargate Task Definition for this construct  (defaults found in fargate-defaults.ts). |
| fargateServiceProps? | [ecs.FargateServiceProps \| any](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateServiceProps.html) | Optional values to override default Fargate Task definition properties (fargate-defaults.ts). The construct will default to launching the service is the most isolated subnets available (precedence: Isolated, Private and Public). Override those and other defaults here. |
| existingFargateServiceObject? | [ecs.FargateService](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateService.html) | A Fargate Service already instantiated (probably by another Solutions Construct). If this is specified, then no props defining a new service can be provided, including: `existingImageObject, ecrImageVersion, containerDefintionProps, fargateTaskDefinitionProps, ecrRepositoryArn, fargateServiceProps, clusterProps, existingClusterInterface`. |
| existingContainerDefinitionObject? | [ecs.ContainerDefinition](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinition.html) | A container definition already instantiated as part of a Fargate service. This must be the container in the `existingFargateServiceObject`. |

**Required Construct Properties**

| Name    | Type     | Description | Notes    |
| --- | --- | --- |--- |
| service | [ecs.FargateService](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateService.html) | The AWS Fargate service used by this construct (whether created by this construct or passed to this construct at initialization). |
| container | [ecs.ContainerDefinition](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinition.html) | The container associated with the AWS Fargate service in the service property. |