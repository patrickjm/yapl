import type { Liquid } from "liquidjs";
import { z } from "zod";
import type { ExecuteOutputOptions } from "./execute-output";
import type { SchemaInputs, SchemaMessages } from "./schema";
import type { BuiltinInputs, Cost, Inputs, Model } from "./public-types";
import type { Instruction, OutputInstruction, ClearInstruction, PushMessageInstruction, ContextOutputs } from "./types";
import { DEFAULT_OUTPUT_ID } from "./constants";

/**
 * Maps the messages from the YAML format to a uniform message instruction array.
 */
export async function messagesToInstructions(path: string, messages: SchemaMessages): Promise<Instruction[]> {
  const mapped: Instruction[] = await Promise.all(messages.map(async (m) => {
    if (m === "output") {
      return { type: "output" } as OutputInstruction;
    } else if (m === "clear") {
      return { type: "clear" } as ClearInstruction;
    } else if ("output" in m) {
      return {
        type: "output",
        id: m.output.id,
        tools: m.output.tools,
        format: m.output.format,
        provider: m.output.provider,
        model: toModel(m.output.model)
      } as OutputInstruction;
    } else if ("clear" in m) {
      return {
        type: "clear",
        system: m.clear.system
      } as ClearInstruction;
    } else {
      let content: string;
      let role: "user" | "assistant" | "system";
      if ("role" in m) {
        content = m.content;
        role = m.role as any;
      } else if ("user" in m) {
        content = m.user;
        role = "user";
      } else if ("assistant" in m) {
        content = m.assistant;
        role = "assistant";
      } else if ("system" in m) {
        content = m.system;
        role = "system";
      } else {
        throw new Error(path + ": Invalid message type: " + JSON.stringify(m));
      }
      if (content.endsWith("\n")) {
        // 1 newline at the end that seems to be added by the YAML parser.
        // Not calling .trim() in case user wants to try weird things with trailing newlines.
        content = content.slice(0, -1);
      }
      return {
        type: "push",
        message: { role, content }
      } as PushMessageInstruction;
    }
  }));
  if (mapped[mapped.length - 1].type !== "output") {
    mapped.push({ type: "output" });
  }
  if (!(mapped[mapped.length - 1] as OutputInstruction).id) {
    (mapped[mapped.length - 1] as OutputInstruction).id = DEFAULT_OUTPUT_ID;
  }
  return mapped;
}

export async function renderInstruction(path: string, liquid: Liquid, inst: Instruction, inputs: Inputs, builtins: BuiltinInputs): Promise<Instruction> {
  const context = { ...inputs, ...builtins };
  if (inst.type === "output") {
    if (typeof inst.format?.json === "string") {
      inst.format.json = await liquid.parseAndRender(inst.format.json, context);
    }
  } else if (inst.type === "push") {
    inst.message.content = await liquid.parseAndRender(inst.message.content, context);
  }
  return inst;
}

/**
 * Picks the model, provider, and tools from the YAML file, the defaults, or the Yapl constructor.
 */
export function resolveConfig({ path, output: reply, defaults, providers, tools }: ExecuteOutputOptions) {
  let _model = reply.model;
if (!_model || !_model?.name) _model = defaults?.model;
  if (!_model) throw new Error(path + ": No model found: Model must be set on yml level, the reply level, or as a default in the Yapl constructor");

  const _providerName = reply.provider || defaults?.provider;
  if (!_providerName) throw new Error(path + ": No provider found: Provider must be set on yml level, the reply level, or as a default in the Yapl constructor");

  const _provider = providers.find(p => p.name === _providerName);
  if (!_provider) throw new Error(path + `: Provider ${_providerName} not found`);

  const _toolNames = Array.from(new Set(reply.tools || defaults?.tools || []));
  const _tools = _toolNames.map(name => {
    const ret = tools.find(t => t.function.name === name);
    if (!ret) throw new Error(path + `: Tool ${name} not found in Yapl tools`);
    return ret;
  });

  return { model: _model, provider: _provider, tools: _tools };
}

/**
 * Validates the inputs against the schema and returns the inputs.
 */
export function processInputs(inputs: Inputs, schema: SchemaInputs) {
  const validator = z.object(
    Object.fromEntries(
      schema?.map(i => [i, z.any()]) ?? []
    )
  );
  validator.parse(inputs);
  inputs = { ...inputs };
  return inputs;
}

export function addCost(a: Cost, b: Cost) {
  return {
    usd: a.usd + b.usd,
    tokens: a.tokens + b.tokens,
    ms: a.ms + b.ms
  } as Cost;
}

export function toModel(model: string | Model | undefined): Model | undefined {
  if (!model) return undefined;
  if (typeof model === "string") {
    if (!model) return undefined;
    return { name: model };
  }
  return model as Model;
}