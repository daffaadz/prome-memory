import { z } from 'zod';

export const DecisionTypeSchema = z.enum(['architecture', 'convention', 'scope']);
export type DecisionType = z.infer<typeof DecisionTypeSchema>;

export const CoreStatusSchema = z.enum(['uninitialized', 'initialized']);
export type CoreStatus = z.infer<typeof CoreStatusSchema>;

export const CoreFrontmatterSchema = z.object({
  project: z.string().min(1, 'Project name is required'),
  created: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Created must be a valid ISO 8601 date string',
  }),
  version: z.number().int().positive('Version must be a positive integer'),
  status: CoreStatusSchema,
});
export type CoreFrontmatter = z.infer<typeof CoreFrontmatterSchema>;

export const CoreFileContentSchema = z.object({
  frontmatter: CoreFrontmatterSchema,
  body: z.string(),
});
export type CoreFileContent = z.infer<typeof CoreFileContentSchema>;

export const StateFrontmatterSchema = z.object({
  last_updated: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'last_updated must be a valid ISO 8601 date string',
  }),
  session_count: z.number().int().min(0, 'session_count must be non-negative'),
});
export type StateFrontmatter = z.infer<typeof StateFrontmatterSchema>;

export const StateFileContentSchema = z.object({
  frontmatter: StateFrontmatterSchema,
  body: z.string(),
});
export type StateFileContent = z.infer<typeof StateFileContentSchema>;

export const DecisionSchema = z.object({
  id: z.string().regex(/^d-\d+$/, 'Decision ID must match format d-0001'),
  ts: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'ts must be a valid ISO 8601 date string',
  }),
  type: DecisionTypeSchema,
  summary: z.string().min(1, 'summary is required'),
  reason: z.string().min(1, 'reason is required'),
  ref: z.array(z.string()).default([]),
  supersedes: z.string().nullable().default(null),
  compacted: z.boolean().default(false),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const DecisionInputSchema = z.object({
  type: DecisionTypeSchema,
  summary: z.string().min(1, 'summary is required'),
  reason: z.string().min(1, 'reason is required'),
  ref: z.array(z.string()).optional().default([]),
  supersedes: z.string().nullable().optional().default(null),
  compacted: z.boolean().optional().default(false),
});
export type DecisionInput = z.infer<typeof DecisionInputSchema>;

export const ConfigSchema = z.object({
  prome_version: z.number().int().positive(),
  agent_adapters: z.array(z.string()).default([]),
  compaction: z.object({
    trigger: z.enum(['session_count']),
    threshold: z.number().int().positive(),
  }),
  recall: z.object({
    mode: z.enum(['grep']),
  }),
});
export type Config = z.infer<typeof ConfigSchema>;

