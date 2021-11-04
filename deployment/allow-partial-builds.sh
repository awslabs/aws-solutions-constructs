#!/bin/bash

result=${PWD##*/}          # to assign to a variable

(return 0 2>/dev/null) && sourced=1 || sourced=0

if [ $sourced -ne 1 ]
then
  echo 
  echo
  echo 'Error - You must run this script with the source directive:'
  echo 
  echo '       source ./deployment/allow-partial-builds.sh'
  echo
elif [ $result != 'aws-solutions-constructs' ]
then
  echo 
  echo
  echo 'Error - You must run this script from the aws-solutions-constructs folder.'
  echo
else
  ./deployment/align-version.sh
  cd source
  export PATH=$(npm bin):$PATH
  cd  patterns/@aws-solutions-constructs
fi
