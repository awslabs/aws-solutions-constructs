# Test Review Report

**Reviewed source files:**
- `source/patterns/@aws-solutions-constructs/aws-lambda-comprehend/lib/index.ts`
- `source/patterns/@aws-solutions-constructs/core/lib/comprehend-helper.ts`

**Reviewed test files:**
- `source/patterns/@aws-solutions-constructs/aws-lambda-comprehend/test/lambda-comprehend.test.ts`
- `source/patterns/@aws-solutions-constructs/core/test/comprehend-helper.test.ts`

**Date:** 2026-08-17

---

## Summary

Both test files are exceptionally well-written. Coverage is comprehensive across all exported functions, enum combinations, error paths, and edge cases. Assertions are specific throughout — checking exact action lists, exact error messages, exact CloudFormation property structures, and exact IAM role attachments rather than relying on loose matchers. There are a few targeted gaps worth addressing: the `useSameBucket` grant verification in the core helper test is weaker than the construct-level test, the `resolveComprehendSelection` deduplication order contract is only tested in the core helper (not asserted in the construct test), and one edge case around `existingSourceBucketObj` with `useSameBucket` in `CheckComprehendProps` is untested.

---

## Coverage Completeness

### index.ts (LambdaToComprehend construct)

| Exported symbol | Tested? | Missing scenarios |
|-----------------|---------|-------------------|
| `LambdaToComprehend` constructor — default sync deployment | ✅ | — |
| `LambdaToComprehend` constructor — timeout override | ✅ | — |
| `LambdaToComprehend` constructor — existingLambdaObj | ✅ | — |
| `LambdaToComprehend` constructor — each use case in isolation | ✅ | — |
| `LambdaToComprehend` constructor — all use case pairings | ✅ | — |
| `LambdaToComprehend` constructor — all three use cases | ✅ | — |
| `LambdaToComprehend` constructor — each analysis type in isolation | ✅ | — |
| `LambdaToComprehend` constructor — service API gaps (PII×MULTI, SYNTAX×ASYNC) | ✅ | — |
| `LambdaToComprehend` constructor — order independence | ✅ | — |
| `LambdaToComprehend` constructor — duplicate deduplication | ✅ | — |
| `LambdaToComprehend` constructor — async resources, public properties | ✅ | — |
| `LambdaToComprehend` constructor — async S3 defaults (encryption, versioning, access logging) | ✅ | — |
| `LambdaToComprehend` constructor — data access role trust policy with source account condition | ✅ | — |
| `LambdaToComprehend` constructor — data access role bucket grants | ✅ | — |
| `LambdaToComprehend` constructor — Lambda function bucket grants and PassRole | ✅ | — |
| `LambdaToComprehend` constructor — useSameBucket | ✅ | — |
| `LambdaToComprehend` constructor — existing source and destination buckets | ✅ | — |
| `LambdaToComprehend` constructor — access logging disabled per bucket | ✅ | — |
| `LambdaToComprehend` constructor — bucket and logging bucket props | ✅ | — |
| `LambdaToComprehend` constructor — default environment variable names | ✅ | — |
| `LambdaToComprehend` constructor — overridden environment variable names | ✅ | — |
| `LambdaToComprehend` constructor — no env vars in sync mode | ✅ | — |
| `LambdaToComprehend` constructor — additionalPermissions dedup | ✅ | — |
| `LambdaToComprehend` constructor — deployVpc sync (Comprehend endpoint only) | ✅ | — |
| `LambdaToComprehend` constructor — deployVpc async (Comprehend + S3 endpoints) | ✅ | — |
| `LambdaToComprehend` constructor — existingVpc | ✅ | — |
| `LambdaToComprehend` constructor — vpcProps respected | ✅ | — |
| `LambdaToComprehend` constructor — VPC + async warning | ✅ | — |
| `LambdaToComprehend` constructor — validation: CheckLambdaProps | ✅ | — |
| `LambdaToComprehend` constructor — validation: existing Lambda + deployVpc | ✅ | — |
| `LambdaToComprehend` constructor — validation: CheckComprehendProps (empty arrays, bad combos) | ✅ | — |
| `LambdaToComprehend` constructor — validation: async-only props without ASYNC_BATCH | ✅ | — |
| `LambdaToComprehend` constructor — validation: destination props + useSameBucket | ✅ | — |
| `LambdaToComprehend` constructor — validation: CheckS3Props source | ✅ | — |
| `LambdaToComprehend` constructor — validation: CheckS3Props destination | ✅ | — |
| `LambdaToComprehend` constructor — validation: CheckVpcProps | ✅ | — |
| `LambdaToComprehend` constructor — validation: ValidateVpcProps | ✅ | — |
| `ComprehendAnalysisType` re-export | ✅ | Exercised by every test that imports from the construct package |
| `ComprehendUseCase` re-export | ✅ | Exercised by every test that imports from the construct package |

