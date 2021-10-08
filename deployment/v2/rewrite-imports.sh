#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

if [ ! -d $source_dir/tools/aws-cdk-migration/node_modules ]; then
  echo "============================================================================================="
  echo "building aws-cdk-migration..."
  cd $source_dir/tools/aws-cdk-migration
  npm install
  npm run build
  npm link
else
  cd $source_dir/tools/aws-cdk-migration
  npm link
fi

cd $source_dir/

if [ $# -eq 0 ]; then
    echo "Migrating TypeScript import statements from modular CDK (i.e. @aws-cdk/aws-s3) to aws-cdk-lib (i.e. aws-cdk-lib)"
    for subdir in $source_dir/patterns/\@aws-solutions-constructs/* ; do
      if [ -d "$subdir" -a `basename $subdir` != "node_modules" ]; then
        echo $subdir
        rewrite-imports-v2 $subdir/**/*.ts
      fi
    done
    for subdir in $source_dir/tools/cdk-integ-tools/* ; do
      if [ -d "$subdir" -a `basename $subdir` != "node_modules" ]; then
        echo $subdir
        rewrite-imports-v2 $subdir/**/*.ts
      fi
    done
else
    echo "Reverting back TypeScript import statements for CDK v2"
    # This command is required ONLY for the local development and it fails in CodePipeline
    if [[ -z "${CODEBUILD_BUILD_ID+x}" ]]; then
      git checkout `find . -name *.ts | grep -v node_modules | grep -v -F .d.ts`
    fi
fi
