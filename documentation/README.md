This is the content for the [AWS Solutions Constructs documentation](https://docs.aws.amazon.com/solutions/latest/constructs/api-reference.html) on the AWS site.

**Documentation Files**

There are two classifications of pages that are published from here to the AWS documentation web site:

* Individual Construct Documentation - these files describe the behavior of a specific construct. The gold source for this information is the README.adoc files found in the source/patterns/@aws-solutions-constructs child folders. When publish-docs.sh is run, these files are gathered and minor edits are implemented to customize them for the AWS web site structure. DO NOT EDIT THESE FILES - to change the documentation for a construct, update the README.adoc in the appropriate folder.
* General Documentation Files - these are files that make up the rest of the documentation site - the walkthroughs, the home page, etc. This folder is the gold source for these files and any edits to these files can be made here.

**Publishing the Latest Documentation**

When you have made changes to the documentation for a construct, or created a new construct, you will need to publish the new documentation. That's a 2 step process that involves updating this folder with the latest version of all the README.adoc files; then publishing this content to the AWS documentation web site.

*Updating this folder*
* Be within a PR - if you are updating a construct then you are probably already in a PR. If you are updating the general documentation then you will want to do that within a branch and make a PR to push your changes to github.
* Run `./deployment/v2/publish-docs.sh` from the aws-solutions-constructs folder.
* Commit and push any files in this folder.
*  Get the PR approved and merge.

  *Publish to Web Site*

  This is an internal AWS process, follow the step on the Publishing Web Site Documentation wiki page.

  Note: this file is a markdown file, so it will not be published to the AWS web site.
  