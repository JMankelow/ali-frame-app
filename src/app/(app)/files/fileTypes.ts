// Split out of actions.ts: a "use server" file may only export async functions,
// so this shared constant (needed by both the server action and client forms)
// lives in its own plain module.
export const FILE_TYPES = ["Plan", "Photos", "Supplier Quote", "Site Measure", "Correspondence", "Other"] as const;
