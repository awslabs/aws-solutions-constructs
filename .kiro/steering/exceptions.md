# AWS Solutions Constructs - Exceptions List

## Overview
The rules for construct architecture laid out in product.md, tech.md, structure.md and test.md are not unversally followed, for various reasons, including:
* Improved understanding of how services should be defined as the library grew
* Scenarios where resources must be declared by a particular construct, so other constructs can only accept an existing construct (example - API Gateway must be launched integrated with a backend service, so aws-cloudfront-apigateway can only accept an existing service)
* Services must be launched at the top level due to the need to export specific elements (example - Bedrock Inference Profiles are launched in aws-lambda-bedrockinferenceprofile/lib/index.ts)
This document will explicitly list new exceptions and gradually document exceptions that have already been implemented.

### VPCs Required for OpenSearch and Elasticsearch
OpenSearch domains and Elasticsearch domains must be launched in a VPC - so any construct referencing these services does not expose the deployVpc property as it MUST be true.

