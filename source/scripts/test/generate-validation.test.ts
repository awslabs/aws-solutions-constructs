import ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

// For Jest tests, we can use the current working directory
const testDir = path.resolve();

/**
 * Unit tests for generate-validation.ts
 * 
 * These tests verify the core logic of the validation generator without
 * requiring the full aws-cdk-lib dependency or file system operations.
 */

// Helper function to create a mock TypeScript source file
function createMockSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    'test.ts',
    code,
    7, // ES2020
    true
  );
}

// Extract the function we want to test by copying its implementation
// In a real scenario, you'd refactor generate-validation.ts to export these functions
function extractInterfaceProperties(sourceFile: ts.SourceFile, interfaceName: string): string[] {
  const properties: string[] = [];
  let found = false;

  function visit(node: ts.Node): void {
    // Early exit if we've already found the interface
    if (found) {
      return;
    }

    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      node.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          if (ts.isIdentifier(member.name)) {
            properties.push(member.name.text);
          }
        }
      });
      // Mark as found so we don't continue traversing
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return properties;
}

test('extractInterfaceProperties - extracts properties from simple interface', () => {
  const code = `
    interface TestProps {
      name: string;
      age: number;
      active: boolean;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  expect(properties).toEqual(['name', 'age', 'active']);
});

test('extractInterfaceProperties - extracts optional properties', () => {
  const code = `
    interface TestProps {
      required: string;
      optional?: number;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  expect(properties).toEqual(['required', 'optional']);
});

test('extractInterfaceProperties - extracts readonly properties', () => {
  const code = `
    interface TestProps {
      readonly id: string;
      readonly createdAt: Date;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  expect(properties).toEqual(['id', 'createdAt']);
});

test('extractInterfaceProperties - returns empty array for non-existent interface', () => {
  const code = `
    interface TestProps {
      name: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'NonExistent');
  
  expect(properties).toEqual([]);
});

test('extractInterfaceProperties - handles interface with no properties', () => {
  const code = `
    interface EmptyProps {
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'EmptyProps');
  
  expect(properties).toEqual([]);
});

test('extractInterfaceProperties - extracts from correct interface when multiple exist', () => {
  const code = `
    interface FirstProps {
      first: string;
    }
    
    interface SecondProps {
      second: number;
    }
    
    interface ThirdProps {
      third: boolean;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'SecondProps');
  
  expect(properties).toEqual(['second']);
});

test('extractInterfaceProperties - handles complex property types', () => {
  const code = `
    interface TestProps {
      simple: string;
      array: string[];
      union: string | number;
      object: { nested: string };
      function: (arg: string) => void;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  expect(properties).toEqual(['simple', 'array', 'union', 'object', 'function']);
});

test('extractInterfaceProperties - ignores methods', () => {
  const code = `
    interface TestProps {
      property: string;
      method(): void;
      arrowMethod: () => void;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  // Should include property and arrowMethod (which is a property with function type)
  // but not method (which is a method signature)
  expect(properties).toEqual(['property', 'arrowMethod']);
});

test('extractInterfaceProperties - handles interface extending another', () => {
  const code = `
    interface BaseProps {
      base: string;
    }
    
    interface ExtendedProps extends BaseProps {
      extended: number;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'ExtendedProps');
  
  // Only extracts properties directly on ExtendedProps, not inherited ones
  expect(properties).toEqual(['extended']);
});

test('generateValidationFile - generates correct structure', () => {
  interface InterfaceConfig {
    interfaceName: string;
    module: string;
    filePath: string;
    exportName: string;
  }

  function generateValidationFile(results: Map<string, { config: InterfaceConfig; properties: string[] }>): string {
    const propsSets: string[] = [];
    const validationFunctions: string[] = [];
    
    for (const [exportName, { config, properties }] of results) {
      propsSets.push(`// ${config.interfaceName} from aws-cdk-lib/${config.module}
export const ${exportName}: Set<string> = new Set([
${properties.map(prop => `  '${prop}'`).join(',\n')}
]);`);

      const functionName = exportName.replace('valid', 'Validate');
      validationFunctions.push(`export function ${functionName}(target?: any): void {
  ValidateProps(target, ${exportName}, '${config.interfaceName}');
}`);
    }

    return `// This file is auto-generated by scripts/generate-validation.ts
// Do not edit manually - run 'npm run generate:validation' to regenerate

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

  const results = new Map();
  results.set('validTestProps', {
    config: {
      interfaceName: 'TestProps',
      module: 'test-module',
      filePath: 'test/path.d.ts',
      exportName: 'validTestProps'
    },
    properties: ['prop1', 'prop2']
  });

  const output = generateValidationFile(results);
  
  // Verify the output contains expected elements
  expect(output).toMatch(/export const validTestProps: Set<string>/);
  expect(output).toMatch(/'prop1'/);
  expect(output).toMatch(/'prop2'/);
  expect(output).toMatch(/export function ValidateTestProps/);
  expect(output).toMatch(/export function ValidateProps/);
  expect(output).toMatch(/auto-generated/);
  expect(output).toMatch(/throw new Error/);
  expect(output).toMatch(/target: any \| undefined/);
});

test('generateValidationFile - handles multiple interfaces', () => {
  interface InterfaceConfig {
    interfaceName: string;
    module: string;
    filePath: string;
    exportName: string;
  }

  function generateValidationFile(results: Map<string, { config: InterfaceConfig; properties: string[] }>): string {
    const propsSets: string[] = [];
    const validationFunctions: string[] = [];
    
    for (const [exportName, { config, properties }] of results) {
      propsSets.push(`// ${config.interfaceName} from aws-cdk-lib/${config.module}
export const ${exportName}: Set<string> = new Set([
${properties.map(prop => `  '${prop}'`).join(',\n')}
]);`);

      const functionName = exportName.replace('valid', 'Validate');
      validationFunctions.push(`export function ${functionName}(target?: any): void {
  ValidateProps(target, ${exportName}, '${config.interfaceName}');
}`);
    }

    return `// This file is auto-generated by scripts/generate-validation.ts
// Do not edit manually - run 'npm run generate:validation' to regenerate

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

  const results = new Map();
  results.set('validFirstProps', {
    config: {
      interfaceName: 'FirstProps',
      module: 'first-module',
      filePath: 'first/path.d.ts',
      exportName: 'validFirstProps'
    },
    properties: ['first1', 'first2']
  });
  results.set('validSecondProps', {
    config: {
      interfaceName: 'SecondProps',
      module: 'second-module',
      filePath: 'second/path.d.ts',
      exportName: 'validSecondProps'
    },
    properties: ['second1', 'second2']
  });

  const output = generateValidationFile(results);
  
  // Verify both interfaces are present
  expect(output).toMatch(/validFirstProps/);
  expect(output).toMatch(/validSecondProps/);
  expect(output).toMatch(/ValidateFirstProps/);
  expect(output).toMatch(/ValidateSecondProps/);
  expect(output).toMatch(/'first1'/);
  expect(output).toMatch(/'second2'/);
});

test('findNodeModulesPath - integration test', () => {
  // This is an integration test that verifies node_modules can be found
  // It will only pass if run in a project with node_modules
  
  function findNodeModulesPath(): string {
    let currentDir = testDir;
    while (currentDir !== path.parse(currentDir).root) {
      const nodeModulesPath = path.join(currentDir, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        return nodeModulesPath;
      }
      currentDir = path.dirname(currentDir);
    }
    throw new Error('node_modules not found');
  }

  // Should not throw
  const nodeModulesPath = findNodeModulesPath();
  expect(nodeModulesPath).toBeTruthy();
  expect(fs.existsSync(nodeModulesPath)).toBe(true);
  expect(nodeModulesPath).toMatch(/node_modules$/);
});

test('validation function naming convention', () => {
  // Test that the naming convention works correctly
  const testCases = [
    { input: 'validBucketProps', expected: 'ValidateBucketProps' },
    { input: 'validFunctionProps', expected: 'ValidateFunctionProps' },
    { input: 'validQueueProps', expected: 'ValidateQueueProps' }
  ];

  for (const { input, expected } of testCases) {
    const result = input.replace('valid', 'Validate');
    expect(result).toBe(expected);
  }
});

test('extractInterfaceProperties - early exit optimization', () => {
  // Test that the function stops traversing after finding the interface
  // by ensuring it only finds the first interface with the matching name
  const code = `
    interface TestProps {
      prop1: string;
    }
    
    // This should not be visited if early exit works
    interface OtherProps {
      other1: string;
      other2: string;
      other3: string;
    }
    
    // Duplicate name - should not be found due to early exit
    interface TestProps {
      prop2: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'TestProps');
  
  // Should only find properties from the first TestProps interface
  expect(properties).toEqual(['prop1']);
  // Should NOT include prop2 from the second TestProps
  expect(properties.includes('prop2')).toBe(false);
});
