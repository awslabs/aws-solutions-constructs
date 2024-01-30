# Contributing Guidelines

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary
information to effectively respond to your bug report or contribution.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check [existing open](https://github.com/awslabs/aws-solutions-constructs/issues), or [recently closed](https://github.com/awslabs/aws-solutions-constructs/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aclosed%20), issues to make sure somebody else hasn't already
reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

* A reproducible test case or series of steps
* The version of our code being used
* Any modifications you've made relevant to the bug
* Anything unusual about your environment or deployment


## Contributing via Pull  Requests

### Pull Request Checklist

* [ ] Testing
  - Unit test added (prefer not to modify an existing test, otherwise, it's probably a breaking change)
  - Integration test added (if adding a new pattern or making a significant update to an existing pattern)
* [ ] Docs
  - __README__: README and/or documentation topic updated
  - __Design__: For significant features, design document added to `design` folder
* [ ] Title and Description
  - __Change type__: title prefixed with **fix**, **feat** and module name in parens, which will appear in changelog
  - __Title__: use lower-case and doesn't end with a period
  - __Breaking?__: last paragraph: "BREAKING CHANGE: <describe what changed + link for details>"
  - __Issues__: Indicate issues fixed via: "**Fixes #xxx**" or "**Closes #xxx**"

---

### Step 1: Open Issue

If there isn't one already, open an issue describing what you intend to contribute. It's useful to communicate in
advance, because sometimes, someone is already working in this space, so maybe it's worth collaborating with them
instead of duplicating the efforts.

### Step 2: Design

If you are proposing a new Solutions Construct, the
best way to do this is create the full README.md document for the Construct in advance (defining all interfaces, 
the minimal deployment scenario, the architecture diagram, etc.). This will give us all the information we
need to provide feedback and the document will live on as documentation (saving you that effort labor). Not all 
groups of CDK L2 objects is a Solutions Construct - you will want to follow our [design guidelines](./DESIGN_GUIDELINES.md).

Once the design is finalized, you can re-purpose this PR for the implementation,
or open a new PR to that end.

Good AWS Solutions Constructs have the following characteristics:
  1) Multi-service: The goal of AWS Solutions Constructs is to weave multiple services together in a well-architected way. 
  2) Minimal (if any) Business Logic: AWS Solutions Constructs should be applicable to all businesses and workloads as much as possible so that they are...
  3) Reusable across multiple use-cases: We would rather have a small library of Constructs that are wildly popular with customers rather than a huge library of Constructs that customers find irrelevant.
  4) Well Architected: AWS Solutions Constructs should be secure, reliable, scalable and cost efficient.

### Step 3: Work your Magic

Now it's time to work your magic. Here are some guidelines:

* Coding style (abbreviated):
  * In general, follow the style of the code around you
  * 2 space indentation
  * 120 characters wide
  * ATX style headings in markdown (e.g. `## H2 heading`)
* Every change requires a unit test
* If you change APIs, make sure to update the module's README file
* Try to maintain a single feature/bugfix per pull request. It's okay to introduce a little bit of housekeeping
   changes along the way, but try to avoid conflating multiple features. Eventually all these are going to go into a
   single commit, so you can use that to frame your scope.
