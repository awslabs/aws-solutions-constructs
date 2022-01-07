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
import * as cdk from "@aws-cdk/core";
import { Route53ToApiGateway, Route53ToApiGatewayProps } from "../lib";
import * as route53 from "@aws-cdk/aws-route53";
import * as defaults from "@aws-solutions-constructs/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import "@aws-cdk/assert/jest";

// Deploying Public/Private Existing Hosted Zones
function deployApi(
  stack: cdk.Stack,
  publicApi: boolean
) {
  const [restApi] = defaults.RegionalRestApi(stack);
  restApi.root.addMethod('GET');

  const domainName = "www.test-example.com";

  let newZone: route53.PublicHostedZone | route53.PrivateHostedZone;

  if (publicApi) {
    newZone = new route53.PublicHostedZone(stack, "new-zone", {
      zoneName: domainName,
    });
  } else {
    const vpc = defaults.buildVpc(stack, {
      defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
      constructVpcProps: {
        enableDnsHostnames: true,
        enableDnsSupport: true,
        cidr: "172.168.0.0/16",
      },
    });

    newZone = new route53.PrivateHostedZone(stack, "new-zone", {
      zoneName: domainName,
      vpc
    });
  }

  const certificate = acm.Certificate.fromCertificateArn(
    stack,
    "fake-cert",
    "arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012"
  );

  // Definitions
  const props: Route53ToApiGatewayProps = {
    publicApi,
    existingHostedZoneInterface: newZone,
    existingApiGatewayInterface: restApi,
    existingCertificateInterface: certificate,
  };

  return new Route53ToApiGateway(stack, "api-stack", props);
}

// --------------------------------------------------------------
// Check for pattern props
// --------------------------------------------------------------
test("Test for default params construct props", () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const construct = deployApi(stack, false);

  // Assertion
  expect(construct.apiGateway).not.toBeNull();
  expect(construct.hostedZone).not.toBeNull();
  expect(construct.vpc).not.toBeNull();
  expect(construct.certificate).not.toBeNull();
});

// --------------------------------------------------------------
// Check for errors when creating a private hosted zone
// --------------------------------------------------------------
test("Test for errors when creating a private hosted zone", () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const [restApi] = defaults.RegionalRestApi(stack);
  const domainName = "www.test-example.com";

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      cidr: "172.168.0.0/16",
    },
  });

  const newZone = new route53.PrivateHostedZone(stack, "new-zone", {
    zoneName: domainName,
    vpc
  });

  const certificate = acm.Certificate.fromCertificateArn(
    stack,
    "fake-cert",
    "arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012"
  );

  let app = () =>
    new Route53ToApiGateway(stack, "api-stack1", {
      publicApi: true,
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });
  // Assertion 1
  expect(app).toThrowError(
    "Public APIs require an existingHostedZone be passed in the Props object."
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack2", {
      publicApi: false,
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });

  // Assertion 2
  expect(app).toThrowError(
    "Must supply privateHostedZoneProps to create a private API"
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack3", {
      publicApi: false,
      privateHostedZoneProps: {
        zoneName: "test-example.com",
        vpc,
      },
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });

  // Assertion 3
  expect(app).toThrowError(
    "All VPC specs must be provided at the Construct level in Route53ToApiGatewayProps"
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack4", {
      publicApi: false,
      existingHostedZoneInterface: newZone,
      existingVpc: vpc,
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });

  // Assertion 4
  expect(app).toThrowError(
    "Cannot provide an existing VPC to an existing Private Hosted Zone."
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack5", {
      publicApi: false,
      existingHostedZoneInterface: newZone,
      existingApiGatewayInterface: restApi,
      privateHostedZoneProps: {
        domainName: "test-example.com"
      },
      existingCertificateInterface: certificate
    });

  // Assertion 5
  expect(app).toThrowError(
    "Must provide either existingHostedZoneInterface or privateHostedZoneProps."
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack6", {
      publicApi: false,
      privateHostedZoneProps: {
        domainName: "test.example.com"
      },
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });

  // Assertion 7
  expect(app).toThrowError(
    'Must supply zoneName for Private Hosted Zone Props.'
  );

  app = () =>
    new Route53ToApiGateway(stack, "api-stack7", {
      publicApi: false,
      privateHostedZoneProps: {
        zoneName: "test.example.com"
      },
      existingApiGatewayInterface: restApi,
      existingCertificateInterface: certificate
    });

  // Assertion 6
  expect(app).toThrowError(
    'Must supply an existing VPC for Private Hosted Zone Props.'
  );
});

// --------------------------------------------------------------
// Check for providing private hosted zone props
// --------------------------------------------------------------
test("Test for providing private hosted zone props", () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const [restApi] = defaults.RegionalRestApi(stack);
  restApi.root.addMethod('GET');

  const domainName = "www.private-zone.com";

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      cidr: "172.168.0.0/16",
    },
  });

  const certificate = acm.Certificate.fromCertificateArn(
    stack,
    "fake-cert",
    "arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012"
  );

  new Route53ToApiGateway(stack, "api-stack1", {
    publicApi: false,
    existingApiGatewayInterface: restApi,
    privateHostedZoneProps: {
      zoneName: domainName,
    },
    existingVpc: vpc,
    existingCertificateInterface: certificate
  });

  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "www.private-zone.com.",
    VPCs: [
      {
        VPCId: {
          Ref: "Vpc8378EB38",
        },
        VPCRegion: {
          Ref: "AWS::Region",
        },
      },
    ],
  });
});

// --------------------------------------------------------------
// Check for A record creation in Public Hosted Zone
// --------------------------------------------------------------
test("Integration test for A record creation in Public Hosted Zone ", () => {
  // Initial Setup
  const stack = new cdk.Stack();
  deployApi(stack, true);

  // Assertions
  expect(stack).toHaveResourceLike("AWS::Route53::RecordSet", {
    Name: "www.test-example.com.",
    Type: "A",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": [
          "RestApiCustomDomainName94F28E16",
          "RegionalDomainName",
        ],
      },
      HostedZoneId: {
        "Fn::GetAtt": [
          "RestApiCustomDomainName94F28E16",
          "RegionalHostedZoneId",
        ],
      },
    },
    HostedZoneId: {
      Ref: "newzone1D011936",
    },
  });

  expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
    EndpointConfiguration: {
      Types: [
        "REGIONAL"
      ]
    },
    Name: "RestApi"
  });
});

// --------------------------------------------------------------
// Check for A record creation in Private Hosted Zone
// --------------------------------------------------------------
test("Integration test for A record creation in Private Hosted Zone ", () => {
  // Initial Setup
  const stack = new cdk.Stack();
  deployApi(stack, false);

  // Assertions
  expect(stack).toHaveResourceLike("AWS::Route53::RecordSet", {
    Name: "www.test-example.com.",
    Type: "A",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": [
          "RestApiCustomDomainName94F28E16",
          "RegionalDomainName",
        ],
      },
      HostedZoneId: {
        "Fn::GetAtt": [
          "RestApiCustomDomainName94F28E16",
          "RegionalHostedZoneId",
        ],
      },
    },
    HostedZoneId: {
      Ref: "newzone1D011936",
    },
  });

  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "www.test-example.com.",
    VPCs: [
      {
        VPCId: {
          Ref: "Vpc8378EB38",
        },
        VPCRegion: {
          Ref: "AWS::Region",
        },
      },
    ],
  });

  expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
    EndpointConfiguration: {
      Types: [
        "REGIONAL"
      ]
    },
    Name: "RestApi"
  });
});