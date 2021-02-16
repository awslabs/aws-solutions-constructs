# DesignGuidelines

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

**The Minimal Deployable Pattern Definition should be minimal **
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
 


## S3
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| existingBucketObj? | s3.Bucket | Either this or bucketProps must be provided |
| bucketProps? | s3.BucketProps	| |
| s3EventTypes?	| s3.EventType	| Only required when construct responds to S3 events |
| s3EventFilters?	| s3.NotificationKeyFilter |Only required when construct responds to S3 events |


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| s3Bucket	| s3.Bucket	||
| s3LoggingBucket	| s3.Bucket	||


## API Gateway
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| apiGatewayProps	| api.RestApiProps	| aws-cloudfront-apigateway is an exception (covered below) ||
| allow*Name*Operation/
*name*OperationTemplate	|	| Required in pairs for integration with DDB and SQS |


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| apiGateway	| api.RestApi	| |
|apiGatewayCloudwatchRole	| iam.Role	||
| apiGatewayLogGroup	| logs.LogGroup	||
| apiGatewayRol	| iam.Role	||
## IoT
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| iotEndpoint	| string	| When IoT is *downstream* (e.g. – aws-apigateway-iot) |
| iotTopicRuleProps	| iot.CfnTopicRuleProps	| When iot is *upstream* (eg – aws-iot-lambda) |

**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| iotActionsRole	| iam.Role	| For upstream IoT|

## Kinesis Streams
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| existingStreamObj?	| kinesis.Stream	| |
| kinesisStreamProps?	| kinesis.StreamProps	||


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| kinesisStream	| kinesis.Stream	||
| kinesisStreamRole	| iam.Role	| Only when Kinesis is upstream (because then the role is important to the construct) |


## Lambda
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| existingLambdaObj?	| lambda.Function	||
| lambdaFunctionProps?	| lambda.FunctionProps	||


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| lambdaFunction	| lambda.Function	||

## SQS
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| queueProps?	| sqs.QueueProps	||
| existingQueueObj?	| sqs.Qeue	||
| deployDeadLetterQueue?	| Boolean	||
| deadLetterQueueProps?	| sqs.QueueProps	||
| maxReceiveCount	| number	||
| enableQueuePurging	| boolean	| This is only on 2 constructs, docs talk about a Lambda function role|
| encryptionKey?	| kms.Key	| Sending messages from an AWS service to an encrypted queue [requires a Customer Master key](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html#compatibility-with-aws-services). Those constructs require these properties. |


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| sqsQueue	| sqs.Queue	||
| deadLetterQueue?	| sqs.Queue	||
| encryptionKey	| kms.Key	| Only for service to SQS constructs that require a non-default CMK. |


## CloudFront
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| cloudFrontDistributionProps?	| cloudfront.CloudFront.WebDistributionProps	||
| insertHttpSecurityHeaders?	| boolean	||


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| cloudFrontLoggingBucket?	s3.Bucket	||
| cloudFrontWebDistribution	cloudfront.CloudrontWebDistribution	||


## DynamoDB
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| dynamoTableProps?	| dynamodb.TableProps	||
| existingTableObj?	| dynamodb.Table	||
| tablePermissions?	| string	| Only where DynamoDB is a data store being accessed by the construct|
| dynamoEventSourceProps?		| aws-lambda-event-sources.DynamoEventSourceProps	| Only where DynamoDB is invoking other services (dynamodb streams) |


**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| dynamoTable	| dynamodb.Table	||

## Events Rules
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| eventRuleProps	| events.RuleProps	||

**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| eventsRule	| events.Rule	||

## Firehose
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| kinesisFirehoseProps?	| aws-kinesisfirehose.CfnDeliveryStreamProps	||

**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| kinesisFirehose	| kinesisfirehose.CfnDeliveryStream	||
| kinesisFirehoseRole	| iam.Role	||
| kinesisFirehoseLogGroup	| logs.LogGroup	||


## SNS
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| existingTopicObj?	| sns.Topic	||
| topicProps?	| sns.TopicProps	||
| enableEncryptionWithCustomerManagedKey?	| boolean	| Sending messages from an AWS service to an encrypted Topic [requires a Customer Master key](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html#compatibility-with-aws-services). Those constructs require these properties.  |
| encryptionKey?		| kms.Key	|
| encryptionKeyProps?		| kms.KeyProps	|



**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| snsTopic	| sns.Topic	 | |
| encryptionKey	| kms.Key	| Only required when AWS service is writing to the SNS topic (similar to SQS) |


## Step Functions
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| stateMachineProps	| sfn.StateMachineProps	||


**Required Construct Properties** 
| Name    | Type     | Notes    |
| --- | --- | --- |
| stateMachine		| sfn.StateMachine	||
| stateMachineLoggingGroup	| logs.LogGroup	||


## ElasticSearch
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| esDomainProps?	| elasticsearch.CfnDomainProps	||
| domainName	| string	||



**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| elasticsearchDomain | elasticsearch.CfnDomain ||
| elasticsearchDomainRole | iam.Role ||

## VPC
**Required Attributes on Props** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| existingVpc? | ec2.IVpc |  |
| deployVpc? | boolean| |
| vpcProps? | ec2.VpcProps| |

**Required Construct Properties** 

| Name    | Type     | Notes    |
| --- | --- | --- |
| vpc? | ec2.IVpc |  |
