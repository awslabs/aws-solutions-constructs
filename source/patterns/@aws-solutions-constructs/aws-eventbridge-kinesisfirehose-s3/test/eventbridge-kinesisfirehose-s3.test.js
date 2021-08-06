"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("@aws-cdk/assert");
const cdk = require("@aws-cdk/core");
const s3 = require("@aws-cdk/aws-s3");
const events = require("@aws-cdk/aws-events");
require("@aws-cdk/assert/jest");
const lib_1 = require("../lib");
// --------------------------------------------------------------
// Test snapshot match with default parameters
// --------------------------------------------------------------
function deployNewStack(stack) {
    const props = {
        eventRuleProps: {
            description: 'event rule props',
            schedule: events.Schedule.rate(cdk.Duration.minutes(5))
        }
    };
    return new lib_1.EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-kinesis-firehose-s3-default-parameters', props);
}
test('Test snapshot match with default parameters', () => {
    const stack = new cdk.Stack();
    deployNewStack(stack);
    // Assertions
    expect(assert_1.SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
// --------------------------------------------------------------
// Test properties
// --------------------------------------------------------------
test('Test properties', () => {
    const stack = new cdk.Stack();
    const construct = deployNewStack(stack);
    // Assertions
    expect(construct.eventsRule !== null);
    expect(construct.eventsRole !== null);
    expect(construct.kinesisFirehose !== null);
    expect(construct.kinesisFirehoseRole !== null);
    expect(construct.kinesisFirehoseLogGroup !== null);
    expect(construct.s3Bucket !== null);
    expect(construct.s3LoggingBucket !== null);
});
// --------------------------------------------------------------
// Test default server side s3 bucket encryption
// --------------------------------------------------------------
test('Test default server side s3 bucket encryption', () => {
    const stack = new cdk.Stack();
    deployNewStack(stack);
    // Assertions
    expect(stack).toHaveResource('AWS::S3::Bucket', {
        BucketEncryption: {
            ServerSideEncryptionConfiguration: [
                {
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: "AES256"
                    }
                }
            ]
        }
    });
});
// --------------------------------------------------------------
// Test property override
// --------------------------------------------------------------
test('Test property override', () => {
    const stack = new cdk.Stack();
    // create properties
    const props = {
        eventRuleProps: {
            description: 'event rule props',
            schedule: events.Schedule.rate(cdk.Duration.minutes(5))
        },
        kinesisFirehoseProps: {
            extendedS3DestinationConfiguration: {
                bufferingHints: {
                    intervalInSeconds: 600,
                    sizeInMBs: 55
                },
            }
        },
        bucketProps: {
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: true,
                ignorePublicAcls: false,
                restrictPublicBuckets: true
            }
        }
    };
    new lib_1.EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-firehose-s3', props);
    expect(stack).toHaveResource("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: true,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: true
        },
    });
    expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
        ExtendedS3DestinationConfiguration: {
            BufferingHints: {
                IntervalInSeconds: 600,
                SizeInMBs: 55
            }
        }
    });
});
// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
    // Stack
    const stack = new cdk.Stack();
    const testBucket = new s3.Bucket(stack, 'test-bucket', {});
    const app = () => {
        // Helper declaration
        new lib_1.EventbridgeToKinesisFirehoseToS3(stack, "bad-s3-args", {
            eventRuleProps: {
                description: 'event rule props',
                schedule: events.Schedule.rate(cdk.Duration.minutes(5))
            },
            existingBucketObj: testBucket,
            bucketProps: {
                removalPolicy: cdk.RemovalPolicy.DESTROY
            },
        });
    };
    // Assertion
    expect(app).toThrowError();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRicmlkZ2Uta2luZXNpc2ZpcmVob3NlLXMzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJldmVudGJyaWRnZS1raW5lc2lzZmlyZWhvc2UtczMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7O0FBRUgsNENBQTZDO0FBQzdDLHFDQUFxQztBQUNyQyxzQ0FBc0M7QUFDdEMsOENBQThDO0FBQzlDLGdDQUE4QjtBQUM5QixnQ0FBaUc7QUFFakcsaUVBQWlFO0FBQ2pFLDhDQUE4QztBQUM5QyxpRUFBaUU7QUFDakUsU0FBUyxjQUFjLENBQUMsS0FBZ0I7SUFDdEMsTUFBTSxLQUFLLEdBQTBDO1FBQ25ELGNBQWMsRUFBRTtZQUNkLFdBQVcsRUFBRSxrQkFBa0I7WUFDL0IsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO0tBQ0YsQ0FBQztJQUNGLE9BQU8sSUFBSSxzQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUseURBQXlELEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdkgsQ0FBQztBQUVELElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7SUFDdkQsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXRCLGFBQWE7SUFDYixNQUFNLENBQUMsbUJBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQy9ELENBQUMsQ0FBQyxDQUFDO0FBRUgsaUVBQWlFO0FBQ2pFLGtCQUFrQjtBQUNsQixpRUFBaUU7QUFDakUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMzQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFL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QUFDakUsb0RBQW9EO0FBQ3BELGlFQUFpRTtBQUNqRSxJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO0lBQzdELFFBQVE7SUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUU5QixNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUzRCxNQUFNLEdBQUcsR0FBRyxHQUFHLEVBQUU7UUFDZixxQkFBcUI7UUFDckIsSUFBSSxzQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFO1lBQ3pELGNBQWMsRUFBRTtnQkFDZCxXQUFXLEVBQUUsa0JBQWtCO2dCQUMvQixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDeEQ7WUFDRCxpQkFBaUIsRUFBRSxVQUFVO1lBQzdCLFdBQVcsRUFBRTtnQkFDWCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO2FBQ3pDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0lBQ0YsWUFBWTtJQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogIENvcHlyaWdodCAyMDIxIEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2VcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHsgU3ludGhVdGlscyB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJAYXdzLWNkay9hd3MtczNcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiQGF3cy1jZGsvYXdzLWV2ZW50c1wiO1xuaW1wb3J0ICdAYXdzLWNkay9hc3NlcnQvamVzdCc7XG5pbXBvcnQgeyBFdmVudGJyaWRnZVRvS2luZXNpc0ZpcmVob3NlVG9TMywgRXZlbnRicmlkZ2VUb0tpbmVzaXNGaXJlaG9zZVRvUzNQcm9wcyB9IGZyb20gJy4uL2xpYic7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUZXN0IHNuYXBzaG90IG1hdGNoIHdpdGggZGVmYXVsdCBwYXJhbWV0ZXJzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gZGVwbG95TmV3U3RhY2soc3RhY2s6IGNkay5TdGFjaykge1xuICBjb25zdCBwcm9wczogRXZlbnRicmlkZ2VUb0tpbmVzaXNGaXJlaG9zZVRvUzNQcm9wcyA9IHtcbiAgICBldmVudFJ1bGVQcm9wczoge1xuICAgICAgZGVzY3JpcHRpb246ICdldmVudCBydWxlIHByb3BzJyxcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUucmF0ZShjZGsuRHVyYXRpb24ubWludXRlcyg1KSlcbiAgICB9XG4gIH07XG4gIHJldHVybiBuZXcgRXZlbnRicmlkZ2VUb0tpbmVzaXNGaXJlaG9zZVRvUzMoc3RhY2ssICd0ZXN0LWV2ZW50YnJpZGdlLWtpbmVzaXMtZmlyZWhvc2UtczMtZGVmYXVsdC1wYXJhbWV0ZXJzJywgcHJvcHMpO1xufVxuXG50ZXN0KCdUZXN0IHNuYXBzaG90IG1hdGNoIHdpdGggZGVmYXVsdCBwYXJhbWV0ZXJzJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcbiAgZGVwbG95TmV3U3RhY2soc3RhY2spO1xuXG4gIC8vIEFzc2VydGlvbnNcbiAgZXhwZWN0KFN5bnRoVXRpbHMudG9DbG91ZEZvcm1hdGlvbihzdGFjaykpLnRvTWF0Y2hTbmFwc2hvdCgpO1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUZXN0IHByb3BlcnRpZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG50ZXN0KCdUZXN0IHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuICBjb25zdCBjb25zdHJ1Y3Q6IEV2ZW50YnJpZGdlVG9LaW5lc2lzRmlyZWhvc2VUb1MzID0gZGVwbG95TmV3U3RhY2soc3RhY2spO1xuXG4gIC8vIEFzc2VydGlvbnNcbiAgZXhwZWN0KGNvbnN0cnVjdC5ldmVudHNSdWxlICE9PSBudWxsKTtcbiAgZXhwZWN0KGNvbnN0cnVjdC5ldmVudHNSb2xlICE9PSBudWxsKTtcbiAgZXhwZWN0KGNvbnN0cnVjdC5raW5lc2lzRmlyZWhvc2UgIT09IG51bGwpO1xuICBleHBlY3QoY29uc3RydWN0LmtpbmVzaXNGaXJlaG9zZVJvbGUgIT09IG51bGwpO1xuICBleHBlY3QoY29uc3RydWN0LmtpbmVzaXNGaXJlaG9zZUxvZ0dyb3VwICE9PSBudWxsKTtcbiAgZXhwZWN0KGNvbnN0cnVjdC5zM0J1Y2tldCAhPT0gbnVsbCk7XG4gIGV4cGVjdChjb25zdHJ1Y3QuczNMb2dnaW5nQnVja2V0ICE9PSBudWxsKTtcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVGVzdCBkZWZhdWx0IHNlcnZlciBzaWRlIHMzIGJ1Y2tldCBlbmNyeXB0aW9uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudGVzdCgnVGVzdCBkZWZhdWx0IHNlcnZlciBzaWRlIHMzIGJ1Y2tldCBlbmNyeXB0aW9uJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcbiAgZGVwbG95TmV3U3RhY2soc3RhY2spO1xuXG4gIC8vIEFzc2VydGlvbnNcbiAgZXhwZWN0KHN0YWNrKS50b0hhdmVSZXNvdXJjZSgnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgIEJ1Y2tldEVuY3J5cHRpb246IHtcbiAgICAgIFNlcnZlclNpZGVFbmNyeXB0aW9uQ29uZmlndXJhdGlvbjogW1xuICAgICAgICB7XG4gICAgICAgICAgU2VydmVyU2lkZUVuY3J5cHRpb25CeURlZmF1bHQ6IHtcbiAgICAgICAgICAgIFNTRUFsZ29yaXRobTogXCJBRVMyNTZcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFRlc3QgcHJvcGVydHkgb3ZlcnJpZGVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG50ZXN0KCdUZXN0IHByb3BlcnR5IG92ZXJyaWRlJywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAvLyBjcmVhdGUgcHJvcGVydGllc1xuICBjb25zdCBwcm9wczogRXZlbnRicmlkZ2VUb0tpbmVzaXNGaXJlaG9zZVRvUzNQcm9wcyA9IHtcbiAgICBldmVudFJ1bGVQcm9wczoge1xuICAgICAgZGVzY3JpcHRpb246ICdldmVudCBydWxlIHByb3BzJyxcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUucmF0ZShjZGsuRHVyYXRpb24ubWludXRlcyg1KSlcbiAgICB9LFxuICAgIGtpbmVzaXNGaXJlaG9zZVByb3BzOiB7XG4gICAgICBleHRlbmRlZFMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgIGJ1ZmZlcmluZ0hpbnRzOiB7XG4gICAgICAgICAgaW50ZXJ2YWxJblNlY29uZHM6IDYwMCxcbiAgICAgICAgICBzaXplSW5NQnM6IDU1XG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfSxcbiAgICBidWNrZXRQcm9wczoge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgYmxvY2tQdWJsaWNQb2xpY3k6IHRydWUsXG4gICAgICAgIGlnbm9yZVB1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICByZXN0cmljdFB1YmxpY0J1Y2tldHM6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIG5ldyBFdmVudGJyaWRnZVRvS2luZXNpc0ZpcmVob3NlVG9TMyhzdGFjaywgJ3Rlc3QtZXZlbnRicmlkZ2UtZmlyZWhvc2UtczMnLCBwcm9wcyk7XG5cbiAgZXhwZWN0KHN0YWNrKS50b0hhdmVSZXNvdXJjZShcIkFXUzo6UzM6OkJ1Y2tldFwiLCB7XG4gICAgUHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICBCbG9ja1B1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgQmxvY2tQdWJsaWNQb2xpY3k6IHRydWUsXG4gICAgICBJZ25vcmVQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgIFJlc3RyaWN0UHVibGljQnVja2V0czogdHJ1ZVxuICAgIH0sXG4gIH0pO1xuXG4gIGV4cGVjdChzdGFjaykudG9IYXZlUmVzb3VyY2VMaWtlKFwiQVdTOjpLaW5lc2lzRmlyZWhvc2U6OkRlbGl2ZXJ5U3RyZWFtXCIsIHtcbiAgICBFeHRlbmRlZFMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICBCdWZmZXJpbmdIaW50czoge1xuICAgICAgICBJbnRlcnZhbEluU2Vjb25kczogNjAwLFxuICAgICAgICBTaXplSW5NQnM6IDU1XG4gICAgICB9XG4gICAgfX0pO1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUZXN0IGJhZCBjYWxsIHdpdGggZXhpc3RpbmdCdWNrZXQgYW5kIGJ1Y2tldFByb3BzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudGVzdChcIlRlc3QgYmFkIGNhbGwgd2l0aCBleGlzdGluZ0J1Y2tldCBhbmQgYnVja2V0UHJvcHNcIiwgKCkgPT4ge1xuICAvLyBTdGFja1xuICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICBjb25zdCB0ZXN0QnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzdGFjaywgJ3Rlc3QtYnVja2V0Jywge30pO1xuXG4gIGNvbnN0IGFwcCA9ICgpID0+IHtcbiAgICAvLyBIZWxwZXIgZGVjbGFyYXRpb25cbiAgICBuZXcgRXZlbnRicmlkZ2VUb0tpbmVzaXNGaXJlaG9zZVRvUzMoc3RhY2ssIFwiYmFkLXMzLWFyZ3NcIiwge1xuICAgICAgZXZlbnRSdWxlUHJvcHM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdldmVudCBydWxlIHByb3BzJyxcbiAgICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKGNkay5EdXJhdGlvbi5taW51dGVzKDUpKVxuICAgICAgfSxcbiAgICAgIGV4aXN0aW5nQnVja2V0T2JqOiB0ZXN0QnVja2V0LFxuICAgICAgYnVja2V0UHJvcHM6IHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgICAgfSxcbiAgICB9KTtcbiAgfTtcbiAgLy8gQXNzZXJ0aW9uXG4gIGV4cGVjdChhcHApLnRvVGhyb3dFcnJvcigpO1xufSk7Il19