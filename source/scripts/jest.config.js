export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2020',
        lib: ['ES2020'],
        esModuleInterop: true,
        skipLibCheck: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        downlevelIteration: true,
        types: ['jest', 'node']
      }
    }
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2020',
        lib: ['ES2020'],
        esModuleInterop: true,
        skipLibCheck: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        downlevelIteration: true,
        types: ['jest', 'node']
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
