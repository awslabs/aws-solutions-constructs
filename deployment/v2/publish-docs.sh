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

find source/patterns -name "README.adoc" -type f | while read file; do
    # Get the parent directory name
    dir_name=$(dirname "$file")
    parent_dir=$(basename "$dir_name")
    
    # Check if parent_dir is in IGNORE_LIST and continue if found
    if [[ $IGNORE_LIST =~ (^|[[:space:]])$parent_dir($|[[:space:]]) ]]; then
        continue
    fi
    
    # Copy the file with the new name
    cp "$file" "documentation/${parent_dir}.adoc"
    cp "${dir_name}/${parent_dir}.png" "documentation/images/"

    # perl -i -0pe "s/© Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.\n/\n/g" "documentation/${parent_dir}.adoc"

    perl -i -pe "s/^image::aws-/image::images\/aws-/g" "documentation/${parent_dir}.adoc"

    perl -i -pe "s/^\/\/ github block/image::images\/GitHub-Mark-32px.png\[The github logo.,scaledwidth=100%\]/g" "documentation/${parent_dir}.adoc"
#    perl -i -pe "s/^\/\/ github block/\[[github,topic.title]]\n== GitHub\n\n[cols="1,1", options="header"\]\n|===\n| \nTo view the code for this pattern, create\/view issues and pull requests, and more:\n\n\n\n|\n\n\n\nimage::images\/GitHub-Mark-32px.png\[The github logo.,scaledwidth=100%]\n\n|https:\/\/github.com\/awslabs\/aws-solutions-constructs\/tree\/master\/source\/patterns\/%40aws-solutions-constructs\/aws-${parent_dir}[@aws-solutions-constructs${parent_dir}]\n\|===/g" "documentation/${parent_dir}.adoc"

done
