# AWS S3 Static Website Use Case

This use case implements a static website that delivers HTML, JavaScript, images, video and other files to your website visitors and contain no application code. 

## Architecture
The application architecture uses an Amazon CloudFront distribution, Amazon S3 and AWS lambda based custom resource to copy the static website content for Wild Rydes demo website.
![Architecture Diagram](architecture.png)

## Deployment steps
Below are the steps to deploy the use case:

```
npm run build

cdk deploy

```

## Deployment Verification
After the stack is deployed successfully, go to the Outputs tab in AWS Cloudformation console, it should show the 'websiteURL', click on the link and enjoy the Wile Rydes Unicorn website.

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.