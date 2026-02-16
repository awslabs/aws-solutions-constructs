#!/usr/bin/env ts-node
/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

/**
 * This script generates validation.ts by extracting property names from CDK interfaces.
 * It uses the TypeScript Compiler API to parse .d.ts files and extract interface members.
 * 
 * Why: Keeps validation in sync with actual CDK interfaces without manual maintenance.
 * How: Parses TypeScript AST (Abstract Syntax Tree) to find interface declarations.
 * 
 * THIS CODE IS NOT PUBLISHED IN CONSTRUCTS!!!
 */

import ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we reconstruct it from import.meta.url
// fileURLToPath converts file:// URL to a filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Declared here because 7 is constant across Typescript versions, but ES2020 varies
const ES2020 = 7;

/**
 * Configuration for each CDK interface we want to extract.
 * 
 * @property interfaceName - The TypeScript interface name to search for
 * @property module - The CDK module name (e.g., 'aws-s3')
 * @property filePath - Relative path within aws-cdk-lib to the .d.ts file
 * @property exportName - The variable name for the generated Set in validation.ts
 */
interface InterfaceConfig {
  interfaceName: string;
  module: string;
  filePath: string;
  exportName: string;
}

/**
 * List of CDK interfaces to extract properties from.
 * Add new entries here to generate validation for additional CDK constructs.
 */
const INTERFACES_TO_EXTRACT: InterfaceConfig[] = [
  {
    interfaceName: 'BucketProps',
    module: 'aws-s3',
    filePath: 'aws-s3/lib/bucket.d.ts',
    exportName: 'validBucketProps'
  },
  {
    interfaceName: 'FunctionProps',
    module: 'aws-lambda',
    filePath: 'aws-lambda/lib/function.d.ts',
    exportName: 'validFunctionProps'
  },
  {
    interfaceName: 'RestApiProps',
    module: 'aws-apigateway',
    filePath: 'aws-apigateway/lib/restapi.d.ts',
    exportName: 'validRestApiProps'
  },
  {
    interfaceName: 'QueueProps',
    module: 'aws-sqs',
    filePath: 'aws-sqs/lib/queue.d.ts',
    exportName: 'validQueueProps'
  },
  {
    interfaceName: 'TableProps',
    module: 'aws-dynamodb',
    filePath: 'aws-dynamodb/lib/table.d.ts',
    exportName: 'validTableProps'
  },
  {
    interfaceName: 'StreamProps',
    module: 'aws-kinesis',
    filePath: 'aws-kinesis/lib/stream.d.ts',
    exportName: 'validStreamProps'
  },
  {
    interfaceName: 'CfnDeliveryStreamProps',
    module: 'aws-kinesisfirehose',
    filePath: 'aws-kinesisfirehose/lib/kinesisfirehose.generated.d.ts',
    exportName: 'validCfnDeliveryStreamProps'
  },
  {
    interfaceName: 'LogGroupProps',
    module: 'aws-logs',
    filePath: 'aws-logs/lib/log-group.d.ts',
    exportName: 'validLogGroupProps'
  },
  {
    interfaceName: 'TopicProps',
    module: 'aws-sns',
    filePath: 'aws-sns/lib/topic.d.ts',
    exportName: 'validTopicProps'
  }
];

/**
 * Searches upward from the current directory to find node_modules.
 * 
 * Why: The script may be run from different locations, so we can't hardcode the path.
 * How: Walks up the directory tree until we find node_modules or hit the root.
 * 
 * @returns Absolute path to node_modules directory
 * @throws Error if node_modules is not found
 */
