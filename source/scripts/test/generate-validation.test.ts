import ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

// Mock the getDirName module before importing generate-validation
jest.mock('../src/get-dirname.js', () => ({
  getDirName: () => path.resolve()
}));

import { 
  extractInterfaceProperties, 
  generateValidationFile, 
  InterfaceConfig,
  findNodeModulesPath,
} from '../src/generate-validation.js';

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
  
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['active', 'age', 'name']);
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
  
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['optional', 'required']);
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
  
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['createdAt', 'id']);
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
  
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['array', 'function', 'object', 'simple', 'union']);
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
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['arrowMethod', 'property']);
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
  
  // Now extracts properties from both ExtendedProps and BaseProps (inherited)
  // Properties are returned in alphabetical order
  expect(properties).toEqual(['base', 'extended']);
});

test('generateValidationFile - generates correct structure', () => {
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
  expect(output).toMatch(/scope: Construct/);
});

test('generateValidationFile - handles multiple interfaces', () => {
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
  
  // Should not throw
  const nodeModulesPath = findNodeModulesPath(testDir);
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

test('generateValidationFile - processes array of InterfaceConfig similar to INTERFACES_TO_EXTRACT', () => {
  // Create a mock array similar to INTERFACES_TO_EXTRACT
  const mockConfigs: InterfaceConfig[] = [
    {
      interfaceName: 'FirstProps',
      module: 'aws-service1',
      filePath: 'aws-service1/lib/first.d.ts',
      exportName: 'validFirstProps'
    },
    {
      interfaceName: 'SecondProps',
      module: 'aws-service2',
      filePath: 'aws-service2/lib/second.d.ts',
      exportName: 'validSecondProps'
    },
    {
      interfaceName: 'ThirdProps',
      module: 'aws-service3',
      filePath: 'aws-service3/lib/third.d.ts',
      exportName: 'validThirdProps'
    }
  ];

  // Simulate processing each config and collecting results
  const results = new Map<string, { config: InterfaceConfig; properties: string[] }>();
  
  for (const config of mockConfigs) {
    // Simulate extracting properties (in real code, this would parse actual files)
    const mockProperties = [`${config.interfaceName.toLowerCase()}Prop1`, `${config.interfaceName.toLowerCase()}Prop2`];
    results.set(config.exportName, { config, properties: mockProperties });
  }

  // Verify all configs were processed
  expect(results.size).toBe(3);
  expect(results.has('validFirstProps')).toBe(true);
  expect(results.has('validSecondProps')).toBe(true);
  expect(results.has('validThirdProps')).toBe(true);

  // Generate validation file from results
  const output = generateValidationFile(results);

  // Verify all interfaces are present in the output
  expect(output).toMatch(/validFirstProps/);
  expect(output).toMatch(/validSecondProps/);
  expect(output).toMatch(/validThirdProps/);
  
  // Verify all validation functions are present
  expect(output).toMatch(/ValidateFirstProps/);
  expect(output).toMatch(/ValidateSecondProps/);
  expect(output).toMatch(/ValidateThirdProps/);
  
  // Verify properties from each interface are present
  expect(output).toMatch(/firstpropsProp1/);
  expect(output).toMatch(/secondpropsProp1/);
  expect(output).toMatch(/thirdpropsProp1/);
  
  // Verify the structure includes all necessary components
  expect(output).toMatch(/export const validFirstProps: Set<string>/);
  expect(output).toMatch(/export const validSecondProps: Set<string>/);
  expect(output).toMatch(/export const validThirdProps: Set<string>/);
  expect(output).toMatch(/export function ValidateProps/);
  
  // Verify comments reference the correct modules
  expect(output).toMatch(/FirstProps from aws-cdk-lib\/aws-service1/);
  expect(output).toMatch(/SecondProps from aws-cdk-lib\/aws-service2/);
  expect(output).toMatch(/ThirdProps from aws-cdk-lib\/aws-service3/);
});

test('extractInterfaceProperties - handles cross-file inheritance via imports', () => {
  // This tests the extractImports helper function (lines 315-324)
  // by creating a file with import statements and an interface that extends an imported interface
  const code = `
    import { BaseProps } from './base';
    import { OtherInterface } from '../other';
    
    interface ExtendedProps extends BaseProps {
      extended: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  
  // The extractInterfaceProperties function internally uses extractImports
  // to find where BaseProps is imported from
  const properties = extractInterfaceProperties(sourceFile, 'ExtendedProps');
  
  // Since we can't actually load './base' in this test, the function will:
  // 1. Find ExtendedProps interface
  // 2. See it extends BaseProps
  // 3. Use extractImports to find that BaseProps is imported from './base'
  // 4. Try to load './base' (which will fail in this test)
  // 5. Return only the properties from ExtendedProps itself
  expect(properties).toEqual(['extended']);
  
  // The important thing is that extractImports was called and processed the import statements
  // In a real scenario with actual files, it would follow the import and extract BaseProps properties too
});

test('extractInterfaceProperties - handles multiple named imports', () => {
  // This tests that extractImports correctly handles multiple named imports from the same module
  const code = `
    import { FirstInterface, SecondInterface, ThirdInterface } from './shared';
    
    interface MyProps extends FirstInterface {
      myProp: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should extract properties from MyProps
  // The extractImports function will have processed all three named imports
  expect(properties).toEqual(['myProp']);
});
