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
import { getDirName } from './get-dirname.js';

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
export interface InterfaceConfig {
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
    interfaceName: 'ApplicationLoadBalancerProps',
    module: 'aws-elasticloadbalancingv2',
    filePath: 'aws-elasticloadbalancingv2/lib/alb/application-load-balancer.d.ts',
    exportName: 'validApplicationLoadBalancerProps'
  },
  {
    interfaceName: 'ApplicationListenerProps',
    module: 'aws-elasticloadbalancingv2',
    filePath: 'aws-elasticloadbalancingv2/lib/alb/application-listener.d.ts',
    exportName: 'validApplicationListenerProps'
  },
  {
    interfaceName: 'ContainerDefinitionProps',
    module: 'aws-ecs',
    filePath: 'aws-ecs/lib/container-definition.d.ts',
    exportName: 'validContainerDefinitionProps'
  },
  {
    interfaceName: 'FargateTaskDefinitionProps',
    module: 'aws-ecs',
    filePath: 'aws-ecs/lib/fargate/fargate-task-definition.d.ts',
    exportName: 'validFargateTaskDefinitionProps'
  },
  {
    interfaceName: 'FargateServiceProps',
    module: 'aws-ecs',
    filePath: 'aws-ecs/lib/fargate/fargate-service.d.ts',
    exportName: 'validFargateServiceProps'
  },
  {
    interfaceName: 'LambdaRestApiProps',
    module: 'aws-apigateway',
    filePath: 'aws-apigateway/lib/lambda-api.d.ts',
    exportName: 'validLambdaRestApiProps'
  },
  {
    interfaceName: 'RestApiProps',
    module: 'aws-apigateway',
    filePath: 'aws-apigateway/lib/restapi.d.ts',
    exportName: 'validRestApiProps'
  },
  {
    interfaceName: 'DistributionProps',
    module: 'aws-cloudfront',
    filePath: 'aws-cloudfront/lib/distribution.d.ts',
    exportName: 'validDistributionProps'
  },
  {
    interfaceName: 'UserPoolClientProps',
    module: 'aws-cognito',
    filePath: 'aws-cognito/lib/user-pool-client.d.ts',
    exportName: 'validUserPoolClientProps'
  },
  {
    interfaceName: 'DynamoEventSourceProps',
    module: 'aws-lambda-event-sources',
    filePath: 'aws-lambda-event-sources/lib/dynamodb.d.ts',
    exportName: 'validDynamoEventSourceProps'
  },
  {
    interfaceName: 'CfnPipeProps',
    module: 'aws-pipes',
    filePath: 'aws-pipes/lib/pipes.generated.d.ts',
    exportName: 'validCfnPipeProps'
  },
  {
    interfaceName: 'CfnDeliveryStreamProps',
    module: 'aws-kinesisfirehose',
    filePath: 'aws-kinesisfirehose/lib/kinesisfirehose.generated.d.ts',
    exportName: 'validCfnDeliveryStreamProps'
  },
  {
    interfaceName: 'StreamProps',
    module: 'aws-kinesis',
    filePath: 'aws-kinesis/lib/stream.d.ts',
    exportName: 'validStreamProps'
  },
  {
    interfaceName: 'CfnJobProps',
    module: 'aws-glue',
    filePath: 'aws-glue/lib/glue.generated.d.ts',
    exportName: 'validCfnJobProps'
  },
  {
    interfaceName: 'KinesisEventSourceProps',
    module: 'aws-lambda-event-sources',
    filePath: 'aws-lambda-event-sources/lib/kinesis.d.ts',
    exportName: 'validKinesisEventSourceProps'
  },
  {
    interfaceName: 'CfnCacheClusterProps',
    module: 'aws-elasticache',
    filePath: 'aws-elasticache/lib/elasticache.generated.d.ts',
    exportName: 'validCfnCacheClusterProps'
  },
  {
    interfaceName: 'CfnIndexProps',
    module: 'aws-kendra',
    filePath: 'aws-kendra/lib/kendra.generated.d.ts',
    exportName: 'validCfnIndexProps'
  },
  {
    interfaceName: 'CfnDataSourceProps',
    module: 'aws-kendra',
    filePath: 'aws-kendra/lib/kendra.generated.d.ts',
    exportName: 'validCfnDataSourceProps'
  },
  {
    interfaceName: 'TopicProps',
    module: 'aws-sns',
    filePath: 'aws-sns/lib/topic.d.ts',
    exportName: 'validTopicProps'
  },
  {
    interfaceName: 'KeyProps',
    module: 'aws-kms',
    filePath: 'aws-kms/lib/key.d.ts',
    exportName: 'validKeyProps'
  },
  {
    interfaceName: 'VpcProps',
    module: 'aws-ec2',
    filePath: 'aws-ec2/lib/vpc.d.ts',
    exportName: 'validVpcProps'
  },
  {
    interfaceName: 'CfnModelProps',
    module: 'aws-sagemaker',
    filePath: 'aws-sagemaker/lib/sagemaker.generated.d.ts',
    exportName: 'validCfnModelProps'
  },
  {
    interfaceName: 'PrivateHostedZoneProps',
    module: 'aws-route53',
    filePath: 'aws-route53/lib/hosted-zone.d.ts',
    exportName: 'validPrivateHostedZoneProps'
  },
  {
    interfaceName: 'QueueProps',
    module: 'aws-sqs',
    filePath: 'aws-sqs/lib/queue.d.ts',
    exportName: 'validQueueProps'
  },
  {
    interfaceName: 'CfnWebACLProps',
    module: 'aws-wafv2',
    filePath: 'aws-wafv2/lib/wafv2.generated.d.ts',
    exportName: 'validCfnWebACLProps'
  }
];

