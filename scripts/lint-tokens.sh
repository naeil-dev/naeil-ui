#!/bin/bash
# Check for hardcoded color values in component files
grep -rn --include="*.tsx" -E "(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\()" src/components/ui/ | grep -v "// ok-hardcoded" | grep -v ".stories."
