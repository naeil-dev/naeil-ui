/**
 * ESLint rule: no-hardcoded-colors
 *
 * Disallows hardcoded color values (oklch, hsl, rgb, hex) in component files.
 * All colors should use CSS variables / Tailwind token classes.
 *
 * Exceptions:
 * - Tailwind opacity modifiers like `black/80`, `white/50`
 * - CSS variable references like `var(--...)`
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hardcoded color values in components",
    },
    messages: {
      noHardcodedColor:
        "Hardcoded color '{{value}}' detected. Use CSS variables or Tailwind token classes instead.",
    },
    schema: [],
  },
  create(context) {
    // Patterns for hardcoded colors
    const colorPatterns = [
      /oklch\s*\(/i,
      /(?<![a-z-])hsl\s*\(/i,
      /(?<![a-z-])rgb\s*\(/i,
      /#[0-9a-fA-F]{3,8}\b/,
    ];

    // Exceptions: Tailwind color-with-opacity like `black/80`, `white/50`
    // and CSS variable references `var(--...)`
    const exceptionPatterns = [
      /^(black|white)\/\d+$/,
      /var\s*\(/,
    ];

    function isException(value) {
      return exceptionPatterns.some((p) => p.test(value));
    }

    function checkStringValue(node, value) {
      if (typeof value !== "string") return;
      if (isException(value)) return;

      for (const pattern of colorPatterns) {
        const match = value.match(pattern);
        if (match) {
          // Check if it's inside a var() — exception
          const idx = match.index || 0;
          const before = value.substring(Math.max(0, idx - 5), idx);
          if (before.includes("var(")) continue;

          // Check if match is a Tailwind class like bg-black/80 (contains black/ or white/)
          const surrounding = value.substring(
            Math.max(0, idx - 20),
            idx + match[0].length + 20
          );
          if (/(?:black|white)\/\d+/.test(surrounding) && /#/.test(match[0]) === false) {
            continue;
          }

          context.report({
            node,
            messageId: "noHardcodedColor",
            data: { value: match[0] },
          });
          return; // Report once per string
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") {
          checkStringValue(node, node.value);
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkStringValue(node, quasi.value.raw);
        }
      },
    };
  },
};
