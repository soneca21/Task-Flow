import { useEffect } from 'react';
import { normalizePtBrText } from '@/lib/utils';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);

function normalizeTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const original = node.nodeValue;
  if (!original || (!original.includes('�') && !/[ÃÂ]/.test(original))) return;
  const fixed = normalizePtBrText(original);
  if (fixed && fixed !== original) {
    node.nodeValue = fixed;
  }
}

function walkAndNormalize(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = walker.nextNode();
  while (current) {
    normalizeTextNode(current);
    current = walker.nextNode();
  }
}

export default function TextNormalizer() {
  useEffect(() => {
    walkAndNormalize(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            normalizeTextNode(node);
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (SKIP_TAGS.has(node.tagName)) return;
            walkAndNormalize(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
