// Structural boundary for the public sf-jexl/language export. Local development
// bundles its source without pulling the browser editor into this package.
declare module 'sf-jexl/language' {
  import type { LangiumServices, LangiumSharedServices, DefaultSharedModuleContext } from 'langium/lsp';
  export function createJexlServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    Jexl: LangiumServices & {
      JexlContext: {
        loadFromObject(context: Record<string, unknown>): void;
        mergeContext(context: Record<string, unknown>): void;
        clearDocumentVariables(uri: string): void;
      };
    };
  };
}
