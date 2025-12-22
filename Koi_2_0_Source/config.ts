// config.ts - Feature Flags for Development/Production

export const DEBUG_CONFIG = {
    // Master switch for all spot genetics debug features
    SHOW_SPOT_GENETICS_DEBUG: true,  // Set to false for production

    // Individual debug features
    SHOW_GENE_VALUES: true,
    SHOW_PHENOTYPE_PREVIEW: true,
    SHOW_INHERITANCE_FLOW: true,
    SHOW_EPISTASIS: true,
};

// Environment detection (Vite compatible)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IS_DEVELOPMENT = (import.meta as any).env?.DEV ?? true;

// Auto-disable debug in production
export const getDebugConfig = () => {
    if (!IS_DEVELOPMENT) {
        return {
            SHOW_SPOT_GENETICS_DEBUG: false,
            SHOW_GENE_VALUES: false,
            SHOW_PHENOTYPE_PREVIEW: false,
            SHOW_INHERITANCE_FLOW: false,
            SHOW_EPISTASIS: false,
        };
    }
    return DEBUG_CONFIG;
};
