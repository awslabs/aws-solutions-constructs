#!/bin/bash
set -e
set -o xtrace

# This script updates the documentation folder with the latest info from
# README.adoc and architecture diagrams in the Constructs folders.
#
# To do so, it copies all the Construct README.adoc files from their folders
# under @aws-solutions-constructs to the documentation, updating the name to
# the name of the construct. Then it copies all the architecture .png files
# to documenation/images. It then runs perl scripts to
#   remove the copyright notice
#   point the link for  the architecture diagram to images
#   add the github section

# Check starting folder is aws-solutions-constructs
if [ "$(basename $(pwd))" != "aws-solutions-constructs" ]; then
    echo "This script must be run from the top level (aws-solutions-constructs) folder"
    exit 1
fi

# README files we don't put on the web site
IGNORE_LIST="
core
resources
"

find source/patterns -name "README.md" -type f | while read file; do
    # Get the parent directory name
    dir_name=$(dirname "$file")
    parent_dir=$(basename "$dir_name")
    
    # Check if parent_dir is in IGNORE_LIST and continue if found
    if [[ $IGNORE_LIST =~ (^|[[:space:]])$parent_dir($|[[:space:]]) ]]; then
        continue
    fi
    
    perl -i -pe "s/\.adoc/\.adoc)/g" $file
done
