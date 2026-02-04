export function createPageUrl(pageName: string) {
    const raw = String(pageName || '').trim();
    const withDashes = raw
      .replace(/ /g, '-')
      // camelCase/PascalCase -> kebab-case
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2');
    return '/' + withDashes.toLowerCase();
}
