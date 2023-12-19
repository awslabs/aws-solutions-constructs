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
exports.createTemplateWriterCustomResource = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_s3_assets_1 = require("aws-cdk-lib/aws-s3-assets");
const path = require("path");
const custom_resources_1 = require("aws-cdk-lib/custom-resources");
const core_1 = require("@aws-solutions-constructs/core");
function createTemplateWriterCustomResource(scope, id, props) {
    const outputAsset = new aws_s3_assets_1.Asset(scope, `${id}OutputAsset`, {
        path: path.join(__dirname, 'placeholder')
    });
    const templateWriterLambda = (0, core_1.buildLambdaFunction)(scope, {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/template-writer-custom-resource`),
            timeout: props.timeout,
            memorySize: props.memorySize,
            role: new iam.Role(scope, `${id}TemplateWriterLambdaRole`, {
                assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
                description: 'Role used by the TemplateWriterLambda to transform the incoming asset',
                inlinePolicies: {
                    CloudWatchLogsPolicy: new iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                actions: [
                                    'logs:CreateLogGroup',
                                    'logs:CreateLogStream',
                                    'logs:PutLogEvents'
                                ],
                                resources: [`arn:${aws_cdk_lib_1.Aws.PARTITION}:logs:${aws_cdk_lib_1.Aws.REGION}:${aws_cdk_lib_1.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`]
                            })
                        ]
                    }),
                    ReadInputAssetPolicy: new iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                actions: ['s3:GetObject'],
                                effect: iam.Effect.ALLOW,
                                resources: [`arn:${aws_cdk_lib_1.Aws.PARTITION}:s3:::${props.templateBucket.bucketName}/${props.templateKey}`]
                            })
                        ]
                    }),
                    WriteOutputAssetPolicy: new iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                actions: ['s3:PutObject'],
                                effect: iam.Effect.ALLOW,
                                resources: [`arn:${aws_cdk_lib_1.Aws.PARTITION}:s3:::${outputAsset.s3BucketName}/*`]
                            })
                        ]
                    })
                }
            })
        }
    });
    const templateWriterProvider = new custom_resources_1.Provider(scope, `${id}TemplateWriterProvider`, {
        onEventHandler: templateWriterLambda
    });
    const providerFrameworkFunction = templateWriterProvider.node.children[0].node.findChild('Resource');
    (0, core_1.addCfnSuppressRules)(providerFrameworkFunction, [
        {
            id: 'W58',
            reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework has an IAM role with the arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole Managed Policy attached, which grants permission to write to CloudWatch Logs`
        },
        {
            id: 'W89',
            reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework does not access VPC resources`
        },
        {
            id: 'W92',
            reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework does not define ReservedConcurrentExecutions`
        }
    ]);
    const customResource = new aws_cdk_lib_1.CustomResource(scope, `${id}TemplateWriterCustomResource`, {
        resourceType: 'Custom::TemplateWriter',
        serviceToken: templateWriterProvider.serviceToken,
        properties: {
            TemplateValues: JSON.stringify({ templateValues: props.templateValues }),
            TemplateInputBucket: props.templateBucket.bucketName,
            TemplateInputKey: props.templateKey,
            TemplateOutputBucket: outputAsset.s3BucketName
        }
    });
    return {
        s3Bucket: outputAsset.bucket,
        s3Key: customResource.getAttString('TemplateOutputKey'),
        customResource
    };
}
exports.createTemplateWriterCustomResource = createTemplateWriterCustomResource;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVtcGxhdGUtd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7R0FXRzs7O0FBSUgsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUVqRCw2Q0FBa0Q7QUFDbEQsNkRBQWtEO0FBQ2xELDZCQUE2QjtBQUM3QixtRUFBd0Q7QUFDeEQseURBQTBGO0FBK0QxRixTQUFnQixrQ0FBa0MsQ0FDaEQsS0FBZ0IsRUFDaEIsRUFBVSxFQUNWLEtBQTBCO0lBRzFCLE1BQU0sV0FBVyxHQUFHLElBQUkscUJBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRTtRQUN2RCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDO0tBQzFDLENBQUMsQ0FBQztJQUVILE1BQU0sb0JBQW9CLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyxLQUFLLEVBQUU7UUFDdEQsbUJBQW1CLEVBQUU7WUFDbkIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLGtDQUFrQyxDQUFDO1lBQzNFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7WUFDNUIsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFO2dCQUN6RCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUM7Z0JBQzNELFdBQVcsRUFBRSx1RUFBdUU7Z0JBQ3BGLGNBQWMsRUFBRTtvQkFDZCxvQkFBb0IsRUFBRSxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUM7d0JBQzNDLFVBQVUsRUFBRTs0QkFDVixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7Z0NBQ3RCLE9BQU8sRUFBRTtvQ0FDUCxxQkFBcUI7b0NBQ3JCLHNCQUFzQjtvQ0FDdEIsbUJBQW1CO2lDQUNwQjtnQ0FDRCxTQUFTLEVBQUUsQ0FBRSxPQUFPLGlCQUFHLENBQUMsU0FBUyxTQUFTLGlCQUFHLENBQUMsTUFBTSxJQUFJLGlCQUFHLENBQUMsVUFBVSwwQkFBMEIsQ0FBRTs2QkFDbkcsQ0FBQzt5QkFDSDtxQkFDRixDQUFDO29CQUNGLG9CQUFvQixFQUFFLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQzt3QkFDM0MsVUFBVSxFQUFFOzRCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztnQ0FDdEIsT0FBTyxFQUFFLENBQUUsY0FBYyxDQUFFO2dDQUMzQixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO2dDQUN4QixTQUFTLEVBQUUsQ0FBRSxPQUFPLGlCQUFHLENBQUMsU0FBUyxTQUFTLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQzs2QkFDbEcsQ0FBQzt5QkFDSDtxQkFDRixDQUFDO29CQUNGLHNCQUFzQixFQUFFLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQzt3QkFDN0MsVUFBVSxFQUFFOzRCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztnQ0FDdEIsT0FBTyxFQUFFLENBQUUsY0FBYyxDQUFFO2dDQUMzQixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO2dDQUN4QixTQUFTLEVBQUUsQ0FBRSxPQUFPLGlCQUFHLENBQUMsU0FBUyxTQUFTLFdBQVcsQ0FBQyxZQUFZLElBQUksQ0FBQzs2QkFDeEUsQ0FBQzt5QkFDSDtxQkFDRixDQUFDO2lCQUNIO2FBQ0YsQ0FBQztTQUNIO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLDJCQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsRUFBRTtRQUNoRixjQUFjLEVBQUUsb0JBQW9CO0tBQ3JDLENBQUMsQ0FBQztJQUVILE1BQU0seUJBQXlCLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBdUIsQ0FBQztJQUUzSCxJQUFBLDBCQUFtQixFQUFDLHlCQUF5QixFQUFFO1FBQzdDO1lBQ0UsRUFBRSxFQUFFLEtBQUs7WUFDVCxNQUFNLEVBQUUsNlBBQTZQO1NBQ3RRO1FBQ0Q7WUFDRSxFQUFFLEVBQUUsS0FBSztZQUNULE1BQU0sRUFBRSxvSEFBb0g7U0FDN0g7UUFDRDtZQUNFLEVBQUUsRUFBRSxLQUFLO1lBQ1QsTUFBTSxFQUFFLG1JQUFtSTtTQUM1STtLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sY0FBYyxHQUFHLElBQUksNEJBQWMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLDhCQUE4QixFQUFFO1FBQ3BGLFlBQVksRUFBRSx3QkFBd0I7UUFDdEMsWUFBWSxFQUFFLHNCQUFzQixDQUFDLFlBQVk7UUFDakQsVUFBVSxFQUFFO1lBQ1YsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3hFLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVTtZQUNwRCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsV0FBVztZQUNuQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsWUFBWTtTQUMvQztLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxRQUFRLEVBQUUsV0FBVyxDQUFDLE1BQU07UUFDNUIsS0FBSyxFQUFFLGNBQWMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUM7UUFDdkQsY0FBYztLQUNmLENBQUM7QUFDSixDQUFDO0FBN0ZELGdGQTZGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFU1xuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgQXdzLCBDdXN0b21SZXNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEFzc2V0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zMy1hc3NldHNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzXCI7XG5pbXBvcnQgeyBhZGRDZm5TdXBwcmVzc1J1bGVzLCBidWlsZExhbWJkYUZ1bmN0aW9uIH0gZnJvbSBcIkBhd3Mtc29sdXRpb25zLWNvbnN0cnVjdHMvY29yZVwiO1xuXG4vKipcbiAqIFRoZSBUZW1wbGF0ZVZhbHVlIGludGVyZmFjZSBkZWZpbmVzIHRoZSBpZC12YWx1ZSBwYWlyIHRoYXQgd2lsbFxuICogYmUgc3Vic3RpdHV0ZWQgaW4gdGhlIHRlbXBsYXRlLlxuICpcbiAqIEZvciBleGFtcGxlLCBnaXZlbiB0aGUgdGVtcGxhdGU6XG4gKiB0ZW1wbGF0ZTpcbiAqICAgaGVsbG8gbmFtZV9wbGFjZWhvbGRlciwgbmljZSB0byBtZWV0IHlvdVxuICpcbiAqIGFuZCBhbiBpbnN0YW50aWF0aW9uIG9mIFRlbXBsYXRlVmFsdWUgeyBpZDogJ25hbWVfcGxhY2Vob2xkZXInLCB2YWx1ZTogJ2plZmYnIH1cbiAqXG4gKiB0aGUgdGVtcGxhdGUgd2lsbCBiZSB0cmFuc2Zvcm1lZCB0bzpcbiAqIHRlbXBsYXRlOlxuICogICBoZWxsbyBqZWZmLCBuaWNlIHRvIG1lZXQgeW91XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVWYWx1ZSB7XG4gIC8qKlxuICAgKiBUaGUgcGxhY2Vob2xkZXIgc3RyaW5nIHRvIGJlIHJlcGxhY2VkIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHJlYWRvbmx5IGlkOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgdmFsdWUgdG8gcmVwbGFjZSB0aGUgcGxhY2Vob2xkZXIgaW4gdGhlIHRlbXBsYXRlIHdpdGguXG4gICAqL1xuICByZWFkb25seSB2YWx1ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlV3JpdGVyUHJvcHMge1xuICAvKipcbiAgICogVGhlIFMzIGJ1Y2tldCB0aGF0IGhvbGRzIHRoZSB0ZW1wbGF0ZSB0byB0cmFuc2Zvcm0uXG4gICAqIFVwc3RyZWFtIHRoaXMgY2FuIGNvbWUgZWl0aGVyIGZyb20gYW4gQXNzZXQgb3IgUzMgYnVja2V0IGRpcmVjdGx5LlxuICAgKiBJbnRlcm5hbGx5IGl0IHdpbGwgYWx3YXlzIHJlc29sdmUgdG8gUzMgYnVja2V0IGluIGVpdGhlciBjYXNlICh0aGUgY2RrIGFzc2V0IGJ1Y2tldCBvciB0aGUgY3VzdG9tZXItZGVmaW5lZCBidWNrZXQpLlxuICAgKi9cbiAgcmVhZG9ubHkgdGVtcGxhdGVCdWNrZXQ6IHMzLklCdWNrZXQ7XG4gIC8qKlxuICAgKiBUaGUgUzMgb2JqZWN0IGtleSBvZiB0aGUgdGVtcGxhdGUgdG8gdHJhbnNmb3JtLlxuICAgKi9cbiAgcmVhZG9ubHkgdGVtcGxhdGVLZXk6IHN0cmluZztcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIFRlbXBsYXRlVmFsdWUgb2JqZWN0cywgZWFjaCBkZWZpbmluZyBhIHBsYWNlaG9sZGVyIHN0cmluZyBpbiB0aGVcbiAgICogdGVtcGxhdGUgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggaXRzIGNvcnJlc3BvbmRpbmcgdmFsdWUuXG4gICAqL1xuICByZWFkb25seSB0ZW1wbGF0ZVZhbHVlczogVGVtcGxhdGVWYWx1ZVtdXG4gIC8qKlxuICAgKiBPcHRpb25hbCBjb25maWd1cmF0aW9uIGZvciB1c2VyLWRlZmluZWQgZHVyYXRpb24gb2YgdGhlIGJhY2tpbmcgTGFtYmRhIGZ1bmN0aW9uLCB3aGljaCBtYXkgYmUgbmVjZXNzYXJ5IHdoZW4gdHJhbnNmb3JtaW5nIHZlcnkgbGFyZ2Ugb2JqZWN0cy5cbiAgICpcbiAgICogQGRlZmF1bHQgRHVyYXRpb24uc2Vjb25kcygzKVxuICAgKi9cbiAgcmVhZG9ubHkgdGltZW91dD86IGNkay5EdXJhdGlvbjtcbiAgLyoqXG4gICAqIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHVzZXItZGVmaW5lZCBtZW1vcnlTaXplIG9mIHRoZSBiYWNraW5nIExhbWJkYSBmdW5jdGlvbiwgd2hpY2ggbWF5IGJlIG5lY2Vzc2FyeSB3aGVuIHRyYW5zZm9ybWluZyB2ZXJ5IGxhcmdlIG9iamVjdHMuXG4gICAqXG4gICAqIEBkZWZhdWx0IDEyOFxuICAgKi9cbiAgcmVhZG9ubHkgbWVtb3J5U2l6ZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVUZW1wbGF0ZVdyaXRlclJlc3BvbnNlIHtcbiAgcmVhZG9ubHkgczNCdWNrZXQ6IHMzLklCdWNrZXQ7XG4gIHJlYWRvbmx5IHMzS2V5OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGN1c3RvbVJlc291cmNlOiBDdXN0b21SZXNvdXJjZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlV3JpdGVyQ3VzdG9tUmVzb3VyY2UoXG4gIHNjb3BlOiBDb25zdHJ1Y3QsXG4gIGlkOiBzdHJpbmcsXG4gIHByb3BzOiBUZW1wbGF0ZVdyaXRlclByb3BzXG4pOiBDcmVhdGVUZW1wbGF0ZVdyaXRlclJlc3BvbnNlIHtcblxuICBjb25zdCBvdXRwdXRBc3NldCA9IG5ldyBBc3NldChzY29wZSwgYCR7aWR9T3V0cHV0QXNzZXRgLCB7XG4gICAgcGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ3BsYWNlaG9sZGVyJylcbiAgfSk7XG5cbiAgY29uc3QgdGVtcGxhdGVXcml0ZXJMYW1iZGEgPSBidWlsZExhbWJkYUZ1bmN0aW9uKHNjb3BlLCB7XG4gICAgbGFtYmRhRnVuY3Rpb25Qcm9wczoge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoYCR7X19kaXJuYW1lfS90ZW1wbGF0ZS13cml0ZXItY3VzdG9tLXJlc291cmNlYCksXG4gICAgICB0aW1lb3V0OiBwcm9wcy50aW1lb3V0LFxuICAgICAgbWVtb3J5U2l6ZTogcHJvcHMubWVtb3J5U2l6ZSxcbiAgICAgIHJvbGU6IG5ldyBpYW0uUm9sZShzY29wZSwgYCR7aWR9VGVtcGxhdGVXcml0ZXJMYW1iZGFSb2xlYCwge1xuICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdSb2xlIHVzZWQgYnkgdGhlIFRlbXBsYXRlV3JpdGVyTGFtYmRhIHRvIHRyYW5zZm9ybSB0aGUgaW5jb21pbmcgYXNzZXQnLFxuICAgICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAgIENsb3VkV2F0Y2hMb2dzUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsgYGFybjoke0F3cy5QQVJUSVRJT059OmxvZ3M6JHtBd3MuUkVHSU9OfToke0F3cy5BQ0NPVU5UX0lEfTpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEvKmAgXVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIFJlYWRJbnB1dEFzc2V0UG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsgJ3MzOkdldE9iamVjdCcgXSxcbiAgICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbIGBhcm46JHtBd3MuUEFSVElUSU9OfTpzMzo6OiR7cHJvcHMudGVtcGxhdGVCdWNrZXQuYnVja2V0TmFtZX0vJHtwcm9wcy50ZW1wbGF0ZUtleX1gXVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIFdyaXRlT3V0cHV0QXNzZXRQb2xpY3k6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogWyAnczM6UHV0T2JqZWN0JyBdLFxuICAgICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsgYGFybjoke0F3cy5QQVJUSVRJT059OnMzOjo6JHtvdXRwdXRBc3NldC5zM0J1Y2tldE5hbWV9LypgXVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KTtcblxuICBjb25zdCB0ZW1wbGF0ZVdyaXRlclByb3ZpZGVyID0gbmV3IFByb3ZpZGVyKHNjb3BlLCBgJHtpZH1UZW1wbGF0ZVdyaXRlclByb3ZpZGVyYCwge1xuICAgIG9uRXZlbnRIYW5kbGVyOiB0ZW1wbGF0ZVdyaXRlckxhbWJkYVxuICB9KTtcblxuICBjb25zdCBwcm92aWRlckZyYW1ld29ya0Z1bmN0aW9uID0gdGVtcGxhdGVXcml0ZXJQcm92aWRlci5ub2RlLmNoaWxkcmVuWzBdLm5vZGUuZmluZENoaWxkKCdSZXNvdXJjZScpIGFzIGxhbWJkYS5DZm5GdW5jdGlvbjtcblxuICBhZGRDZm5TdXBwcmVzc1J1bGVzKHByb3ZpZGVyRnJhbWV3b3JrRnVuY3Rpb24sIFtcbiAgICB7XG4gICAgICBpZDogJ1c1OCcsXG4gICAgICByZWFzb246IGBUaGUgQ0RLLXByb3ZpZGVkIGxhbWJkYSBmdW5jdGlvbiB0aGF0IGJhY2tzIHRoZWlyIEN1c3RvbSBSZXNvdXJjZSBQcm92aWRlciBmcmFtZXdvcmsgaGFzIGFuIElBTSByb2xlIHdpdGggdGhlIGFybjphd3M6aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUgTWFuYWdlZCBQb2xpY3kgYXR0YWNoZWQsIHdoaWNoIGdyYW50cyBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIENsb3VkV2F0Y2ggTG9nc2BcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnVzg5JyxcbiAgICAgIHJlYXNvbjogYFRoZSBDREstcHJvdmlkZWQgbGFtYmRhIGZ1bmN0aW9uIHRoYXQgYmFja3MgdGhlaXIgQ3VzdG9tIFJlc291cmNlIFByb3ZpZGVyIGZyYW1ld29yayBkb2VzIG5vdCBhY2Nlc3MgVlBDIHJlc291cmNlc2BcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnVzkyJyxcbiAgICAgIHJlYXNvbjogYFRoZSBDREstcHJvdmlkZWQgbGFtYmRhIGZ1bmN0aW9uIHRoYXQgYmFja3MgdGhlaXIgQ3VzdG9tIFJlc291cmNlIFByb3ZpZGVyIGZyYW1ld29yayBkb2VzIG5vdCBkZWZpbmUgUmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uc2BcbiAgICB9XG4gIF0pO1xuXG4gIGNvbnN0IGN1c3RvbVJlc291cmNlID0gbmV3IEN1c3RvbVJlc291cmNlKHNjb3BlLCBgJHtpZH1UZW1wbGF0ZVdyaXRlckN1c3RvbVJlc291cmNlYCwge1xuICAgIHJlc291cmNlVHlwZTogJ0N1c3RvbTo6VGVtcGxhdGVXcml0ZXInLFxuICAgIHNlcnZpY2VUb2tlbjogdGVtcGxhdGVXcml0ZXJQcm92aWRlci5zZXJ2aWNlVG9rZW4sXG4gICAgcHJvcGVydGllczoge1xuICAgICAgVGVtcGxhdGVWYWx1ZXM6IEpTT04uc3RyaW5naWZ5KHsgdGVtcGxhdGVWYWx1ZXM6IHByb3BzLnRlbXBsYXRlVmFsdWVzIH0pLFxuICAgICAgVGVtcGxhdGVJbnB1dEJ1Y2tldDogcHJvcHMudGVtcGxhdGVCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIFRlbXBsYXRlSW5wdXRLZXk6IHByb3BzLnRlbXBsYXRlS2V5LFxuICAgICAgVGVtcGxhdGVPdXRwdXRCdWNrZXQ6IG91dHB1dEFzc2V0LnMzQnVja2V0TmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzM0J1Y2tldDogb3V0cHV0QXNzZXQuYnVja2V0LFxuICAgIHMzS2V5OiBjdXN0b21SZXNvdXJjZS5nZXRBdHRTdHJpbmcoJ1RlbXBsYXRlT3V0cHV0S2V5JyksXG4gICAgY3VzdG9tUmVzb3VyY2VcbiAgfTtcbn0iXX0=