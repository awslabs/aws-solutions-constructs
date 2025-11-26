# Implement New AWS Solutions Construct

You are tasked with implementing a new AWS Solutions Construct based on the specification file at `specs/{{arg1}}` and the README.adoc file that has already been created.

## Implementation Steps

1. **Read the specification file** at `specs/{{arg1}}` to understand:
   - Main services involved
   - Interface requirements (props)
   - Incoming props validation checks
   - Configuration and integration logic
   - Construct properties to expose

2. **Review the existing README.adoc** in the construct directory to ensure alignment with documented behavior

3. **Create the directory structure** following the pattern:
   ```
   source/patterns/@aws-solutions-constructs/aws-{service1}-{service2}/
   ├── lib/
   │   └── index.ts
   ├── test/
   │   ├── integ.*.test.ts
   │   └── test.*.test.ts
   ├── package.json
   ├── .npmignore
   ├── .gitignore
   └── README.md (brief)
   ```

4. **Implement lib/index.ts**:
   - Add Apache 2.0 license header
   - Import required CDK modules and core helpers
   - Define Props interface matching README.adoc documentation
   - Implement Construct class with:
     - Public properties for all created resources
     - Constructor that validates props, creates resources, and configures integrations
   - Follow patterns from similar existing constructs

5. **Add core helper functions** if needed:
   - Create `core/lib/{service}-helper.ts` for new services
   - Add validation functions (e.g., `CheckTranslateProps()`)
   - Add VPC endpoint support if required

6. **Create package.json**:
   - Set correct name: `@aws-solutions-constructs/aws-{service1}-{service2}`
   - Configure JSII targets for TypeScript, Python, Java, .NET
   - Add dependencies on `@aws-solutions-constructs/core` and `aws-cdk-lib`
   - Include standard scripts: build, lint, test, integ

7. **Write unit tests** in `test/test.*.test.ts`:
   - Test default configuration
   - Test with custom props
   - Test with existing resources
   - Test VPC deployment scenarios
   - Test error conditions and validation
   - Achieve 95%+ code coverage

8. **Write integration tests** in `test/integ.*.test.ts`:
   - Test default deployment
   - Test major architectural variations (with/without VPC, existing resources, etc.)
   - Use `generateIntegStackName()` and `SetConsistentFeatureFlags()`

9. **Create supporting files**:
   - `.npmignore` - exclude test files and source maps
   - `.gitignore` - exclude build artifacts
   - `README.md` - brief description pointing to README.adoc

10. **Validate implementation**:
    - Run `npm run build` to compile TypeScript
    - Run `npm run lint` to check code style
    - Run `npm test` to verify unit tests pass with coverage
    - Run `npm run integ` to create integration test snapshots

## Key Requirements

- Follow naming conventions from structure.md
- Use core helper functions for resource creation
- Implement least-privilege IAM permissions
- Add environment variables for resource discovery
- Support VPC deployment when appropriate
- Match all prop and property descriptions to README.adoc comments
- Ensure consistency with existing constructs for shared services
- Follow ESLint rules in eslintrc.config.mjs
- Add license headers to all source files

## Reference Documentation

Refer to the steering files for detailed guidance:
- `.kiro/steering/structure.md` - Repository structure and patterns
- `.kiro/steering/product.md` - Product requirements and best practices
- `.kiro/steering/tech.md` - Technical implementation details
- `.kiro/steering/test.md` - Testing requirements and patterns
- `.kiro/steering/exceptions.md` - Known exceptions to standard patterns

## Output

Provide a complete, working implementation that:
- Compiles without errors
- Passes all linting checks
- Has comprehensive test coverage
- Follows all Solutions Constructs patterns and conventions
- Matches the behavior documented in README.adoc
