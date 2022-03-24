## Customizations that need to be reapplied whenever cdk-integ is refreshed from [CDK] (https://github.com/aws/aws-cdk/tree/master/tools/%40aws-cdk/cdk-integ-tools)

**Provide additional cdk synth options for V1 scripts to ensure output templates match for both V1 and V2**
[bin/cdk-integ.ts](https://github.com/awslabs/aws-solutions-constructs/blob/main/source/tools/cdk-integ-tools/bin/cdk-integ.ts)
* add line `import * as deepmerge from 'deepmerge';`
* Modify `await test.cdkSynthFast` to pass in additional synth options e.g. `'@aws-cdk/aws-kms:defaultKeyPolicies': true,`

[bin/cdk-integ-assert.ts](https://github.com/awslabs/aws-solutions-constructs/blob/main/source/tools/cdk-integ-tools/bin/cdk-integ-assert.ts)
* add line `import * as deepmerge from 'deepmerge';`
* Modify `await test.cdkSynthFast` to pass in additional synth options e.g. `'@aws-cdk/aws-kms:defaultKeyPolicies': true,`

**Do not enable FUTURE_FLAGS and TARGET_PARTITIONS in DEFAULT_SYNTH_OPTIONS**
[lib/integ-helpers.ts] (https://github.com/awslabs/aws-solutions-constructs/blob/main/source/tools/cdk-integ-tools/lib/integ-helpers.ts)
* Remove references for `...FUTURE_FLAGS` and `TARGET_PARTITIONS`, it breaks the `cdk-integ-assert-v2`

**Check for Lambda Functions to Ignore**
[lib/canonicalize-assets.ts] (https://github.com/awslabs/aws-solutions-constructs/blob/main/source/tools/cdk-integ-tools/lib/canonicalize-assets.ts)
* add line `import { LIST_OF_IGNORED_LAMBDA_PREFIXES } from "./integ-helpers";`
* add `hideIgnoredResources()`
* add `checkIgnoreList()`

[lib/integ-helpers.ts] (https://github.com/awslabs/aws-solutions-constructs/blob/main/source/tools/cdk-integ-tools/lib/integ-helpers.ts)
* Add section with `LIST_OF_IGNORED_LAMBDA_PREFIXES`