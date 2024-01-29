echo This is high risk, intended use only when working 
echo on build/deployment issues where we need a reset and 
echo where the risk is low if this has unintended effects.
echo
echo Use at your own risk...
echo
read -p "Press key to continue.. " -n1 -s


rm ./*/*/*/*/lib/*.js
rm ./*/*/*/*/lib/*.d.ts
rm ./*/*/*/*/test/*.js
rm ./*/*/*/*/test/*.d.ts
rm ./*/*/*/*/.jsii
rm ./*/*/*/*/tsconfig.json
rm ./*/*/*/*/tsconfig.tsbuildinfo
find . -depth -name "node_modules" -exec rm -r {} +
find . -depth -name "coverage" -exec rm -r {} +
find . -depth -name "dist" -exec rm -r {} +
