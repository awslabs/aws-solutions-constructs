#!/bin/bash

result=${PWD##*/}          # to assign to a variable

(return 0 2>/dev/null) && sourced=1 || sourced=0

if [ $sourced -ne 1 ]
then
  echo 'You must source this script'
elif [ $result != 'aws-solutions-constructs' ]
then
  echo 'You must run this script from the aws-solutions-constructs folder.'
else
  ./deployment/align-version.sh
  cd source
  export PATH=$(npm bin):$PATH
  cd  patterns/@aws-solutions-constructs
fi
