export interface AiPrompt { system: string; user: string }
export interface AiNarrative { text: string; citedTraceIds: string[] }
export interface AiAdapter { generate(prompt: AiPrompt): Promise<unknown> }