/**
 * Searches upward from the current directory to find node_modules.
 * 
 * Why: The script may be run from different locations, so we can't hardcode the path.
 * How: Walks up the directory tree until we find node_modules or hit the root.
 * 
 * @param startDir - Directory to start searching from
 * @returns Absolute path to node_modules directory
 * @throws Error if node_modules is not found
 */
export function findNodeModulesPath(startDir: string): string {
  let currentDir = startDir;
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
 * @param startDir - Directory to start searching from
 * @returns Absolute path to aws-cdk-lib directory
 * @throws Error if aws-cdk-lib is not found
 */
export function findCdkLibPath(startDir: string): string {
  if (cachedCdkLibPath !== null) {
    return cachedCdkLibPath;
  }

  const nodeModulesPath = findNodeModulesPath(startDir);
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
 * @param startDir - Directory to start searching from
 * @returns Absolute path to the .d.ts file
 * @throws Error if the specific file is not found
 */
export function findInterfaceFile(config: InterfaceConfig, startDir: string): string {
  const cdkLibPath = findCdkLibPath(startDir);
  const fullPath = path.join(cdkLibPath, config.filePath);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  throw new Error(`Could not find ${config.interfaceName} definition file at ${fullPath}`);
}

/**
 * Extracts property names from a TypeScript interface using the TS Compiler API.
 * Now includes properties from parent interfaces (extends clause), including cross-file inheritance.
 * 
 * Why: We need to parse TypeScript AST to reliably extract interface members,
 *      including inherited properties that users can set.
 * How: Uses the visitor pattern to traverse the AST and find interface declarations.
 *      Recursively extracts properties from parent interfaces, following imports to other files.
 * 
 * The TypeScript AST (Abstract Syntax Tree) represents code as a tree structure:
 * - Each node represents a language construct (interface, property, etc.)
 * - We recursively visit nodes to find what we're looking for
 * 
 * @param sourceFile - Parsed TypeScript source file (AST root)
 * @param interfaceName - Name of the interface to search for
 * @returns Array of property names found in the interface and its parents
 */
export function extractInterfaceProperties(sourceFile: ts.SourceFile, interfaceName: string): string[] {
  const allProperties = new Set<string>();
  const visited = new Set<string>();
  const fileCache = new Map<string, ts.SourceFile>();
  
  // Cache the initial source file
  fileCache.set(sourceFile.fileName, sourceFile);

  /**
   * Extracts import mappings from a source file.
   * Maps imported names to their module paths.
   * 
   * @param file - Source file to extract imports from
   * @returns Map of imported name to module path
   */
  function extractImports(file: ts.SourceFile): Map<string, string> {
    const imports = new Map<string, string>();
    
    file.statements.forEach(statement => {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const modulePath = moduleSpecifier.text;
          
          // Extract named imports
          if (statement.importClause?.namedBindings) {
            const namedBindings = statement.importClause.namedBindings;
            if (ts.isNamedImports(namedBindings)) {
              namedBindings.elements.forEach(element => {
                imports.set(element.name.text, modulePath);
              });
            }
          }
        }
      }
    });
    
    return imports;
  }

  /**
   * Resolves an import path to an absolute file path.
   * 
   * @param currentFilePath - Path of the file containing the import
   * @param importPath - The import path to resolve
   * @returns Absolute path to the imported file, or null if not found
   */
  function resolveImportPath(currentFilePath: string, importPath: string): string | null {
    const currentDir = path.dirname(currentFilePath);
    
    // Handle relative imports (e.g., './base-load-balancer', '../shared/base-load-balancer')
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(currentDir, importPath);
      
      // Try with .d.ts extension
      if (fs.existsSync(resolvedPath + '.d.ts')) {
        return resolvedPath + '.d.ts';
      }
      // Try as-is (might already have extension)
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
      // Try with /index.d.ts
      if (fs.existsSync(path.join(resolvedPath, 'index.d.ts'))) {
        return path.join(resolvedPath, 'index.d.ts');
      }
    }
    
    return null;
  }

  /**
   * Loads and parses a TypeScript source file.
   * 
   * @param filePath - Path to the file to load
   * @returns Parsed source file, or null if file cannot be loaded
   */
  function loadSourceFile(filePath: string): ts.SourceFile | null {
    // Check cache first
    if (fileCache.has(filePath)) {
      return fileCache.get(filePath)!;
    }
    
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ES2020,
        true
      );
      
      fileCache.set(filePath, sourceFile);
      return sourceFile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Recursively extracts properties from an interface and its parents.
   * 
   * @param targetName - Name of the interface to extract properties from
   * @param currentFile - Source file to search in
   */
  function extractFromInterface(targetName: string, currentFile: ts.SourceFile): void {
    // Avoid infinite loops from circular references
    const visitKey = `${currentFile.fileName}:${targetName}`;
    if (visited.has(visitKey)) {
      return;
    }
    visited.add(visitKey);

    // Find the interface declaration
    function findInterface(node: ts.Node): ts.InterfaceDeclaration | undefined {
      if (ts.isInterfaceDeclaration(node) && node.name.text === targetName) {
        return node;
      }

      let foundInterface: ts.InterfaceDeclaration | undefined;
      ts.forEachChild(node, (child) => {
        if (!foundInterface) {
          foundInterface = findInterface(child);
        }
      });
      return foundInterface;
    }

    const interfaceNode = findInterface(currentFile);

    if (!interfaceNode) {
      // Interface not found in current file - try to find it in imports
      const imports = extractImports(currentFile);
      const importPath = imports.get(targetName);
      
      if (importPath) {
        const resolvedPath = resolveImportPath(currentFile.fileName, importPath);
        if (resolvedPath) {
          const importedFile = loadSourceFile(resolvedPath);
          if (importedFile) {
            // Recursively extract from the imported file
            extractFromInterface(targetName, importedFile);
            return;
          }
        }
      }
      
      // Interface not found anywhere - skip it
      return;
    }

    // Extract properties from this interface
    interfaceNode.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.name) {
        if (ts.isIdentifier(member.name)) {
          allProperties.add(member.name.text);
        }
      }
    });

    // Extract properties from parent interfaces (extends clause)
    if (interfaceNode.heritageClauses) {
      interfaceNode.heritageClauses.forEach(clause => {
        // heritageClauses can be 'extends' or 'implements'
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          clause.types.forEach(type => {
            // Get the parent interface name
            if (ts.isIdentifier(type.expression)) {
              const parentName = type.expression.text;
              // Recursively extract from parent in the same file first
              extractFromInterface(parentName, currentFile);
            } else if (ts.isPropertyAccessExpression(type.expression)) {
              // Handle cases like aws_cdk.IResource - just get the last part
              if (ts.isIdentifier(type.expression.name)) {
                const parentName = type.expression.name.text;
                extractFromInterface(parentName, currentFile);
              }
            }
          });
        }
      });
    }
  }

  // Start extraction from the target interface
  extractFromInterface(interfaceName, sourceFile);

  return Array.from(allProperties).sort();
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
export function generateValidationFile(results: Map<string, { config: InterfaceConfig; properties: string[] }>): string {
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
    // Scope is required - it will be used to check feature flags
    // Target is optional - validation is skipped if target is undefined
    validationFunctions.push(`export function ${functionName}(scope: Construct, target?: any): void {
  ValidateProps(scope, target, ${exportName}, '${config.interfaceName}');
}`);
  }

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

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { DISABLE_PROPERTY_VALIDATION } from './constructs-feature-flags';

${propsSets.join('\n\n')}

// Shared validation implementation
// Scope is required for feature flag checking
// Target can be undefined - validation is skipped if target is undefined
export function ValidateProps(scope: Construct, target: any | undefined, validProps: Set<string>, propsTypeName: string): void {
  // Check if validation is disabled via feature flag
  if (cdk.FeatureFlags.of(scope).isEnabled(DISABLE_PROPERTY_VALIDATION)) {
    return;
  }
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
export function main() {
  try {
    const __dirname = getDirName();
    
    // When compiled, script is in scripts/dist, so we need to go up two levels
    // to reach the project root, then down into src/
    const projectRoot = path.join(__dirname, '../../..');
    const outputFilePath = path.join(projectRoot, 'patterns/@aws-solutions-constructs/core/lib/validation.ts');

    const results = new Map<string, { config: InterfaceConfig; properties: string[] }>();

    console.log('Extracting interface properties from aws-cdk-lib...\n');

    // Process each configured interface
    for (const config of INTERFACES_TO_EXTRACT) {
      try {
        const sourceFilePath = findInterfaceFile(config, __dirname);
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

// Execute the main function when run directly (not in test environment)
if (process.env.NODE_ENV !== 'test') {
  main();
}
