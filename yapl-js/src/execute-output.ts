import { Validator } from "jsonschema";
import { Provider, type CacheValueMetadata, type Cost, type Message, type Model, type OutputFormat, type Tool, type ToolCall, type YaplCache, type YaplLogger } from "./public-types";
import { addCost, toModel } from "./utils";
import { resolveConfig } from "./utils";
import { type Maybe } from "./types";
import { hashKey, type HashKey } from "./cache";


export interface ExecuteOutputOptions {
  /** The path to the YAML file. Used for error messages. */
  path: string;
  type: "chat";
  messages: Message[];
  output: {
    provider: Maybe<string>;
    model: Maybe<Model>;
    tools: Maybe<string[]>;
    format?: OutputFormat,
  };
  logger?: YaplLogger;
  cache?: YaplCache;
  providers: Provider[];
  tools: Tool<any>[];
  defaults?: {
    provider?: Maybe<string>;
    model?: Maybe<Model>;
    tools?: Maybe<string[]>;
  };
}
/**
 * A lower level wrapper around the provider.
 * 0. If the list of messages is already in the cache, return the cached response
 * 1. Otherwise, calls the provider with a list of messages
 * 2. If the provider returns tool calls, they are executed and the results are added to the messages
 */
export async function executeOutput(_output: ExecuteOutputOptions): Promise<[Message[], Cost]> {
  const { path, type, messages, output, ...opts } = _output;
  opts.logger?.verbose(`YAPL: Executing part of file: ${path}`);
  let allMessages = messages.slice();
  let toolCalls: ToolCall[] | undefined;
  let _cost: Cost = { usd: 0, tokens: 0, ms: 0 };

  const config = resolveConfig(_output);
  opts.logger?.verbose(`YAPL: Resolved config: ${JSON.stringify({
    provider: config.provider.name,
    model: config.model,
    tools: config.tools,
  })}`);


  const cached = await opts.cache?.get(
    hashKey({
      provider: config.provider.name,
      model: toModel(config.model)!,
      tools: config.tools,
      format: output.format,
      messages: messages
    })
  );
  if (cached?.length) {
    opts.logger?.verbose(`YAPL: Cache hit`);
    return [[...messages, ...cached], { ms: 0, tokens: 0, usd: 0 }];
  }
  opts.logger?.verbose(`YAPL: Cache miss`);

  do {
    opts.logger?.debug(`YAPL: Executing provider with messages: ${JSON.stringify(allMessages, null, 2)}`);
    const [newMessages, cost] = await config.provider.execute({
      type,
      model: toModel(config.model)!,
      messages: allMessages,
      tools: config.tools,
      format: output.format
    });
    opts.logger?.debug(`YAPL: Received new messages: ${JSON.stringify(newMessages, null, 2)}`);
    _cost = addCost(_cost, cost);
    allMessages = [...allMessages, ...newMessages];

    const lastMessage = newMessages[newMessages.length - 1];
    toolCalls = 'toolCalls' in lastMessage ? lastMessage.toolCalls : undefined;

    if (!toolCalls) {
      opts.logger?.verbose(`YAPL: No tool calls`);
      break;
    }

    for (const call of toolCalls) {
      opts.logger?.verbose(`YAPL: Executing tool call: ${call.function.name}`);
      const tool = config.tools.find(tool => tool.function.name === call.function.name);
      if (!tool) throw new Error(path + `: Tool ${call.function.name} not specified, but was called by LLM: ${JSON.stringify(lastMessage)}`);
      let args: any;
      // try parsing and validating tool call args
      try {
        const validator = new Validator();
        const args = JSON.parse(call.function.arguments);
        validator.validate(args, tool.function.arguments as any);
      } catch (e) {
        opts.logger?.warn(path + `: Tool call ${call.function.name} arguments failed to parse: ${e}\nResponse: ${JSON.stringify(lastMessage)}`);
        allMessages.push({
          role: 'tool',
          content: `Error: Tool call ${call.function.name} arguments failed to parse: ${e}`,
          toolCallId: call.id
        });
        continue;
      }
      // try executing the tool and adding the result to the messages
      try {
        const result = await tool.function.execute(args);
        opts.logger?.debug(`YAPL: Tool call result: ${result}`);
        allMessages.push({
          role: 'tool',
          content: result,
          toolCallId: call.id
        });
      } catch (e) {
        opts.logger?.warn(path + `: Tool call ${call.function.name} failed: ${e}\nResponse: ${JSON.stringify(lastMessage)}`);
        allMessages.push({
          role: 'tool',
          content: `Error: Tool call ${call.function.name} failed: ${e}`,
          toolCallId: call.id
        });
      }
    }
  } while (toolCalls && toolCalls.length > 0);

  opts.logger?.verbose(`YAPL: Saving to cache`);
  const cacheMetadata: CacheValueMetadata = {
    provider: config.provider.name,
    model: toModel(config.model)!,
    tools: config.tools.map(tool => ({ ...tool, function: { ...tool.function, execute: undefined } } as any)),
    format: output.format
  };
  const cacheKey = { ...cacheMetadata, messages: messages };
  opts.cache?.set(
    hashKey(cacheKey), 
    allMessages.slice(messages.length),
    cacheMetadata
  );

  return [allMessages, _cost];
}