### comprehend-helper.ts (core)

| Exported symbol | Tested? | Missing scenarios |
|-----------------|---------|-------------------|
| `ComprehendUseCase` enum | ✅ | — |
| `ComprehendAnalysisType` enum | ✅ | — |
| `resolveComprehendSelection` — defaults | ✅ | — |
| `resolveComprehendSelection` — deduplication preserving first-seen order | ✅ | — |
| `ConfigureComprehendSupport` — default sync actions | ✅ | — |
| `ConfigureComprehendSupport` — each use case in isolation | ✅ | — |
| `ConfigureComprehendSupport` — all three use cases | ✅ | — |
| `ConfigureComprehendSupport` — each analysis type in isolation | ✅ | — |
| `ConfigureComprehendSupport` — order independence | ✅ | — |
| `ConfigureComprehendSupport` — duplicate deduplication | ✅ | — |
| `ConfigureComprehendSupport` — async resources created | ✅ | — |
| `ConfigureComprehendSupport` — data access role trust policy | ✅ | — |
| `ConfigureComprehendSupport` — data access role grants | ⚠️ partial | Grant test checks action lists but does not pin the role's logical ID as the target (see ISSUE-1) |
| `ConfigureComprehendSupport` — PassRole grant | ✅ | — |
| `ConfigureComprehendSupport` — environment variable definitions | ✅ | — |
| `ConfigureComprehendSupport` — environment variable name overrides | ✅ | — |
| `ConfigureComprehendSupport` — useSameBucket | ⚠️ partial | Return value verified; same-bucket grants not verified at the core level (see ISSUE-2) |
| `ConfigureComprehendSupport` — existing buckets | ⚠️ partial | Interface identity verified; destination bucket grant not verified (see ISSUE-3) |
| `ConfigureComprehendSupport` — access logging disabled per bucket | ✅ | — |
| `ConfigureComprehendSupport` — bucket props / logging bucket props | ✅ | — |
| `CheckComprehendProps` — default passes | ✅ | — |
| `CheckComprehendProps` — empty comprehendUseCases | ✅ | — |
| `CheckComprehendProps` — empty analysisTypes | ✅ | — |
| `CheckComprehendProps` — MULTI×PII gap | ✅ | — |
| `CheckComprehendProps` — ASYNC×SYNTAX gap | ✅ | — |
| `CheckComprehendProps` — spanning both gaps | ✅ | — |
| `CheckComprehendProps` — multiple errors in one throw | ✅ | — |
| `CheckComprehendProps` — async-only props without ASYNC_BATCH | ✅ | — |
| `CheckComprehendProps` — existingSourceBucketObj without ASYNC_BATCH | ✅ | — |
| `CheckComprehendProps` — existingDestinationBucketObj without ASYNC_BATCH | ✅ | — |
| `CheckComprehendProps` — destination props + useSameBucket | ✅ | — |
| `CheckComprehendProps` — ASYNC_BATCH alone with default types (SYNTAX gap silent) | ✅ | — |
| `CheckComprehendProps` — MULTI alone with default types (PII gap silent) | ✅ | — |
| `CheckComprehendProps` — all async props accepted with ASYNC_BATCH | ✅ | — |
| `CheckComprehendProps` — existingSourceBucketObj + useSameBucket | ❌ no | Not tested (see ISSUE-4) |

---

## Verification Thoroughness

### [ISSUE-1] Data access role grant test does not pin the role attachment

