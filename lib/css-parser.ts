/**
 * Parse CSS text into a flat list of normalized rules.
 * Each rule has: selectors, declarations, media condition, source order index, origin sheet.
 */

import { parse, walk } from "css-tree";
import type { CssNode, Declaration, Rule, Atrule, SelectorList, Block } from "css-tree";

export type CssDeclaration = {
  property: string;
  value: string;
  important: boolean;
};

export type NormalizedRule = {
  selectors: string[];
  declarations: CssDeclaration[];
  media: string | null;
  sourceOrder: number;
  origin: string;
};

export type CssSource = {
  cssText: string;
  origin: string;
};

/**
 * Parse a CSS string into normalized rules.
 * Handles nested @media blocks, strips @keyframes/@font-face, preserves source order.
 */
export function parseCss(cssText: string, origin: string): NormalizedRule[] {
  const rules: NormalizedRule[] = [];
  let orderCounter = 0;

  let ast: CssNode;
  try {
    ast = parse(cssText, {
      parseAtrulePrelude: false,
      parseCustomProperty: false,
      parseValue: false,
    });
  } catch {
    // Malformed CSS — return empty
    return rules;
  }

  walk(ast, {
    visit: "Rule",
    enter(node: Rule) {
      // Check if we're inside a relevant @media block
      const mediaCondition = getMediaAncestor(this);

      // Skip rules inside @keyframes, @font-face, @supports etc
      if (isInsideSkippedAtrule(this)) return;

      const selectors = extractSelectors(node.prelude as SelectorList);
      if (selectors.length === 0) return;

      const declarations = extractDeclarations(node.block as Block);
      if (declarations.length === 0) return;

      rules.push({
        selectors,
        declarations,
        media: mediaCondition,
        sourceOrder: orderCounter++,
        origin,
      });
    },
  });

  return rules;
}

/**
 * Parse multiple CSS sources independently and merge them in source order.
 * This prevents one malformed stylesheet from poisoning later sources.
 */
export function parseCssSources(sources: CssSource[]): NormalizedRule[] {
  const merged: NormalizedRule[] = [];
  let sourceOrderOffset = 0;

  for (const source of sources) {
    const parsed = parseCss(source.cssText, source.origin);
    merged.push(
      ...parsed.map((rule) => ({
        ...rule,
        sourceOrder: rule.sourceOrder + sourceOrderOffset,
      }))
    );
    sourceOrderOffset += parsed.length;
  }

  return merged;
}

function extractSelectors(prelude: SelectorList): string[] {
  if (!prelude || prelude.type !== "SelectorList") return [];

  const selectors: string[] = [];

  for (const child of prelude.children) {
    // Each child is a Selector node with its own children
    const selector = nodeToString(child).trim();
    if (selector) selectors.push(selector);
  }

  return selectors;
}

function extractDeclarations(block: Block): CssDeclaration[] {
  if (!block || block.type !== "Block") return [];

  const declarations: CssDeclaration[] = [];

  for (const child of block.children) {
    if (child.type !== "Declaration") continue;
    const decl = child as Declaration;

    declarations.push({
      property: decl.property,
      value: valueToString(decl.value).trim(),
      important: decl.important === true,
    });
  }

  return declarations;
}

function valueToString(value: CssNode): string {
  if (!value) return "";
  // css-tree value nodes can be serialized by walking their children
  if ("children" in value && value.children) {
    const parts: string[] = [];
    for (const child of value.children) {
      parts.push(nodeToString(child));
    }
    return parts.join("").trim();
  }
  return nodeToString(value);
}

function nodeToString(node: CssNode): string {
  // Simple recursive serializer for css-tree AST nodes
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "Number":
      return node.value;
    case "Dimension":
      return `${node.value}${node.unit}`;
    case "Percentage":
      return `${node.value}%`;
    case "String":
      return `"${node.value}"`;
    case "Hash":
      return `#${node.value}`;
    case "Function": {
      const args: string[] = [];
      if (node.children) {
        for (const child of node.children) {
          args.push(nodeToString(child));
        }
      }
      return `${node.name}(${args.join("")})`;
    }
    case "Operator":
      return node.value;
    case "WhiteSpace":
      return " ";
    case "Combinator":
      return ` ${node.name} `;
    case "TypeSelector":
      return node.name;
    case "ClassSelector":
      return `.${node.name}`;
    case "IdSelector":
      return `#${node.name}`;
    case "PseudoClassSelector":
      if (node.children) {
        const inner: string[] = [];
        for (const child of node.children) {
          inner.push(nodeToString(child));
        }
        return `:${node.name}(${inner.join("")})`;
      }
      return `:${node.name}`;
    case "PseudoElementSelector":
      return `::${node.name}`;
    case "AttributeSelector":
      return `[${node.name?.name ?? ""}${node.matcher ?? ""}${node.value ? nodeToString(node.value) : ""}]`;
    case "Selector": {
      const parts: string[] = [];
      if (node.children) {
        for (const child of node.children) {
          parts.push(nodeToString(child));
        }
      }
      return parts.join("");
    }
    case "SelectorList": {
      const sels: string[] = [];
      if (node.children) {
        for (const child of node.children) {
          sels.push(nodeToString(child));
        }
      }
      return sels.join(", ");
    }
    case "Raw":
      return node.value;
    case "UnicodeRange":
      return node.value;
    default:
      // Fallback: if it has children, serialize them
      if ("children" in node && node.children) {
        const parts: string[] = [];
        for (const child of node.children) {
          parts.push(nodeToString(child));
        }
        return parts.join("");
      }
      if ("value" in node && typeof node.value === "string") {
        return node.value;
      }
      return "";
  }
}

/**
 * Walk up the AST to find an enclosing @media rule and return its condition string.
 */
function getMediaAncestor(context: { atrule: Atrule | null }): string | null {
  // css-tree walk provides atrule context
  const atrule = context.atrule;
  if (!atrule || atrule.name !== "media") return null;
  if (!atrule.prelude) return null;

  if (atrule.prelude.type === "Raw") {
    return atrule.prelude.value.trim();
  }

  return null;
}

/**
 * Check if we're inside a skipped at-rule (keyframes, font-face, etc.)
 */
function isInsideSkippedAtrule(context: { atrule: Atrule | null }): boolean {
  const atrule = context.atrule;
  if (!atrule) return false;

  const name = atrule.name.toLowerCase();
  return name === "keyframes" || name === "-webkit-keyframes" || name === "font-face";
}
