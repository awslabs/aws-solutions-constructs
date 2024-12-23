# AWS S3 Static Website Use Case

This use case implements a static website that delivers HTML, JavaScript, images, video and other files to your website visitors and contain no application code.

This use case is designed to be built and deployed into your account from your local environment using the AWS CDK Toolkit (or CLI). For information on the toolkit and how to install and configure it, please see the [guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html).

## Architecture
The application architecture uses an Amazon CloudFront distribution, Amazon S3 and AWS lambda based custom resource to copy the static website content for Wild Rydes demo website.
![Architecture Diagram](architecture.png)

## Deployment steps
Below are the steps to deploy the use case:

```
# Set the proper version numbers in the package.json file
../../../deployment/v2/align-version.sh

# Install dependencies
npm install

# Build the use case
npm run build

# Deploy the use case
cdk deploy
```

## Deployment Verification
After the stack is deployed successfully, go to the Outputs tab in AWS Cloudformation console, it should show the 'websiteURL', click on the link to see the bare bones web site defined in the website-dist folder.

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.