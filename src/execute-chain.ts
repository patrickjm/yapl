import type { Liquid } from "liquidjs";
import type { Chain } from "./schema";
import type { BuiltinInputs, Inputs, Message, Model, Provider, Tool, YaplCache, YaplLogger } from "./public-types";
import { messagesToInstructions, processInputs, renderInstruction, toModel } from "./utils";
import { type ContextOutputs, type Maybe, type OutputInstruction } from "./types";
import { executeOutput } from "./execute-output";
import type { Yapl } from ".";

export interface ExecuteChainOptions {
  path: string;
  chain: Chain;
  inputs: Inputs;
  builtins: BuiltinInputs;
  id: string;
  liquid: Liquid;
  logger?: YaplLogger;
  cache?: YaplCache;
  providers: Provider[];
  tools: Tool<any>[];
  defaults?: {
    provider?: Maybe<string>;
    model?: Maybe<Model>;
    tools?: Maybe<string[]>;
  };
  yapl: Yapl;
}
export async function executeChain(opts: ExecuteChainOptions) {
  const { path, chain, inputs, id } = opts;
  const _inputs = processInputs(inputs!, chain.inputs);
  const tape: any[] = await messagesToInstructions(path, chain.messages);

  let msgs: Message[] = [];
  let outputs: ContextOutputs = {};

  for (const _instr of tape) {
    // render the instruction (inline update)
    const instr = await renderInstruction(path, opts.liquid, _instr, _inputs, opts.builtins);
    opts.logger?.verbose("Instruction type: " + instr.type);
    switch (instr.type) {
      case "push":
        msgs.push(instr.message);
        break;
      case "output":
        const output = instr as OutputInstruction;
        const tools = [...(chain.tools ?? []), ...(output.tools ?? [])];
        const [messages, _cost] = await executeOutput({
          path,
          type: "chat",
          messages: msgs,
          providers: opts.providers,
          tools: opts.tools,
          defaults: opts.defaults,
          cache: opts.cache,
          logger: opts.logger,
          output: {
            model: toModel(output.model ?? chain.model),
            provider: output.provider ?? chain.provider,
            tools: tools,
            format: output.format
          }
        });
        opts.yapl.addCost(_cost);
        msgs = messages;
        let value: any;
        if (output.format?.json) {
          try {
            value = JSON.parse(messages[messages.length - 1].content);
          } catch (e) {
            opts.logger?.warn(path + `: Failed to parse JSON: ${e}\nResponse: ${JSON.stringify(messages[messages.length - 1])}`);
          }
        }
        if (output.id) {
          outputs[output.id] = { ...messages[messages.length - 1], value };
        }
        break;
      case "clear":
        if (instr.system || msgs[0]?.role !== "system") {
          msgs = [];
        } else {
          msgs = msgs.slice(0, 1);
        }
        break;
    }
  }
  return {
    messages: msgs,
    outputs: outputs
  };
}