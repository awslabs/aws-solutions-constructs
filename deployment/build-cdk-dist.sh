#!/bin/bash
set -euo pipefail

deployment_dir="$PWD"
source_dir="$deployment_dir/../source"
dist_dir="$deployment_dir/dist"

cd $source_dir/
export PATH=$(npm bin):$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "packaging..."
time lerna run --bail --stream jsii-pacmak || fail
cd $deployment_dir/

echo "------------------------------------------------------------------------------"
echo "[Copy] CDK templates for all patterns into the deployment dir for CfnNagScan"
echo "------------------------------------------------------------------------------"

echo "mkdir -p $dist_dir"
mkdir -p $dist_dir

for subdir in $source_dir/patterns/\@aws-solutions-constructs/* ; do
  if [ -d "$subdir" -a `basename $subdir` != "node_modules" ]; then
    cd $subdir/test

    echo "Checking integ CFN templates in $subdir/test"
    cnt=`find . -name "*expected.json" -type f | wc -l`
    prefix=`basename $subdir`
    if [ "$prefix" != "core" ]
    then
      if [ "$cnt" -eq "0" ]
      then
        echo "************** [ERROR] ************* Did not find any integ CFN templates in $subdir; please add atleast one by writing an integ test case and running cdk-integ command to generate the CFN template for it"
        exit 1
      fi
    fi

    echo "Copying templates from $subdir/test"
    for i in `find . -name "*expected.json" -type f`; do
      prefix=`basename $subdir`
      suffix=`basename $i`
      cp $subdir/test/$i $dist_dir/$prefix-$suffix.template
    done
    cd $source_dir
  fi
done

echo "------------------------------------------------------------------------------"
echo "[Copy] packages for all patterns into the deployment dir"
echo "------------------------------------------------------------------------------"

echo "mkdir -p $dist_dir"
mkdir -p $dist_dir

for dir in $(find $source_dir/patterns/\@aws-solutions-constructs/ -name dist | grep -v node_modules | grep -v coverage); do
  echo "Merging ${dir} into ${dist_dir}" >&2
  rsync -a $dir/ ${dist_dir}/
done

echo "------------------------------------------------------------------------------"
echo "[List] deployment/dist contents"
echo "------------------------------------------------------------------------------"

find $dist_dir