function findNodeModulesPath(): string {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    const nodeModulesPath = path.join(currentDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('node_modules not found');
}

// Cache for the CDK library path to avoid repeated lookups
let cachedCdkLibPath: string | null = null;

/**
 * Finds and caches the aws-cdk-lib path within node_modules.
 * 
 * Why: The CDK library path doesn't change during execution, so we cache it.
 * How: Calculates the path once, then reuses the cached value on subsequent calls.
 * 
 * @returns Absolute path to aws-cdk-lib directory
 * @throws Error if aws-cdk-lib is not found
 */
function findCdkLibPath(): string {
  if (cachedCdkLibPath !== null) {
    return cachedCdkLibPath;
  }

  const nodeModulesPath = findNodeModulesPath();
  const cdkLibPath = path.join(nodeModulesPath, 'aws-cdk-lib');

  if (!fs.existsSync(cdkLibPath)) {
    throw new Error('aws-cdk-lib not found in node_modules. Run: npm install aws-cdk-lib');
  }

  cachedCdkLibPath = cdkLibPath;
  return cdkLibPath;
}

/**
 * Locates the .d.ts file for a specific CDK interface.
 * 
 * Why: We need the full path to read and parse the TypeScript definition file.
 * How: Combines cached CDK library path with the interface-specific file path.
 * 
 * @param config - Configuration specifying which interface file to find
 * @returns Absolute path to the .d.ts file
 * @throws Error if the specific file is not found
 */
function findInterfaceFile(config: InterfaceConfig): string {
  const cdkLibPath = findCdkLibPath();
  const fullPath = path.join(cdkLibPath, config.filePath);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  throw new Error(`Could not find ${config.interfaceName} definition file at ${fullPath}`);
}

/**
 * Extracts property names from a TypeScript interface using the TS Compiler API.
 * 
 * Why: We need to parse TypeScript AST to reliably extract interface members.
 * How: Uses the visitor pattern to traverse the AST and find interface declarations.
 *      Exits early once the target interface is found for performance.
 * 
 * The TypeScript AST (Abstract Syntax Tree) represents code as a tree structure:
 * - Each node represents a language construct (interface, property, etc.)
 * - We recursively visit nodes to find what we're looking for
 * 
 * @param sourceFile - Parsed TypeScript source file (AST root)
 * @param interfaceName - Name of the interface to search for
 * @returns Array of property names found in the interface
 */
function extractInterfaceProperties(sourceFile: ts.SourceFile, interfaceName: string): string[] {
  const properties: string[] = [];
  let found = false;

  /**
   * Recursive visitor function that traverses the AST.
   * 
   * Why: The interface we want could be anywhere in the file.
   * How: Checks each node, and if it's not what we want, visits its children.
   *      Returns early once the interface is found to avoid unnecessary traversal.
   * 
   * This is the "visitor pattern" - a common way to traverse tree structures.
   */
  function visit(node: ts.Node): void {
    // Early exit if we've already found the interface
    if (found) {
      return;
    }

    // Check if this node is an interface declaration with the name we're looking for
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      // Found it! Now extract all property names from this interface
      node.members.forEach(member => {
        // Check if this member is a property signature (not a method, index signature, etc.)
        if (ts.isPropertySignature(member) && member.name) {
          // Check if the property name is a simple identifier (not computed)
          if (ts.isIdentifier(member.name)) {
            properties.push(member.name.text);
          }
        }
      });
      // Mark as found so we don't continue traversing
      found = true;
      return;
    }
    // Continue traversing the tree by visiting all child nodes
    // Only if we haven't found the interface yet
    ts.forEachChild(node, visit);
  }

  // Start the traversal from the root of the AST
  visit(sourceFile);
  return properties;
}

/**
 * Generates the complete validation.ts file content.
 * 
 * Why: We need to create both the property Sets and validation functions.
 * How: Builds the file as a string with proper formatting and structure.
 * 
 * @param results - Map of export names to their configs and extracted properties
 * @returns Complete TypeScript source code for validation.ts
 */
