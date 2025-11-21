# Create README.adoc for New AWS Solutions Construct

You are tasked with creating a README.adoc file for a new AWS Solutions Construct based on the specification file at `.kiro/specs/{{arg1}}`.

## Implementation Steps

1. **Read the specification file** at `.kiro/specs/{{arg1}}` to understand:
   - Construct name (aws-{service1}-{service2})
   - Main services involved
   - Interface requirements (all props)
   - Configuration and default settings
   - Construct properties to expose

2. **Determine the correct location**:
   - Path: `source/patterns/@aws-solutions-constructs/aws-{service1}-{service2}/README.adoc`

3. **Review similar constructs** for reference:
   - For Lambda-based constructs, reference `aws-lambda-dynamodb` or `aws-lambda-transcribe`
   - Match the structure and style of existing README.adoc files

4. **Create README.adoc** with the following sections:

   **Header:**
   - Module name and title
   - Stability badge (use Experimental for new constructs)
   - Reference documentation link
   - Language package table (TypeScript, Python, Java)

   **Overview:**
   - Brief description of what the construct does
   - Minimal deployable examples in TypeScript, Python, and Java
   - Use realistic runtime versions (NODEJS_20_X, PYTHON_3_11, etc.)

   **Pattern Construct Props:**
   - Table with columns: Name, Type, Description
   - Include all props from the spec interface
   - Link to AWS CDK API documentation for all types
   - Mark optional props with `?`
   - Ensure descriptions match what will be in the code comments

   **Pattern Properties:**
   - Table with columns: Name, Type, Description
   - List all public properties exposed by the construct
   - Link to AWS CDK API documentation for all types

   **Default Settings:**
   - Subsection for each major service
   - Bullet list of default configurations applied
   - Highlight security best practices (encryption, IAM, logging, etc.)

   **Architecture:**
   - Reference to architecture diagram: `image::aws-{service1}-{service2}.png`
   - Brief description of the diagram

   **Example Lambda Function Implementation (if applicable):**
   - For Lambda constructs, link to AWS SDK example code
   - Use github.com/awsdocs/aws-doc-sdk-examples links

   **Footer:**
   - Copyright notice

## Key Requirements

- Use AsciiDoc format with proper syntax
- Ensure prop descriptions will match code comments exactly
- Include links to AWS CDK API documentation for all types
- Use tabbed code blocks for multi-language examples
- Follow the exact structure and style of existing README.adoc files
- Mark new constructs as Experimental stability
- Ensure all props from the spec are documented
- Document VPC-related props if applicable
- Document S3 bucket props if applicable
- Be precise about default values and optional parameters

## Reference Examples

Review these existing constructs for structure:
- `aws-lambda-dynamodb/README.adoc` - Basic Lambda pattern
- `aws-lambda-transcribe/README.adoc` - Lambda with S3 buckets and async jobs

## Output

Create a complete README.adoc file at the correct location that:
- Follows all Solutions Constructs documentation patterns
- Accurately reflects the spec requirements
- Provides clear, working examples in multiple languages
- Documents all props and properties comprehensively
- Matches the style and structure of existing constructs
