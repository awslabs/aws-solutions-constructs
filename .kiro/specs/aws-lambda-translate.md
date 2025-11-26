# AWS Solutions Constructs Product Documentation

## Spec for aws-lambda-translate
This should only be referenced when generating code and artifacts for aws-lambda-translate, for any other tasks it should be ignored

### Main Services
* Lambda Function
* Amazon Translate - Translate is an API, there are no depoyed resources. So there are no translateProps in the construct interface

### Interface
* All required props for Lambda based constructs
* This is the first Construct using Translate, so this will define the interface for Translate constructs
  * A flag, asyncJobs, that defaults to false
  * Source and Destination S3 bucket props, modeled on those created for aws-lamba-transcribe
  * AdditionalPermissions - an array of strings listing additional IAM permissions to grant the Lambda function. Default will be List* and Read*, is asyncJobs is true it will add StartTextTranslationJob and StopTextTranslationJob

### Incoming Props Checks
* All Lambda checks in CheckLambdaProps()
* A new CheckTranslateProps() in core/translat-helper.ts that includes
  * If any Source and Destination bucket info is provided when asyncJobs is false, an error is thrown
  * If useSameBucket is set and any Destination bucket props are provided and error is thrown

### Configuration
* Obtain the Lambda function
* Grant the Lambda function access to
  * Translate:Read* and Translate:List*
  * if asyncJobs is true add StartTextTranslationJob and StopTextTranslationJob
  * Add any additionalPermissions
  * if asyncJobs is true, grant read access to the source bucket and write access to the destination bucket
* As instructed, create or use a VPC and add a Translate VPC endpoint to the VPC
  * This will require adding Translate VPC Endpoints to the core library
* If asyncJobs is true
  * Add StartTextTranslationJob and StopTextTranslationJob actions to the Lambda IAM policy
  * Create the source and destination bucket(s) following the pattern in aws-lambda-transcribe

### Construct Properties
* Standard Lambda Function properties
* Translate does not require any exposed properties on the construct