- **File:** `source/patterns/@aws-solutions-constructs/core/test/comprehend-helper.test.ts`
- **Test:** `"Test ASYNC_BATCH grants the data access role read on source and read/write on destination"`
- **Problem:** The `hasResourceProperties` call verifies that the correct S3 action lists appear somewhere in a policy, and uses `Match.stringLikeRegexp('testcomprehenddataaccessrole.*')` to identify the role — but does not verify that the source-bucket read grant and the destination-bucket write grant are attached to the same policy. If CDK ever splits these into two separate policies both attached to the data access role, the test would still pass without verifying the full intent. By contrast, the corresponding construct-level test (`lambda-comprehend.test.ts` → `"Test the data access role reads the source bucket and writes the destination bucket"`) pins both grants to the same `Roles` reference using the exact logical ID.
- **Recommended fix:** Replace the regex match with the actual data access role logical ID (or use a helper like `logicalIdOf` as used in the construct test), and assert both grants in a single `Match.arrayWith` on the same policy object:
  ```typescript
  // derive the data access role logical ID from configuration.dataAccessRole
  const dataAccessRoleId = stack.getLogicalId(configuration.dataAccessRole!.node.defaultChild as any);
  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({ Action: Match.arrayWith(['s3:GetObject*']), ... }),
        Match.objectLike({ Action: Match.arrayWith(['s3:PutObject']), ... })
      ])
    },
    Roles: [{ Ref: dataAccessRoleId }]
  });
  ```

### [ISSUE-2] useSameBucket core test does not verify grants

- **File:** `source/patterns/@aws-solutions-constructs/core/test/comprehend-helper.test.ts`
- **Test:** `"Test useSameBucket collapses to a single bucket serving both roles"`
- **Problem:** The test confirms `destinationBucket` and `sourceBucket` point to the same object and that the two environment variable values are equal, and counts the buckets. It does not verify that the data access role and grantee each receive a single read+write grant on the shared bucket (rather than separate read and write grants). The construct-level equivalent (`lambda-comprehend.test.ts` → `"Test useSameBucket collapses the two buckets into one"`) does verify this. Since the grant logic in `ConfigureComprehendSupport` takes a different branch for `useSameBucket`, a regression there would be invisible to the core test.
- **Recommended fix:** Add assertions that both `dataAccessRole` and the grantee receive `s3:GetObject*` and `s3:PutObject` on the same bucket ARN within a single policy:
  ```typescript
  const bucketArn = { 'Fn::GetAtt': [stack.getLogicalId(configuration.sourceBucket!.bucket!.node.defaultChild as any), 'Arn'] };
  // verify single read+write grant for the grantee
  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(['s3:GetObject*', 's3:PutObject']),
          Resource: Match.arrayWith([bucketArn])
        })
      ])
    }
  });
  ```

### [ISSUE-3] Existing buckets core test only verifies the source grant

- **File:** `source/patterns/@aws-solutions-constructs/core/test/comprehend-helper.test.ts`
- **Test:** `"Test existing buckets are used and receive grants against the bucket interface"`
- **Problem:** The `hasResourceProperties` assertion checks that a policy references the existing source bucket ARN, but it does not verify that the destination bucket also receives its grant. If the `else if (props.existingDestinationBucketObj)` branch in `ConfigureComprehendSupport` were broken and the destination grant were omitted, this test would still pass.
- **Recommended fix:** Add a second `hasResourceProperties` call (or extend the existing `Match.arrayWith`) to assert that the destination bucket ARN also appears in a grant:
  ```typescript
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Resource: Match.arrayWith([
            Match.objectLike({ 'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('existingdestination.*')]) })
          ])
        })
      ])
    }
  });
  ```

### [ISSUE-4] CheckComprehendProps: existingSourceBucketObj + useSameBucket untested

- **File:** `source/patterns/@aws-solutions-constructs/core/test/comprehend-helper.test.ts`
- **Test:** (missing)
- **Problem:** `CheckComprehendProps` contains a `useSameBucket` guard that also fires if `existingDestinationBucketObj` is set alongside `useSameBucket: true`. There is a test for `destinationBucketProps + useSameBucket` and `existingDestinationBucketObj + useSameBucket`, but there is no test for `existingSourceBucketObj + useSameBucket`. The silent coupling — where passing `useSameBucket` together with an existing source bucket may produce a confusing runtime outcome — is not exercise here. (Note: `ConfigureComprehendSupport` silently uses the existing source bucket as the destination in this case; whether that is correct or should also be guarded is worth considering.)
- **Recommended fix:** Add a test verifying that `existingSourceBucketObj + useSameBucket: true + ASYNC_BATCH` does not throw (confirming the code accepts it) and that the returned `destinationBucket?.bucketInterface` equals the existing source bucket:
  ```typescript
  test('Test existingSourceBucketObj with useSameBucket is accepted and reused as destination', () => {
    const stack = new Stack();
    const existingSource = CreateScrapBucket(stack, 'existing-source');
    const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      existingSourceBucketObj: existingSource,
      useSameBucket: true
    }, createGrantee(stack, 'grantee'));
    expect(configuration.sourceBucket?.bucketInterface).toBe(existingSource);
    expect(configuration.destinationBucket?.bucketInterface).toBe(existingSource);
  });
  ```

