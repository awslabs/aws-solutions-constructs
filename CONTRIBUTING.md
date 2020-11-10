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


## Contributing via Pull Requests

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

### Step 2: Design (optional)

In some cases, it is useful to seek for feedback by iterating on a design document. This is useful
when you plan a big change or feature, or you want advice on what would be the best path forward.

Sometimes, the GitHub issue is sufficient for such discussions, and can be sufficient to get
clarity on what you plan to do. Sometimes, a design document would work better, so people can provide
iterative feedback.

In such cases, use the GitHub issue description to collect **requirements** and
**use cases** for your feature.

Then, create a design document in markdown format under the `design/` directory
and request feedback through a pull request. 

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

#### Integration Tests

Integration tests perform a few functions in the CDK code base -
1. Acts as a regression detector. It does this by running `cdk synth` on the integration test and comparing it against
   the `*.expected.json` file. This highlights how a change affects the synthesized stacks.
2. Allows for a way to verify if the stacks are still valid CloudFormation templates, as part of an intrusive change.
   This is done by running `yarn integ` which will run `cdk deploy` across all of the integration tests in that package.
   Remember to set up AWS credentials before doing this.
3. (Optionally) Acts as a way to validate that constructs set up the CloudFormation resources as expected. A successful
   CloudFormation deployment does not mean that the resources are set up correctly.

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

- `deployment/get-version.js` can be used to obtain the actual version of the repo. You can use either from JavaScript code by `require('./deployment/get-version')` or from a shell script `node -p "require('./deployment/get-version')"`.
- `deployment/get-version-marker.js` returns `0.0.0` and used to DRY the version marker.
- `deployment/align-version.sh` and `deployment/align-version.js` are used to align all package.json files in the repo to the official version. This script is invoked in from `build-patterns.sh`, first time before the build process to replace the versions from marker version (`0.0.0`) to the release version e.g. `1.71.0` and then the second time at the end of the build process to revert the versions back from release version e.g. `1.71.0` to marker version (`0.0.0`).

### Full Build

```console
$ cd <root-of-aws-solutions-constructs-repo>
$ docker run --rm --net=host -it -v $PWD:$PWD -w $PWD jsii/superchain
docker$ ./deployment/build-patterns.sh
docker$ exit
```

### Partial Build

First run a clean Full Build before doing the partial build.

```console
$ cd <root-of-aws-solutions-constructs-repo>
$ docker run --rm --net=host -it -v $PWD:$PWD -w $PWD jsii/superchain
docker$ ./deployment/align-version.sh
docker$ cd source
docker$ export PATH=$(npm bin):$PATH
docker$ cd patterns/@aws-solutions-constructs/my-module
docker$ npm run build+lint+test
docker$ ../../../../deployment/align-version.sh revert
docker$ exit
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
