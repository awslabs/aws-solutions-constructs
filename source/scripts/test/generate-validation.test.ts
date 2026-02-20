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
  findCdkLibPath,
  findInterfaceFile,
  main,
  processInterfacesAndGenerateCode
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

// QUESTION FOR REVIEWERS (GEORGE) - is this dependence on node_modules on
// the disc too ugly to keep?
test('findNodeModulesPath - integration test', () => {
  // This is an integration test that verifies node_modules can be found
  // It will only pass if run in a project with node_modules
  
  // Should not throw
  const nodeModulesPath = findNodeModulesPath(testDir);
  expect(nodeModulesPath).toBeTruthy();
  expect(fs.existsSync(nodeModulesPath)).toBe(true);
  expect(nodeModulesPath).toMatch(/node_modules$/);
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

test('generateValidationFile - handles array of multiple interface results', () => {
  // This tests that generateValidationFile can process multiple interfaces
  // similar to what INTERFACES_TO_EXTRACT would produce
  
  // Create actual results map like processInterfacesAndGenerateCode would create
  const results = new Map<string, { config: InterfaceConfig; properties: string[] }>();
  
  // Add multiple interface results
  results.set('validFirstProps', {
    config: {
      interfaceName: 'FirstProps',
      module: 'aws-service1',
      filePath: 'aws-service1/lib/first.d.ts',
      exportName: 'validFirstProps'
    },
    properties: ['firstProp1', 'firstProp2', 'firstProp3']
  });
  
  results.set('validSecondProps', {
    config: {
      interfaceName: 'SecondProps',
      module: 'aws-service2',
      filePath: 'aws-service2/lib/second.d.ts',
      exportName: 'validSecondProps'
    },
    properties: ['secondProp1', 'secondProp2']
  });
  
  results.set('validThirdProps', {
    config: {
      interfaceName: 'ThirdProps',
      module: 'aws-service3',
      filePath: 'aws-service3/lib/third.d.ts',
      exportName: 'validThirdProps'
    },
    properties: ['thirdProp1', 'thirdProp2', 'thirdProp3', 'thirdProp4']
  });

  // Call the actual function
  const output = generateValidationFile(results);

  // Verify all interfaces are present in the output
  expect(output).toContain('validFirstProps');
  expect(output).toContain('validSecondProps');
  expect(output).toContain('validThirdProps');
  
  // Verify all validation functions are present
  expect(output).toContain('ValidateFirstProps');
  expect(output).toContain('ValidateSecondProps');
  expect(output).toContain('ValidateThirdProps');
  
  // Verify properties from each interface are present
  expect(output).toContain('firstProp1');
  expect(output).toContain('secondProp1');
  expect(output).toContain('thirdProp1');
  
  // Verify the structure includes all necessary components
  expect(output).toContain('export const validFirstProps: Set<string>');
  expect(output).toContain('export const validSecondProps: Set<string>');
  expect(output).toContain('export const validThirdProps: Set<string>');
  expect(output).toContain('export function ValidateProps');
  
  // Verify comments reference the correct modules
  expect(output).toContain('FirstProps from aws-cdk-lib/aws-service1');
  expect(output).toContain('SecondProps from aws-cdk-lib/aws-service2');
  expect(output).toContain('ThirdProps from aws-cdk-lib/aws-service3');
  
  // Verify the correct number of properties in each set
  const firstPropsMatch = output.match(/validFirstProps: Set<string> = new Set\(\[([\s\S]*?)\]\);/);
  expect(firstPropsMatch).toBeTruthy();
  expect(firstPropsMatch![1].split(',').length).toBe(3);
  
  const secondPropsMatch = output.match(/validSecondProps: Set<string> = new Set\(\[([\s\S]*?)\]\);/);
  expect(secondPropsMatch).toBeTruthy();
  expect(secondPropsMatch![1].split(',').length).toBe(2);
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

test('extractInterfaceProperties - handles property access expression in extends clause', () => {
  // This tests lines 470-474 which handle cases like "extends aws_cdk.IResource"
  const code = `
    interface MyProps extends aws_cdk.IResource {
      myProp: string;
      anotherProp: number;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should extract properties from MyProps
  // The property access expression (aws_cdk.IResource) will be processed
  // but since IResource doesn't exist in this file, only MyProps properties are returned
  expect(properties).toEqual(['anotherProp', 'myProp']);
});

test('extractInterfaceProperties - handles nested property access in extends clause', () => {
  // This tests the property access expression handling with actual nested identifiers
  const code = `
    interface BaseResource {
      baseId: string;
    }
    
    interface MyProps extends namespace.BaseResource {
      myProp: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should extract properties from MyProps
  // The namespace.BaseResource will be processed, extracting "BaseResource" as the parent name
  // Since BaseResource exists in the same file, it should be included
  expect(properties).toEqual(['baseId', 'myProp']);
});

test('extractInterfaceProperties - tests loadSourceFile with real cross-file inheritance', () => {
  // This tests lines 374-394: loadSourceFile function with actual file operations
  // FargateServiceProps extends BaseServiceOptions which is imported from another file
  // This will trigger loadSourceFile to load the parent interface file
  
  const cdkLibPath = findCdkLibPath(testDir);
  const fargateServiceFilePath = path.join(cdkLibPath, 'aws-ecs/lib/fargate/fargate-service.d.ts');
  
  // Read the actual FargateService file
  const sourceCode = fs.readFileSync(fargateServiceFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    fargateServiceFilePath,
    sourceCode,
    7, // ES2020
    true
  );
  
  // Extract properties from FargateServiceProps
  // This will trigger loadSourceFile to load BaseServiceOptions from '../base/base-service'
  const properties = extractInterfaceProperties(sourceFile, 'FargateServiceProps');
  
  // Should include properties from both FargateServiceProps and BaseServiceOptions
  expect(properties.length).toBeGreaterThan(10);
  
  // Verify it includes properties from FargateServiceProps
  expect(properties).toContain('taskDefinition');
  
  // To test cache hit path (lines 377-379), call again with the same source file
  // The internal fileCache should prevent re-reading and re-parsing files
  const properties2 = extractInterfaceProperties(sourceFile, 'FargateServiceProps');
  
  // Verify results are identical (cache working correctly)
  // This doesn't confirm that the cache actually worked, but it confirms the cache code doesn't break anything
  expect(properties2).toEqual(properties);
});

test('extractInterfaceProperties - tests loadSourceFile with non-existent file', () => {
  // This tests lines 382-384: file doesn't exist path in loadSourceFile
  // When an interface extends another from a non-existent imported file
  
  const code = `
    import { NonExistentProps } from './this-file-does-not-exist';
    
    interface MyProps extends NonExistentProps {
      myProp: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should only return properties from MyProps since the imported file doesn't exist
  expect(properties).toEqual(['myProp']);
});

test('extractInterfaceProperties - tests loadSourceFile error handling', () => {
  // This tests line 394: error handling in loadSourceFile
  // We can trigger this by having an interface that extends from an import
  // where the file path resolution fails
  
  const code = `
    import { ErrorProps } from '../../../../../../../invalid/path/that/causes/errors';
    
    interface MyProps extends ErrorProps {
      myProp: string;
      anotherProp: number;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should gracefully handle the error and return only MyProps properties
  expect(properties).toEqual(['anotherProp', 'myProp']);
});

test('extractInterfaceProperties - tests resolveImportPath with different file extensions', () => {
  // This tests lines 355, 359 in resolveImportPath
  // We need to test the different path resolution strategies
  
  const cdkLibPath = findCdkLibPath(testDir);
  
  // Test with an interface that imports from a relative path
  // ApplicationLoadBalancerProps imports from './application-load-balancer-lookup'
  const albFilePath = path.join(cdkLibPath, 'aws-elasticloadbalancingv2/lib/alb/application-load-balancer.d.ts');
  
  const sourceCode = fs.readFileSync(albFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    albFilePath,
    sourceCode,
    7, // ES2020
    true
  );
  
  // Extract properties - this will trigger resolveImportPath with various strategies
  const properties = extractInterfaceProperties(sourceFile, 'ApplicationLoadBalancerProps');
  
  // Should successfully resolve and extract properties
  expect(properties.length).toBeGreaterThan(5);
});

test('extractInterfaceProperties - tests interface not found in imports', () => {
  // This tests lines 437-441: when interface is not found in current file or imports
  // The function should gracefully return without that interface's properties
  
  const code = `
    import { SomeOtherInterface } from './other';
    
    interface MyProps extends NonExistentInterface {
      myProp: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'MyProps');
  
  // Should only return properties from MyProps since NonExistentInterface
  // is not found in the file or imports
  expect(properties).toEqual(['myProp']);
});

test('extractInterfaceProperties - tests multiple inheritance levels', () => {
  // This tests the recursive nature of extractFromInterface
  // and covers more branches in the inheritance resolution
  
  const code = `
    interface GrandParent {
      grandProp: string;
    }
    
    interface Parent extends GrandParent {
      parentProp: number;
    }
    
    interface Child extends Parent {
      childProp: boolean;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  const properties = extractInterfaceProperties(sourceFile, 'Child');
  
  // Should include properties from all three levels
  expect(properties).toEqual(['childProp', 'grandProp', 'parentProp']);
});

test('extractInterfaceProperties - tests circular reference prevention', () => {
  // This tests the visited set that prevents infinite loops
  // We create a scenario where an interface could be visited multiple times
  // through different inheritance paths
  
  const code = `
    interface Base {
      baseProp: string;
    }
    
    interface MiddleA extends Base {
      middleAProp: number;
    }
    
    interface MiddleB extends Base {
      middleBProp: boolean;
    }
    
    // Child extends both MiddleA and MiddleB, which both extend Base
    // This creates a diamond inheritance pattern where Base could be visited twice
    interface Child extends MiddleA, MiddleB {
      childProp: string;
    }
  `;
  
  const sourceFile = createMockSourceFile(code);
  
  // Extract from Child - this will traverse:
  // Child -> MiddleA -> Base
  // Child -> MiddleB -> Base (Base should not be processed again due to visited set)
  const properties = extractInterfaceProperties(sourceFile, 'Child');
  
  // Should include properties from all interfaces, but Base properties should only appear once
  expect(properties).toContain('baseProp');
  expect(properties).toContain('middleAProp');
  expect(properties).toContain('middleBProp');
  expect(properties).toContain('childProp');
  
  // Verify baseProp appears exactly once (not duplicated)
  const baseCount = properties.filter(p => p === 'baseProp').length;
  expect(baseCount).toBe(1);
  
  // Total should be 4 unique properties
  expect(properties.length).toBe(4);
});

test('findCdkLibPath - returns cached path on subsequent calls', () => {
  // This tests the caching behavior (lines 241-243)
  const testDir = path.resolve();
  
  // First call should search for node_modules
  const firstCall = findCdkLibPath(testDir);
  expect(firstCall).toBeTruthy();
  expect(firstCall).toMatch(/aws-cdk-lib$/);
  
  // Second call should return the cached value
  const secondCall = findCdkLibPath(testDir);
  expect(secondCall).toBe(firstCall);
});

test('findCdkLibPath - verifies caching and error handling logic exists', () => {
  // This test verifies that findCdkLibPath has the caching and error handling code
  // The actual error path (lines 247-250) is difficult to test without mocking fs.existsSync
  // which causes issues with Jest's internal file operations
  
  // Verify the function works correctly with a valid directory
  const result = findCdkLibPath(testDir);
  expect(result).toBeTruthy();
  expect(result).toMatch(/aws-cdk-lib$/);
  
  // Verify caching at least doesn't break the code by calling again
  const cachedResult = findCdkLibPath(testDir);
  expect(cachedResult).toBe(result);
});

test('findInterfaceFile - returns correct path when file exists', () => {
  const testDir = path.resolve();
  const config: InterfaceConfig = {
    interfaceName: 'TestProps',
    module: 'aws-test',
    filePath: 'aws-ec2/lib/vpc.d.ts', // Use a real file that exists
    exportName: 'validTestProps'
  };
  
  const result = findInterfaceFile(config, testDir);
  expect(result).toBeTruthy();
  expect(result).toMatch(/aws-ec2\/lib\/vpc\.d\.ts$/);
});

test('findInterfaceFile - throws error when file does not exist', () => {
  const testDir = path.resolve();
  const config: InterfaceConfig = {
    interfaceName: 'NonExistentProps',
    module: 'aws-nonexistent',
    filePath: 'aws-nonexistent/lib/nonexistent.d.ts',
    exportName: 'validNonExistentProps'
  };
  
  expect(() => findInterfaceFile(config, testDir)).toThrow('Could not find NonExistentProps definition file');
});

test('main - verifies main function structure and NODE_ENV guard', () => {
  // This test verifies that:
  // 1. The main function is properly exported
  // 2. The NODE_ENV guard prevents execution during tests
  // 3. The function structure is correct
  
  // Verify main is a function
  expect(typeof main).toBe('function');
  
  // Verify that when NODE_ENV is 'test', main doesn't execute
  // (it should return early without doing anything)
  const originalEnv = process.env.NODE_ENV;
  
  try {
    process.env.NODE_ENV = 'test';
    
    // This should not throw because the NODE_ENV check prevents execution
    expect(() => main()).not.toThrow();
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('processInterfacesAndGenerateCode - processes real interfaces successfully', () => {
  // This tests the core logic from main()
  // This covers most of the lines that were in main (595-665)
  
  const logSpy = jest.spyOn(console, 'log').mockImplementation();
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  
  try {
    const projectRoot = testDir;
    
    // Use a subset of real interfaces to test
    const testInterfaces: InterfaceConfig[] = [
      {
        interfaceName: 'VpcProps',
        module: 'aws-ec2',
        filePath: 'aws-ec2/lib/vpc.d.ts',
        exportName: 'validVpcProps'
      },
      {
        interfaceName: 'QueueProps',
        module: 'aws-sqs',
        filePath: 'aws-sqs/lib/queue.d.ts',
        exportName: 'validQueueProps'
      }
    ];
    
    // Call the function
    const result = processInterfacesAndGenerateCode(projectRoot, testInterfaces);
    
    // Verify it generated code
    expect(result).toContain('auto-generated');
    expect(result).toContain('validVpcProps');
    expect(result).toContain('ValidateVpcProps');
    
    // Verify console output
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Extracting interface properties'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Generated validation.ts'));
  } finally {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  }
});

test('processInterfacesAndGenerateCode - throws error when no interfaces processed', () => {
  // This tests the error path when no interfaces are successfully processed
  
  const logSpy = jest.spyOn(console, 'log').mockImplementation();
  const errorSpy = jest.spyOn(console, 'error').mockImplementation();
  
  try {
    const projectRoot = testDir;
    
    // Use interfaces that don't exist
    const testInterfaces: InterfaceConfig[] = [
      {
        interfaceName: 'NonExistentProps',
        module: 'aws-nonexistent',
        filePath: 'aws-nonexistent/lib/nonexistent.d.ts',
        exportName: 'validNonExistentProps'
      }
    ];
    
    // Should throw an error
    expect(() => processInterfacesAndGenerateCode(projectRoot, testInterfaces))
      .toThrow('No interfaces were successfully processed');
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
});
