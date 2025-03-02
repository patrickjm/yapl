import type { JSONSchema7 } from "json-schema";
import type { z, ZodTypeAny } from "zod";
import type { executeChain } from "./execute-chain";

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  }
}

export interface BaseMessage {
  content: string;
}

export interface UserMessage extends BaseMessage {
  role: "user";
}

export interface SystemMessage extends BaseMessage {
  role: "system";
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  toolCalls?: ToolCall[];
}

export interface ToolMessage extends BaseMessage {
  role: "tool";
  toolCallId: string;
}

export interface Tool<T extends ZodTypeAny = any> {
  type: "function";
  function: {
    name: string;
    description: string;
    arguments: JSONSchema7;
    execute: (args: z.infer<T>) => Promise<string>;
  }
}

export type Message = UserMessage | SystemMessage | AssistantMessage | ToolMessage;

export interface Cost {
  usd: number;
  tokens: number;
  ms: number;
}

export interface OutputFormat {
  json?: boolean | string;
}

export type YaplProgram = (inputs?: Inputs) => Promise<CallResult>;

export interface Model {
  name: string;
  params?: Record<string, any>;
}

export interface ProviderExecuteParams {
  type: "chat";
  model: Model;
  messages: Message[];
  tools: Tool<any>[];
  format?: OutputFormat;
}

export abstract class Provider {
  readonly name: string;
  abstract execute(params: ProviderExecuteParams): Promise<[Message[], Cost]>;
  constructor(name: string) {
    this.name = name;
  }
}

export interface CacheValueMetadata {
  provider: string;
  model: Model;
  tools: Tool<any>[];
  format?: OutputFormat;
}

export interface YaplCache {
  set(key: string, value: Message[], metadata: CacheValueMetadata): Promise<void>;
  get(key: string): Promise<Message[] | undefined>;
}

export interface YaplLogger {
  error: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
  info: (message: string, meta?: Record<string, any>) => void;
  verbose: (message: string, meta?: Record<string, any>) => void;
}

/** The inputs for executing a Yapl schema. They're interpolated into the message content using liquidjs.*/
export type Inputs = Record<string, any>;

export interface BuiltinInputs {
  outputs: Record<string, {
    role: Message["role"];
    content: string;
    value?: any;
  }>;
  chains: Record<string, {
    outputs: BuiltinInputs["outputs"];
  }>;
}

export interface CallResult {
  /**
   * The messages that were sent and received during the execution of the default chain.
   * 
   * Shorthand for `.chains.default.outputs.default.messages` 
   */
  messages: Message[] | null,
  /** 
   * The default outputs of the default chain.
   * 
   * Shorthand for `.chains.default.outputs.default.value` 
   */
  output: Record<string, any> | null,
  /** Map of chain names to their results. */
  chains: Record<string, Awaited<ReturnType<typeof executeChain>>>,
  /** 
   * The response content of the default output of the default chain.
   * 
   * Shorthand for `.chains.default.outputs.default.content` 
   */
  content: string|null,
  /** 
   * The parsed JSON value of the default output of the default chain.
   * 
   * Shorthand for `.chains.default.outputs.default.value` 
   */
  value: any;
}