packagess="
deep-diff
deepmerge
npmlog
"

mkdir node_modules
for package in $packagess; do
  echo "Installing $package"
  cp -r ../../../node_modules/$package ./node_modules/
done