function generateValidationFile(results: Map<string, { config: InterfaceConfig; properties: string[] }>): string {
  const propsSets: string[] = [];
  const validationFunctions: string[] = [];

  // Generate code for each interface we processed
  for (const [exportName, { config, properties }] of results) {
    // Generate the Set of valid property names
    // Example: export const validBucketProps: Set<string> = new Set([...])
    propsSets.push(`// ${config.interfaceName} from aws-cdk-lib/${config.module}
export const ${exportName}: Set<string> = new Set([
${properties.map(prop => `  '${prop}'`).join(',\n')}
]);`);

    // Generate the validation function name by replacing 'valid' with 'Validate'
    // Example: validBucketProps -> ValidateBucketProps
    const functionName = exportName.replace('valid', 'Validate');

    // Generate the validation function that uses the shared ValidateProps implementation
    // Pass the Props type name for better error messages
    // Target is optional - validation is skipped if target is undefined
    validationFunctions.push(`export function ${functionName}(target?: any): void {
  ValidateProps(target, ${exportName}, '${config.interfaceName}');
}`);
  }
  console.log('returning the new text');
  // Assemble the complete file with header, Sets, shared function, and specific functions
  return `/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// This file is auto-generated by scripts/generate-validation.ts
// Do not edit manually - run 'npm run generate:validation' to regenerate
//
// This file encodes the CDK Props interface definitions into data structures that
// can be used at runtime to validate the attributes of incoming CDK Props objects,
// since the use of | any in the definitions prevents validation at transpilation time
//
// It also provides functions that will perform the validation on each Props object type
// parsed

${propsSets.join('\n\n')}

// Shared validation implementation
// Target can be undefined - validation is skipped if target is undefined
export function ValidateProps(target: any | undefined, validProps: Set<string>, propsTypeName: string): void {
  if (!target) {
    return;
  }
  for (const key in target) {
    if (!validProps.has(key)) {
      throw new Error(\`ERROR - \${key} is not a valid property of \${propsTypeName}\`);
    }
  }
}

// Validation functions
${validationFunctions.join('\n\n')}
`;
}

/**
 * Main execution function that orchestrates the entire generation process.
 * 
 * Process:
 * 1. Determine output file path (accounting for compiled script location)
 * 2. Loop through each interface configuration
 * 3. Find and parse the .d.ts file
 * 4. Extract property names using TypeScript AST
 * 5. Generate and write the validation.ts file
 * 
 * Error handling: Continues processing other interfaces if one fails.
 */
function main() {
  try {
    // When compiled, script is in scripts/dist, so we need to go up two levels
    // to reach the project root, then down into src/
    // TODO: This will need changing in Constructs
    const projectRoot = path.join(__dirname, '../../..');
    const outputFilePath = path.join(projectRoot, 'patterns/@aws-solutions-constructs/core/lib/validation.ts');

    const results = new Map<string, { config: InterfaceConfig; properties: string[] }>();

    console.log('Extracting interface properties from aws-cdk-lib...\n');

    // Process each configured interface
    for (const config of INTERFACES_TO_EXTRACT) {
      try {
        const sourceFilePath = findInterfaceFile(config);
        console.log(`Reading ${config.interfaceName} from: ${sourceFilePath}`);

        // Read the .d.ts file as text
        const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

        // Parse the TypeScript code into an AST (Abstract Syntax Tree)
        // ts.createSourceFile parameters:
        // - fileName: Used for error messages
        // - sourceText: The actual TypeScript code
        // - languageVersion: 7 = ES2020 (numeric for compatibility across TS versions)
        // - setParentNodes: true = enables parent node references in the AST
        const sourceFile = ts.createSourceFile(
          sourceFilePath,
          sourceCode,
          ES2020,
          true
        );

        // Extract properties from the interface using AST traversal
        const properties = extractInterfaceProperties(sourceFile, config.interfaceName);

        if (properties.length === 0) {
          console.warn(`  ⚠ Warning: No properties found in ${config.interfaceName} interface`);
          continue;
        }

        // Store the results for this interface
        results.set(config.exportName, { config, properties });
        console.log(`  ✓ Found ${properties.length} properties`);
      } catch (error) {
        // Log error but continue processing other interfaces
        console.error(`  ✗ Error processing ${config.interfaceName}:`, error instanceof Error ? error.message : error);
      }
    }

    // Ensure we successfully processed at least one interface
    if (results.size === 0) {
      console.error('\nError: No interfaces were successfully processed');
      process.exit(1);
    }

    // Generate the complete validation.ts file content
    const validationCode = generateValidationFile(results);

    // Write the generated code to the file system
    fs.writeFileSync(outputFilePath, validationCode, 'utf-8');

    // Print summary of what was generated
    console.log(`\n✓ Generated validation.ts with ${results.size} interface(s)`);
    for (const [exportName, { properties }] of results) {
      console.log(`  - ${exportName}: ${properties.length} properties`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Execute the main function
main();