* If your change introduces a new construct, take a look at the our
  [aws-apigateway-lambda Construct](https://github.com/awslabs/aws-solutions-constructs/tree/master/source/patterns/%40aws-solutions-constructs/aws-apigateway-lambda) for an explanation of the L3 patterns we use.
  Feel free to start your contribution by copy&pasting files from that project,
  and then edit and rename them as appropriate -
  it might be easier to get started that way.
* To ensure CDKv2 compatibility of all the Solutions Constructs, please ensure the code meets the following guidelines:
  * Import statement for `Construct` is standalone, for example, `import { Construct } from '@aws-cdk/core';` instead of `import { Construct, App, Aws } from '@aws-cdk/core';`
  * Check to make sure the usage of `Construct` in the code is also standalone, for example, `export class IotToSqs extends Construct` instead of `export class IotToSqs extends cdk.Construct`
  * Core classes are imported from `@aws-cdk/core` only, for example, `import { Duration } from "@aws-cdk/core;` instead of `import { Duration } from "@aws-cdk/core/lib/duration";`
  * DO NOT USE deprecated APIs, it will not build in CDKv2, for example, using `statistic?` attribute of [@aws-cdk/aws-cloudwatch.Alarm](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html) Construct Props will fail to build in CDKv2 
  * DO NOT USE experimental modules, it will not build in CDKv2, for example, avoid using L2 constructs for [HTTP or Websocket API](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-apigatewayv2-readme.html) will fail to build in CDKv2 

#### Code coverage reports

If you are introducing a new feature such as a new pattern make sure to include your coverage report directory path into the `sonar-project.properties` file.

#### Integration Tests

Integration Tests compare the CDK synth output of a full stack using a construct to a previously generated expected template. In so doing, they-

1. Act as a regression detector. It does this by running `cdk synth` on the integration test and comparing it against
   the `*.expected.json` file. This highlights how a change affects the synthesized stacks.
2. Allow for a way to verify if the stacks are still valid CloudFormation templates, as part of an intrusive change.
   This is done by running `yarn integ` which will run `cdk deploy` across all of the integration tests in that package.
   Remember to set up AWS credentials before doing this.
3. Provide a method to validates that constructs deploy successfully. While a successful CloudFormation deployment does not
   mean that the construct functions correctly, it does protect against problems introduced by drift in the CDK or
   services themselves.

If you are working on a new feature that is using previously unused CloudFormation resource types, or involves
configuring resource types across services, you need to write integration tests that use these resource types or
features.

To the extent possible, include a section (like below) in the integration test file that specifies how the successfully
deployed stack can be verified for correctness. Correctness here implies that the resources have been set up correctly.
The steps here are usually AWS CLI commands but they need not be.

```ts
/*
 * Stack verification steps:
 * * <step-1>
 * * <step-2>
 */
```

Examples:
* [integ.deployFunction.ts](https://github.com/awslabs/aws-solutions-constructs/blob/master/source/patterns/%40aws-solutions-constructs/aws-apigateway-lambda/test/integ.deployFunction.ts)
* [integ.existingFunction.ts](https://github.com/awslabs/aws-solutions-constructs/blob/master/source/patterns/%40aws-solutions-constructs/aws-apigateway-lambda/test/integ.existingFunction.ts)

#### How To Initialize Integration Test .expected Result

Each integration test generates a .expected.json file by actually deploying the construct and extracting the template from the CFN stack. Once you’ve written your integration test, follow these steps to generate these files:

1. In the Docker build container, go to the folder for the construct you are working on (the folder with the package.json file). The Docker build container must be initialized and allow-partial-builds.sh run.
2. Configure the CLI within the Docker container using `aws configure`. You will need an access key with enough privileges to launch everything in
   your stack and call CloudFormation – admin access is probably the surest way to get this.
3. Run the commands `npm run build && npm run integ`. The code will be compiled and each integration test stack will
   be deployed, the template gathered from CloudFormation as the expected result and the stack destroyed. You will see `integ.your-test-name.expected.json` files appear in the project for each test.

The standard `npm run build+lint+test` command will compare the cdk synth output against the .expected.json file. The Solutions Constructs team will run `npm run integ` in each construct periodically to guard against drift and ensure each construct still deploys.

NOTE: Running `npm run integ` will launch a stack including the construct for each integration test. It will also delete the stack after collecting the CloudFormation template. While the stack will only be around for a few seconds, during this time you account will be billed for the resources. Some tests may leave behind an S3 bucket - you should check after running this step. Ideally, 

### Step 4: Commit

Create a commit with the proposed changes:

* Commit title and message (and PR title and description) must adhere to [conventionalcommits](https://www.conventionalcommits.org).
  * The title must begin with `feat(module): title`, `fix(module): title`, `refactor(module): title` or
    `chore(module): title`.
  * Title should be lowercase.
  * No period at the end of the title.

* Commit message should describe _motivation_. Think about your code reviewers and what information they need in
  order to understand what you did. If it's a big commit (hopefully not), try to provide some good entry points so
  it will be easier to follow.

* Commit message should indicate which issues are fixed: `fixes #<issue>` or `closes #<issue>`.

* Shout out to collaborators.

* If not obvious (i.e. from unit tests), describe how you verified that your change works.

* If this commit includes breaking changes, they must be listed at the end in the following format (notice how multiple breaking changes should be formatted):

```
BREAKING CHANGE: Description of what broke and how to achieve this behavior now
* **module-name:** Another breaking change
* **module-name:** Yet another breaking change
```

### Step 5: Pull Request

* Push to a GitHub fork
* Submit a Pull Requests on GitHub.
* Please follow the PR checklist written above. We trust our contributors to self-check, and this helps that process!
* Discuss review comments and iterate until you get at least one “Approve”. When iterating, push new commits to the
  same branch. Usually all these are going to be squashed when you merge to master. The commit messages should be hints
  for you when you finalize your merge commit message.
* Make sure to update the PR title/description if things change. The PR title/description are going to be used as the
  commit title/message and will appear in the CHANGELOG, so maintain them all the way throughout the process.
* Make sure your PR builds successfully (we have CodeBuild setup to automatically build all PRs)

#### CodeBuild Build steps

The CodeBuild runs through the following build steps:
* Content scanning using Viperlight utility. It is a security, vulnerability and general risk highlighting tool. The source code for utility is located [here](https://viperlight-scanner.s3.amazonaws.com/latest/viperlight.zip) It uses [.viperlightignore](https://github.com/awslabs/aws-solutions-constructs/blob/master/.viperlightignore) to override any false alarms.
* Build/validate/package all the constructs in the library
* Scan the Cloudformation templates generated by [Integration Tests](https://github.com/awslabs/aws-solutions-constructs/blob/master/CONTRIBUTING.md#integration-tests) using (cfn_nag)[https://github.com/stelligent/cfn_nag]

### Step 6: Merge

* Once approved and tested, a maintainer will squash-merge to master and will use your PR title/description as the
  commit message.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Building Pattern(s)

### Versioning

All `package.json` files in this repo use a stable marker version of `0.0.0`. This means that when you declare dependencies, you should always use `0.0.0`. This makes it easier for us to bump a new version and also reduces the chance of merge conflicts after a new version is released.

Additional scripts that take part in the versioning mechanism:

- `deployment/v2/get-sc-version.js` can be used to obtain the actual version of the repo. You can use either from JavaScript code by `require('./deployment/v2/get-sc-version')` or from a shell script `node -p "require('./deployment/v2/get-sc-version')"`.
- `deployment/v2/get-version-placeholder.js` returns `0.0.0` and used to DRY the version marker.
- `deployment/v2/align-version.sh` and `deployment/v2/align-version.js` are used to align all package.json files in the repo to the official version. This script is invoked in from `build-patterns.sh`, first time before the build process to replace the versions from marker version (`0.0.0`) to the release version e.g. `2.13.0` and then the second time at the end of the build process to revert the versions back from release version e.g. `2.13.0` to marker version (`0.0.0`).

### Full Build

```console
$ cd <root-of-aws-solutions-constructs-repo>
$ docker run -u root --rm --net=host -it -v $PWD:$PWD -w $PWD jsii/superchain:1-buster-slim-node16
# The build-patterns.sh command can take along time, be sure to allocate enough resources in the Docker dashboard
# (6 CPUs is good)
docker$ ./deployment/v2/build-patterns.sh
# At this point the container is configured and ready to work on. 
# To work on a specific construct, execute the Partial Build steps below
```

### Partial Build

First run a clean Full Build before doing the partial build (the full build installs all the tools required 
to build the library). Once you've initialized the Docker container by running a full build, you can
build and test individual constructs by following the steps below.

```console
$ cd <root-of-aws-solutions-constructs-repo>
$ docker run -u root --rm --net=host -it -v $PWD:$PWD -w $PWD jsii/superchain:1-buster-slim-node16
docker$ source ./deployment/v2/allow-partial-builds.sh
docker$ cd my-module
docker$ npm run build+lint+test
```

## Code of Conduct
This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.


## Security issue notifications
If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.


## Licensing

See the [LICENSE](https://github.com/awslabs/aws-solutions-constructs/blob/master/LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.

We may ask you to sign a [Contributor License Agreement (CLA)](http://en.wikipedia.org/wiki/Contributor_License_Agreement) for larger changes.
