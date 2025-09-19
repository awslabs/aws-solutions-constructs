"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cdk_lib_1 = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const lib_1 = require("../../lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
test('all defaults', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    factories.vpcFactory('test', {
        subnetTypes: [
            ec2.SubnetType.PRIVATE_ISOLATED
        ]
    });
    const template = assertions_1.Template.fromStack(stack);
    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.resourceCountIs("AWS::EC2::Subnet", 2);
    template.resourceCountIs("AWS::EC2::RouteTable", 2);
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::EC2::FlowLog", 1);
    template.hasResourceProperties("AWS::EC2::VPC", {
        CidrBlock: "10.0.0.0/16",
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
        InstanceTenancy: "default",
    });
    template.hasResourceProperties("AWS::EC2::Subnet", {
        CidrBlock: "10.0.0.0/17",
        MapPublicIpOnLaunch: false
    });
    template.hasResourceProperties("AWS::EC2::Subnet", {
        CidrBlock: "10.0.128.0/17",
        MapPublicIpOnLaunch: false
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
            Statement: [
                {
                    Action: [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams"
                    ],
                    Effect: "Allow",
                    Resource: {
                        "Fn::GetAtt": [
                            assertions_1.Match.stringLikeRegexp("targetvpctestflowlogtestLogGroup"),
                            "Arn"
                        ]
                    }
                },
                {
                    Action: "iam:PassRole",
                    Effect: "Allow",
                    Resource: {
                        "Fn::GetAtt": [
                            assertions_1.Match.stringLikeRegexp("targetvpctestflowlogtestIAMRole"),
                            "Arn"
                        ]
                    }
                }
            ],
        },
    });
});
test('confirm cidr mask is applied correctly', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    factories.vpcFactory('test', {
        subnetTypes: [
            ec2.SubnetType.PRIVATE_ISOLATED
        ],
        subnetIPAddresses: 100
    });
    const template = assertions_1.Template.fromStack(stack);
    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.resourceCountIs("AWS::EC2::Subnet", 2);
    template.resourceCountIs("AWS::EC2::RouteTable", 2);
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::EC2::FlowLog", 1);
    template.hasResourceProperties("AWS::EC2::Subnet", {
        CidrBlock: "10.0.0.0/25",
        MapPublicIpOnLaunch: false,
    });
    template.hasResourceProperties("AWS::EC2::Subnet", {
        CidrBlock: "10.0.0.128/25",
        MapPublicIpOnLaunch: false,
    });
});
test('check that props.vpcProps is reflected', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    factories.vpcFactory('test', {
        subnetTypes: [
            ec2.SubnetType.PRIVATE_ISOLATED
        ],
        vpcProps: {
            ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16')
        }
    });
    const template = assertions_1.Template.fromStack(stack);
    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.resourceCountIs("AWS::EC2::Subnet", 2);
    template.resourceCountIs("AWS::EC2::RouteTable", 2);
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::EC2::FlowLog", 1);
    template.hasResourceProperties("AWS::EC2::VPC", {
        CidrBlock: "172.0.0.0/16",
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
        InstanceTenancy: "default",
    });
});
test('check that provided subnet definitions are used', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    factories.vpcFactory('test', {
        vpcProps: {
            subnetConfiguration: [
                {
                    name: "isolated-one",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 26
                },
                {
                    name: "public-one",
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 26
                },
                {
                    name: "egress-one",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 26
                }
            ]
        }
    });
    const template = assertions_1.Template.fromStack(stack);
    // Not implemented yet
    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.resourceCountIs("AWS::EC2::Subnet", 6);
    template.resourceCountIs("AWS::EC2::RouteTable", 6);
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 6);
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::EC2::FlowLog", 1);
});
test('check that endpoints are created', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    factories.vpcFactory('test', {
        subnetTypes: [
            ec2.SubnetType.PRIVATE_ISOLATED
        ],
        endPoints: [
            lib_1.ServiceEndpointTypes.DYNAMODB,
            lib_1.ServiceEndpointTypes.SNS
        ]
    });
    const template = assertions_1.Template.fromStack(stack);
    // Not implemented yet
    template.resourceCountIs("AWS::EC2::VPC", 1);
    template.resourceCountIs("AWS::EC2::VPCEndpoint", 2);
    template.resourceCountIs("AWS::EC2::Subnet", 2);
    template.resourceCountIs("AWS::EC2::RouteTable", 2);
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::EC2::FlowLog", 1);
    template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        VpcEndpointType: "Gateway",
        RouteTableIds: [
            {
                Ref: assertions_1.Match.stringLikeRegexp("targetvpctestisolatedSubnet1RouteTable")
            },
            {
                Ref: assertions_1.Match.stringLikeRegexp("targetvpctestisolatedSubnet2RouteTable")
            }
        ],
        ServiceName: {
            "Fn::Join": [
                "",
                [
                    "com.amazonaws.",
                    {
                        Ref: "AWS::Region"
                    },
                    ".dynamodb"
                ]
            ]
        },
        VpcId: {
            Ref: assertions_1.Match.stringLikeRegexp("targetvpctest")
        }
    });
    template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        VpcEndpointType: "Interface",
        PrivateDnsEnabled: true,
        SecurityGroupIds: [
            {
                "Fn::GetAtt": [
                    assertions_1.Match.stringLikeRegexp("targettargetSNSsecuritygroup"),
                    "GroupId"
                ]
            }
        ],
        ServiceName: {
            "Fn::Join": [
                "",
                [
                    "com.amazonaws.",
                    {
                        Ref: "AWS::Region"
                    },
                    ".sns"
                ]
            ]
        },
        SubnetIds: [
            {
                Ref: assertions_1.Match.stringLikeRegexp("targetvpctestisolatedSubnet1Subnet")
            },
            {
                Ref: assertions_1.Match.stringLikeRegexp("targetvpctestisolatedSubnet2Subnet")
            }
        ],
        VpcId: {
            Ref: assertions_1.Match.stringLikeRegexp("targetvpctest")
        }
    });
});
test('catch subnet configuration in vpcProps and separate values', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    const app = () => {
        factories.vpcFactory('test', {
            vpcProps: {
                subnetConfiguration: [{
                        name: "anydata"
                    }]
            },
            subnetIPAddresses: 56
        });
    };
    expect(app).toThrowError('Error - Either provide complete subnetConfiguration in props.vpcProps.subnetConfiguration or subnetConfiguration info in props.subnetTypes and props.subnetIPAddresses, but not both\n');
});
test('catch no subnet info provided', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    const first = () => {
        factories.vpcFactory('test', {
            vpcProps: {},
            subnetIPAddresses: 56
        });
    };
    expect(first).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');
    const second = () => {
        factories.vpcFactory('test', {
            vpcProps: {},
            subnetTypes: []
        });
    };
    expect(second).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');
    const third = () => {
        factories.vpcFactory('test', {});
    };
    expect(third).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');
});
test('catch dns settings turned off with endpoints specified', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const factories = new lib_1.ConstructsFactories(stack, 'target');
    const first = () => {
        factories.vpcFactory('test', {
            endPoints: [
                lib_1.ServiceEndpointTypes.BEDROCK
            ],
            vpcProps: {
                enableDnsSupport: false
            }
        });
    };
    expect(first).toThrowError('Error - VPC endpoints require that enableDnsHostnames and enableDnsSupport are both enabled\n');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLWZhY3RvcnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZwYy1mYWN0b3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7OztHQVdHOztBQUVILDZDQUFvQztBQUNwQyx1REFBeUQ7QUFDekQsbUNBQXNFO0FBQ3RFLDJDQUEyQztBQUUzQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLEVBQUUsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtRQUMzQixXQUFXLEVBQUU7WUFDWCxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtTQUNoQztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTNDLFFBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRCxRQUFRLENBQUMsZUFBZSxDQUFDLHVDQUF1QyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLFFBQVEsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRCxRQUFRLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWpELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUU7UUFDOUMsU0FBUyxFQUFFLGFBQWE7UUFDeEIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLGVBQWUsRUFBRSxTQUFTO0tBQzNCLENBQUMsQ0FBQztJQUNILFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRTtRQUNqRCxTQUFTLEVBQUUsYUFBYTtRQUN4QixtQkFBbUIsRUFBRSxLQUFLO0tBQzNCLENBQUMsQ0FBQztJQUNILFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRTtRQUNqRCxTQUFTLEVBQUUsZUFBZTtRQUMxQixtQkFBbUIsRUFBRSxLQUFLO0tBQzNCLENBQUMsQ0FBQztJQUNILFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRTtRQUNqRCxjQUFjLEVBQUU7WUFDZCxTQUFTLEVBQUU7Z0JBQ1Q7b0JBQ0UsTUFBTSxFQUFFO3dCQUNOLHNCQUFzQjt3QkFDdEIsbUJBQW1CO3dCQUNuQix5QkFBeUI7cUJBQzFCO29CQUNELE1BQU0sRUFBRSxPQUFPO29CQUNmLFFBQVEsRUFBRTt3QkFDUixZQUFZLEVBQUU7NEJBQ1osa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxrQ0FBa0MsQ0FBQzs0QkFDMUQsS0FBSzt5QkFDTjtxQkFDRjtpQkFDRjtnQkFDRDtvQkFDRSxNQUFNLEVBQUUsY0FBYztvQkFDdEIsTUFBTSxFQUFFLE9BQU87b0JBQ2YsUUFBUSxFQUFFO3dCQUNSLFlBQVksRUFBRTs0QkFDWixrQkFBSyxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxDQUFDOzRCQUN6RCxLQUFLO3lCQUNOO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtJQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLEVBQUUsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtRQUMzQixXQUFXLEVBQUU7WUFDWCxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtTQUNoQztRQUNELGlCQUFpQixFQUFFLEdBQUc7S0FDdkIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFM0MsUUFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsUUFBUSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRCxRQUFRLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BELFFBQVEsQ0FBQyxlQUFlLENBQUMsdUNBQXVDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFFBQVEsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFakQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFO1FBQ2pELFNBQVMsRUFBRSxhQUFhO1FBQ3hCLG1CQUFtQixFQUFFLEtBQUs7S0FDM0IsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFO1FBQ2pELFNBQVMsRUFBRSxlQUFlO1FBQzFCLG1CQUFtQixFQUFFLEtBQUs7S0FDM0IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUssRUFBRSxDQUFDO0lBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUkseUJBQW1CLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRTNELFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO1FBQzNCLFdBQVcsRUFBRTtZQUNYLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO1NBQ2hDO1FBQ0QsUUFBUSxFQUFFO1lBQ1IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztTQUNsRDtLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTNDLFFBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRCxRQUFRLENBQUMsZUFBZSxDQUFDLHVDQUF1QyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLFFBQVEsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRCxRQUFRLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWpELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUU7UUFDOUMsU0FBUyxFQUFFLGNBQWM7UUFDekIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLGVBQWUsRUFBRSxTQUFTO0tBQzNCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtJQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLEVBQUUsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtRQUMzQixRQUFRLEVBQUU7WUFDUixtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsSUFBSSxFQUFFLGNBQWM7b0JBQ3BCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtvQkFDM0MsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQ2pDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2dCQUNEO29CQUNFLElBQUksRUFBRSxZQUFZO29CQUNsQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7b0JBQzlDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTNDLHNCQUFzQjtJQUN0QixRQUFRLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFFBQVEsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyx1Q0FBdUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUVuRCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7SUFDNUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBSyxFQUFFLENBQUM7SUFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSx5QkFBbUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFM0QsU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7UUFDM0IsV0FBVyxFQUFFO1lBQ1gsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7U0FDaEM7UUFDRCxTQUFTLEVBQUU7WUFDVCwwQkFBb0IsQ0FBQyxRQUFRO1lBQzdCLDBCQUFvQixDQUFDLEdBQUc7U0FDekI7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUUzQyxzQkFBc0I7SUFDdEIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsUUFBUSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRCxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFFBQVEsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyx1Q0FBdUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxRQUFRLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVqRCxRQUFRLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUU7UUFDdEQsZUFBZSxFQUFFLFNBQVM7UUFDMUIsYUFBYSxFQUFFO1lBQ2I7Z0JBQ0UsR0FBRyxFQUFFLGtCQUFLLENBQUMsZ0JBQWdCLENBQUMsd0NBQXdDLENBQUM7YUFDdEU7WUFDRDtnQkFDRSxHQUFHLEVBQUUsa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyx3Q0FBd0MsQ0FBQzthQUN0RTtTQUNGO1FBQ0QsV0FBVyxFQUFFO1lBQ1gsVUFBVSxFQUFFO2dCQUNWLEVBQUU7Z0JBQ0Y7b0JBQ0UsZ0JBQWdCO29CQUNoQjt3QkFDRSxHQUFHLEVBQUUsYUFBYTtxQkFDbkI7b0JBQ0QsV0FBVztpQkFDWjthQUNGO1NBQ0Y7UUFDRCxLQUFLLEVBQUU7WUFDTCxHQUFHLEVBQUUsa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7U0FDN0M7S0FDRixDQUFDLENBQUM7SUFDSCxRQUFRLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUU7UUFDdEQsZUFBZSxFQUFFLFdBQVc7UUFDNUIsaUJBQWlCLEVBQUUsSUFBSTtRQUN2QixnQkFBZ0IsRUFBRTtZQUNoQjtnQkFDRSxZQUFZLEVBQUU7b0JBQ1osa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyw4QkFBOEIsQ0FBQztvQkFDdEQsU0FBUztpQkFDVjthQUNGO1NBQ0Y7UUFDRCxXQUFXLEVBQUU7WUFDWCxVQUFVLEVBQUU7Z0JBQ1YsRUFBRTtnQkFDRjtvQkFDRSxnQkFBZ0I7b0JBQ2hCO3dCQUNFLEdBQUcsRUFBRSxhQUFhO3FCQUNuQjtvQkFDRCxNQUFNO2lCQUNQO2FBQ0Y7U0FDRjtRQUNELFNBQVMsRUFBRTtZQUNUO2dCQUNFLEdBQUcsRUFBRSxrQkFBSyxDQUFDLGdCQUFnQixDQUFDLG9DQUFvQyxDQUFDO2FBQ2xFO1lBQ0Q7Z0JBQ0UsR0FBRyxFQUFFLGtCQUFLLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLENBQUM7YUFDbEU7U0FDRjtRQUNELEtBQUssRUFBRTtZQUNMLEdBQUcsRUFBRSxrQkFBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztTQUM3QztLQUNGLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtJQUN0RSxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLEVBQUUsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxNQUFNLEdBQUcsR0FBRyxHQUFHLEVBQUU7UUFDZixTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUMzQixRQUFRLEVBQUU7Z0JBQ1IsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDcEIsSUFBSSxFQUFFLFNBQVM7cUJBQ2hCLENBQUM7YUFDSDtZQUNELGlCQUFpQixFQUFFLEVBQUU7U0FDdEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0lBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyx3TEFBd0wsQ0FBQyxDQUFDO0FBQ3JOLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLEVBQUUsQ0FBQztJQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzRCxNQUFNLEtBQUssR0FBRyxHQUFHLEVBQUU7UUFDakIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFDM0IsUUFBUSxFQUFFLEVBQ1Q7WUFDRCxpQkFBaUIsRUFBRSxFQUFFO1NBQ3RCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsMkdBQTJHLENBQUMsQ0FBQztJQUV4SSxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7UUFDbEIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFDM0IsUUFBUSxFQUFFLEVBQ1Q7WUFDRCxXQUFXLEVBQUUsRUFBRTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7SUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLDJHQUEyRyxDQUFDLENBQUM7SUFHekksTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFO1FBQ2pCLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQzVCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsMkdBQTJHLENBQUMsQ0FBQztBQUMxSSxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7SUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBSyxFQUFFLENBQUM7SUFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSx5QkFBbUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFM0QsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFO1FBQ2pCLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQzNCLFNBQVMsRUFBRTtnQkFDVCwwQkFBb0IsQ0FBQyxPQUFPO2FBQzdCO1lBQ0QsUUFBUSxFQUFFO2dCQUNSLGdCQUFnQixFQUFFLEtBQUs7YUFDeEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7SUFFRixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLCtGQUErRixDQUFDLENBQUM7QUFDOUgsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVNcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9uc1xuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgQ29uc3RydWN0c0ZhY3RvcmllcywgU2VydmljZUVuZHBvaW50VHlwZXMgfSBmcm9tIFwiLi4vLi4vbGliXCI7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5cbnRlc3QoJ2FsbCBkZWZhdWx0cycsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgY29uc3QgZmFjdG9yaWVzID0gbmV3IENvbnN0cnVjdHNGYWN0b3JpZXMoc3RhY2ssICd0YXJnZXQnKTtcblxuICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICBzdWJuZXRUeXBlczogW1xuICAgICAgZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRFxuICAgIF1cbiAgfSk7XG5cbiAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpWUENcIiwgMSk7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpTdWJuZXRcIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpSb3V0ZVRhYmxlXCIsIDIpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6U3VibmV0Um91dGVUYWJsZUFzc29jaWF0aW9uXCIsIDIpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OklBTTo6Um9sZVwiLCAxKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpJQU06OlBvbGljeVwiLCAxKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OkZsb3dMb2dcIiwgMSk7XG5cbiAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKFwiQVdTOjpFQzI6OlZQQ1wiLCB7XG4gICAgQ2lkckJsb2NrOiBcIjEwLjAuMC4wLzE2XCIsXG4gICAgRW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxuICAgIEVuYWJsZURuc1N1cHBvcnQ6IHRydWUsXG4gICAgSW5zdGFuY2VUZW5hbmN5OiBcImRlZmF1bHRcIixcbiAgfSk7XG4gIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6RUMyOjpTdWJuZXRcIiwge1xuICAgIENpZHJCbG9jazogXCIxMC4wLjAuMC8xN1wiLFxuICAgIE1hcFB1YmxpY0lwT25MYXVuY2g6IGZhbHNlXG4gIH0pO1xuICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkVDMjo6U3VibmV0XCIsIHtcbiAgICBDaWRyQmxvY2s6IFwiMTAuMC4xMjguMC8xN1wiLFxuICAgIE1hcFB1YmxpY0lwT25MYXVuY2g6IGZhbHNlXG4gIH0pO1xuICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OklBTTo6UG9saWN5XCIsIHtcbiAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgIHtcbiAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICAgIFwibG9nczpQdXRMb2dFdmVudHNcIixcbiAgICAgICAgICAgIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIlxuICAgICAgICAgIF0sXG4gICAgICAgICAgRWZmZWN0OiBcIkFsbG93XCIsXG4gICAgICAgICAgUmVzb3VyY2U6IHtcbiAgICAgICAgICAgIFwiRm46OkdldEF0dFwiOiBbXG4gICAgICAgICAgICAgIE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoXCJ0YXJnZXR2cGN0ZXN0Zmxvd2xvZ3Rlc3RMb2dHcm91cFwiKSxcbiAgICAgICAgICAgICAgXCJBcm5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIEFjdGlvbjogXCJpYW06UGFzc1JvbGVcIixcbiAgICAgICAgICBFZmZlY3Q6IFwiQWxsb3dcIixcbiAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgXCJGbjo6R2V0QXR0XCI6IFtcbiAgICAgICAgICAgICAgTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cChcInRhcmdldHZwY3Rlc3RmbG93bG9ndGVzdElBTVJvbGVcIiksXG4gICAgICAgICAgICAgIFwiQXJuXCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG5cbn0pO1xuXG50ZXN0KCdjb25maXJtIGNpZHIgbWFzayBpcyBhcHBsaWVkIGNvcnJlY3RseScsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgY29uc3QgZmFjdG9yaWVzID0gbmV3IENvbnN0cnVjdHNGYWN0b3JpZXMoc3RhY2ssICd0YXJnZXQnKTtcblxuICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICBzdWJuZXRUeXBlczogW1xuICAgICAgZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRFxuICAgIF0sXG4gICAgc3VibmV0SVBBZGRyZXNzZXM6IDEwMFxuICB9KTtcblxuICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlZQQ1wiLCAxKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlN1Ym5ldFwiLCAyKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlJvdXRlVGFibGVcIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpTdWJuZXRSb3V0ZVRhYmxlQXNzb2NpYXRpb25cIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6SUFNOjpSb2xlXCIsIDEpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OklBTTo6UG9saWN5XCIsIDEpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6Rmxvd0xvZ1wiLCAxKTtcblxuICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkVDMjo6U3VibmV0XCIsIHtcbiAgICBDaWRyQmxvY2s6IFwiMTAuMC4wLjAvMjVcIixcbiAgICBNYXBQdWJsaWNJcE9uTGF1bmNoOiBmYWxzZSxcbiAgfSk7XG4gIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6RUMyOjpTdWJuZXRcIiwge1xuICAgIENpZHJCbG9jazogXCIxMC4wLjAuMTI4LzI1XCIsXG4gICAgTWFwUHVibGljSXBPbkxhdW5jaDogZmFsc2UsXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2NoZWNrIHRoYXQgcHJvcHMudnBjUHJvcHMgaXMgcmVmbGVjdGVkJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuICBjb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ3RhcmdldCcpO1xuXG4gIGZhY3Rvcmllcy52cGNGYWN0b3J5KCd0ZXN0Jywge1xuICAgIHN1Ym5ldFR5cGVzOiBbXG4gICAgICBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEXG4gICAgXSxcbiAgICB2cGNQcm9wczoge1xuICAgICAgaXBBZGRyZXNzZXM6IGVjMi5JcEFkZHJlc3Nlcy5jaWRyKCcxNzIuMC4wLjAvMTYnKVxuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpWUENcIiwgMSk7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpTdWJuZXRcIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpSb3V0ZVRhYmxlXCIsIDIpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6U3VibmV0Um91dGVUYWJsZUFzc29jaWF0aW9uXCIsIDIpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OklBTTo6Um9sZVwiLCAxKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpJQU06OlBvbGljeVwiLCAxKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OkZsb3dMb2dcIiwgMSk7XG5cbiAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKFwiQVdTOjpFQzI6OlZQQ1wiLCB7XG4gICAgQ2lkckJsb2NrOiBcIjE3Mi4wLjAuMC8xNlwiLFxuICAgIEVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcbiAgICBFbmFibGVEbnNTdXBwb3J0OiB0cnVlLFxuICAgIEluc3RhbmNlVGVuYW5jeTogXCJkZWZhdWx0XCIsXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2NoZWNrIHRoYXQgcHJvdmlkZWQgc3VibmV0IGRlZmluaXRpb25zIGFyZSB1c2VkJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuICBjb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ3RhcmdldCcpO1xuXG4gIGZhY3Rvcmllcy52cGNGYWN0b3J5KCd0ZXN0Jywge1xuICAgIHZwY1Byb3BzOiB7XG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcImlzb2xhdGVkLW9uZVwiLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgICAgY2lkck1hc2s6IDI2XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcInB1YmxpYy1vbmVcIixcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgY2lkck1hc2s6IDI2XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcImVncmVzcy1vbmVcIixcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICAgIGNpZHJNYXNrOiAyNlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9KTtcblxuICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgLy8gTm90IGltcGxlbWVudGVkIHlldFxuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6VlBDXCIsIDEpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6U3VibmV0XCIsIDYpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6Um91dGVUYWJsZVwiLCA2KTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlN1Ym5ldFJvdXRlVGFibGVBc3NvY2lhdGlvblwiLCA2KTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpJQU06OlJvbGVcIiwgMSk7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6SUFNOjpQb2xpY3lcIiwgMSk7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpGbG93TG9nXCIsIDEpO1xuXG59KTtcblxudGVzdCgnY2hlY2sgdGhhdCBlbmRwb2ludHMgYXJlIGNyZWF0ZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKCk7XG4gIGNvbnN0IGZhY3RvcmllcyA9IG5ldyBDb25zdHJ1Y3RzRmFjdG9yaWVzKHN0YWNrLCAndGFyZ2V0Jyk7XG5cbiAgZmFjdG9yaWVzLnZwY0ZhY3RvcnkoJ3Rlc3QnLCB7XG4gICAgc3VibmV0VHlwZXM6IFtcbiAgICAgIGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURURcbiAgICBdLFxuICAgIGVuZFBvaW50czogW1xuICAgICAgU2VydmljZUVuZHBvaW50VHlwZXMuRFlOQU1PREIsXG4gICAgICBTZXJ2aWNlRW5kcG9pbnRUeXBlcy5TTlNcbiAgICBdXG4gIH0pO1xuXG4gIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAvLyBOb3QgaW1wbGVtZW50ZWQgeWV0XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpWUENcIiwgMSk7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpWUENFbmRwb2ludFwiLCAyKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlN1Ym5ldFwiLCAyKTtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpFQzI6OlJvdXRlVGFibGVcIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6RUMyOjpTdWJuZXRSb3V0ZVRhYmxlQXNzb2NpYXRpb25cIiwgMik7XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcyhcIkFXUzo6SUFNOjpSb2xlXCIsIDEpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OklBTTo6UG9saWN5XCIsIDEpO1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkVDMjo6Rmxvd0xvZ1wiLCAxKTtcblxuICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkVDMjo6VlBDRW5kcG9pbnRcIiwge1xuICAgIFZwY0VuZHBvaW50VHlwZTogXCJHYXRld2F5XCIsXG4gICAgUm91dGVUYWJsZUlkczogW1xuICAgICAge1xuICAgICAgICBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoXCJ0YXJnZXR2cGN0ZXN0aXNvbGF0ZWRTdWJuZXQxUm91dGVUYWJsZVwiKVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKFwidGFyZ2V0dnBjdGVzdGlzb2xhdGVkU3VibmV0MlJvdXRlVGFibGVcIilcbiAgICAgIH1cbiAgICBdLFxuICAgIFNlcnZpY2VOYW1lOiB7XG4gICAgICBcIkZuOjpKb2luXCI6IFtcbiAgICAgICAgXCJcIixcbiAgICAgICAgW1xuICAgICAgICAgIFwiY29tLmFtYXpvbmF3cy5cIixcbiAgICAgICAgICB7XG4gICAgICAgICAgICBSZWY6IFwiQVdTOjpSZWdpb25cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCIuZHluYW1vZGJcIlxuICAgICAgICBdXG4gICAgICBdXG4gICAgfSxcbiAgICBWcGNJZDoge1xuICAgICAgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKFwidGFyZ2V0dnBjdGVzdFwiKVxuICAgIH1cbiAgfSk7XG4gIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6RUMyOjpWUENFbmRwb2ludFwiLCB7XG4gICAgVnBjRW5kcG9pbnRUeXBlOiBcIkludGVyZmFjZVwiLFxuICAgIFByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgIFNlY3VyaXR5R3JvdXBJZHM6IFtcbiAgICAgIHtcbiAgICAgICAgXCJGbjo6R2V0QXR0XCI6IFtcbiAgICAgICAgICBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKFwidGFyZ2V0dGFyZ2V0U05Tc2VjdXJpdHlncm91cFwiKSxcbiAgICAgICAgICBcIkdyb3VwSWRcIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXSxcbiAgICBTZXJ2aWNlTmFtZToge1xuICAgICAgXCJGbjo6Sm9pblwiOiBbXG4gICAgICAgIFwiXCIsXG4gICAgICAgIFtcbiAgICAgICAgICBcImNvbS5hbWF6b25hd3MuXCIsXG4gICAgICAgICAge1xuICAgICAgICAgICAgUmVmOiBcIkFXUzo6UmVnaW9uXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiLnNuc1wiXG4gICAgICAgIF1cbiAgICAgIF1cbiAgICB9LFxuICAgIFN1Ym5ldElkczogW1xuICAgICAge1xuICAgICAgICBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoXCJ0YXJnZXR2cGN0ZXN0aXNvbGF0ZWRTdWJuZXQxU3VibmV0XCIpXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoXCJ0YXJnZXR2cGN0ZXN0aXNvbGF0ZWRTdWJuZXQyU3VibmV0XCIpXG4gICAgICB9XG4gICAgXSxcbiAgICBWcGNJZDoge1xuICAgICAgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKFwidGFyZ2V0dnBjdGVzdFwiKVxuICAgIH1cbiAgfSk7XG5cbn0pO1xuXG50ZXN0KCdjYXRjaCBzdWJuZXQgY29uZmlndXJhdGlvbiBpbiB2cGNQcm9wcyBhbmQgc2VwYXJhdGUgdmFsdWVzJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuICBjb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ3RhcmdldCcpO1xuXG4gIGNvbnN0IGFwcCA9ICgpID0+IHtcbiAgICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICAgIHZwY1Byb3BzOiB7XG4gICAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFt7XG4gICAgICAgICAgbmFtZTogXCJhbnlkYXRhXCJcbiAgICAgICAgfV1cbiAgICAgIH0sXG4gICAgICBzdWJuZXRJUEFkZHJlc3NlczogNTZcbiAgICB9KTtcbiAgfTtcblxuICBleHBlY3QoYXBwKS50b1Rocm93RXJyb3IoJ0Vycm9yIC0gRWl0aGVyIHByb3ZpZGUgY29tcGxldGUgc3VibmV0Q29uZmlndXJhdGlvbiBpbiBwcm9wcy52cGNQcm9wcy5zdWJuZXRDb25maWd1cmF0aW9uIG9yIHN1Ym5ldENvbmZpZ3VyYXRpb24gaW5mbyBpbiBwcm9wcy5zdWJuZXRUeXBlcyBhbmQgcHJvcHMuc3VibmV0SVBBZGRyZXNzZXMsIGJ1dCBub3QgYm90aFxcbicpO1xufSk7XG5cbnRlc3QoJ2NhdGNoIG5vIHN1Ym5ldCBpbmZvIHByb3ZpZGVkJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuICBjb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ3RhcmdldCcpO1xuXG4gIGNvbnN0IGZpcnN0ID0gKCkgPT4ge1xuICAgIGZhY3Rvcmllcy52cGNGYWN0b3J5KCd0ZXN0Jywge1xuICAgICAgdnBjUHJvcHM6IHtcbiAgICAgIH0sXG4gICAgICBzdWJuZXRJUEFkZHJlc3NlczogNTZcbiAgICB9KTtcbiAgfTtcblxuICBleHBlY3QoZmlyc3QpLnRvVGhyb3dFcnJvcignRXJyb3IgLSBzdWJuZXQgdHlwZXMgbXVzdCBiZSBwcm92aWRlZCBpbiBlaXRoZXIgcHJvcHMudnBjUHJvcHMuc3VibmV0Q29uZmlndXJhdGlvbiBvciBwcm9wcy5zdWJuZXRUeXBlc1xcbicpO1xuXG4gIGNvbnN0IHNlY29uZCA9ICgpID0+IHtcbiAgICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICAgIHZwY1Byb3BzOiB7XG4gICAgICB9LFxuICAgICAgc3VibmV0VHlwZXM6IFtdXG4gICAgfSk7XG4gIH07XG5cbiAgZXhwZWN0KHNlY29uZCkudG9UaHJvd0Vycm9yKCdFcnJvciAtIHN1Ym5ldCB0eXBlcyBtdXN0IGJlIHByb3ZpZGVkIGluIGVpdGhlciBwcm9wcy52cGNQcm9wcy5zdWJuZXRDb25maWd1cmF0aW9uIG9yIHByb3BzLnN1Ym5ldFR5cGVzXFxuJyk7XG5cblxuICBjb25zdCB0aGlyZCA9ICgpID0+IHtcbiAgICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICB9KTtcbiAgfTtcblxuICBleHBlY3QodGhpcmQpLnRvVGhyb3dFcnJvcignRXJyb3IgLSBzdWJuZXQgdHlwZXMgbXVzdCBiZSBwcm92aWRlZCBpbiBlaXRoZXIgcHJvcHMudnBjUHJvcHMuc3VibmV0Q29uZmlndXJhdGlvbiBvciBwcm9wcy5zdWJuZXRUeXBlc1xcbicpO1xufSk7XG5cbnRlc3QoJ2NhdGNoIGRucyBzZXR0aW5ncyB0dXJuZWQgb2ZmIHdpdGggZW5kcG9pbnRzIHNwZWNpZmllZCcsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgY29uc3QgZmFjdG9yaWVzID0gbmV3IENvbnN0cnVjdHNGYWN0b3JpZXMoc3RhY2ssICd0YXJnZXQnKTtcblxuICBjb25zdCBmaXJzdCA9ICgpID0+IHtcbiAgICBmYWN0b3JpZXMudnBjRmFjdG9yeSgndGVzdCcsIHtcbiAgICAgIGVuZFBvaW50czogW1xuICAgICAgICBTZXJ2aWNlRW5kcG9pbnRUeXBlcy5CRURST0NLXG4gICAgICBdLFxuICAgICAgdnBjUHJvcHM6IHtcbiAgICAgICAgZW5hYmxlRG5zU3VwcG9ydDogZmFsc2VcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBleHBlY3QoZmlyc3QpLnRvVGhyb3dFcnJvcignRXJyb3IgLSBWUEMgZW5kcG9pbnRzIHJlcXVpcmUgdGhhdCBlbmFibGVEbnNIb3N0bmFtZXMgYW5kIGVuYWJsZURuc1N1cHBvcnQgYXJlIGJvdGggZW5hYmxlZFxcbicpO1xufSk7XG4iXX0=