---

## Mocking Appropriateness

### [MOCK-1] No mocking concerns — all tests exercise real CDK synthesis

Both test files avoid mocking entirely and instead synthesize real CDK stacks and assert against the resulting CloudFormation template using CDK's `Template` assertions API. This is the correct approach for infrastructure-as-code unit tests: the "unit under test" is the synthesized template, and every assertion reflects a real CloudFormation resource property. There are no mock-only tests that would pass even if the implementation were completely wrong.

---

## Positive Observations

- **Action list assertions use `toEqual` on exact ordered arrays**, not loose `arrayContaining` matchers. This means a test will catch both missing actions and extra unexpected actions (e.g., `comprehend:TagResource` appearing in the default policy).
- **The `comprehendActionsFrom` and `allActionsFrom` helpers** in `lambda-comprehend.test.ts` are a smart design — they collect all actions across all policies in declaration order, enabling order-sensitive equality assertions across the full stack without brittle index-based access.
- **Error message assertions use the full expected string**, including the trailing newline. This means a subtly rephrased error message will be caught immediately.
- **The `logicalIdOf` + `environmentVariablesOf` helpers** avoid pattern matching on synthesized names (which can change with CDK versioning) and instead look up resources by their actual CDK logical IDs. This makes assertions both precise and robust.
- **The `useSameBucket` construct test** verifies that both environment variables reference the same `{ Ref: ... }` token, not just that they happen to resolve to the same string value. That is the right level of precision for CDK template tests.
- **IAM policy tests pin the `Roles` array** to the correct role's logical ID, ruling out the case where a matching policy exists but is attached to the wrong principal.
- **The VPC warning test** uses a spy on `console.log` and explicitly resets it with `mockClear()` between the three sub-scenarios, preventing false passes from a previous scenario's log output bleeding into the next.
- **The deduplication order test** in `comprehend-helper.test.ts` asserts the full expected output (`toEqual`) after passing two configurations with reversed input orders, proving that enum declaration order — not client input order — governs the output.
- **Validation tests give each failing instantiation its own `Stack`** (with a comment explaining why), which is correct — CDK construct IDs are unique per scope, so a second instantiation that throws would otherwise corrupt the first stack's state.
- **The `"Test every Comprehend error is reported in a single throw"` tests** in both files confirm that `CheckComprehendProps` accumulates all errors before throwing rather than fail-fast, which is an important quality-of-life property for clients.

---

## Priority Recommendations

1. **[ISSUE-1]** Pin the data access role logical ID in the core helper grant test — **Low**. The fix is a one-line addition of a `logicalIdOf`-style lookup and a `Roles` assertion on the existing `hasResourceProperties` call. Without it, a regression where grants are split into two separate policies would go undetected at the core level.

2. **[ISSUE-4]** Add `existingSourceBucketObj + useSameBucket` test case to `CheckComprehendProps` — **Low**. A five-line test that fills a genuine gap in the validation matrix and also serves as documentation of the intended runtime behaviour (the existing source bucket is reused as the destination).

3. **[ISSUE-2]** Add grant assertions to the `useSameBucket` core test — **Low**. The construct-level test already covers this scenario thoroughly, so the marginal value is lower; but a regression in the `if (props.useSameBucket)` grant branch of `ConfigureComprehendSupport` would be caught only by the integration path, not by the targeted core helper test.

4. **[ISSUE-3]** Add destination bucket grant assertion to the existing-buckets core test — **Low**. Again, the construct-level test covers this, but adding one `hasResourceProperties` call to the core test makes the coverage at that layer complete and self-contained.
