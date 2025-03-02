import fs from "fs";
import yaml from "js-yaml";
import { Liquid } from "liquidjs";
import path from "path";
import { DEFAULT_CHAIN_ID, DEFAULT_OUTPUT_ID } from "./constants";
import { executeChain } from "./execute-chain";
import { Provider, type BuiltinInputs, type CallResult, type Cost, type Inputs, type Model, type Tool, type YaplCache, type YaplLogger, type YaplProgram } from "./public-types";
import { schema, type Schema } from "./schema";
import { addCost, toModel } from "./utils";
import { validateSchema } from "./validation";

export * from "./providers";
export * from "./public-types";


export interface YaplOptions {
  defaults?: {
    provider?: string;
    model?: Model;
    tools?: string[];
  };
  tools?: Tool<any>[];
  providers: Provider[];
  cache?: YaplCache;
  logger?: YaplLogger;
}

/**
 * Yapl engine. Executes YAML files as chains of LLM messages.
 */
export class Yapl {
  private defaults?: {
    provider?: string;
    model?: Model;
    tools?: string[];
  };
  private providers: Provider[];
  private tools: Tool<any>[];
  private _cost: Cost = { usd: 0, tokens: 0, ms: 0 };
  public readonly liquid: Liquid;
  private cache?: YaplCache;
  private logger?: YaplLogger;

  get cost() {
    return Object.assign({}, this._cost);
  }

  constructor(options: YaplOptions) {
    this.providers = options.providers;
    this.tools = options.tools || [];
    this.defaults = options.defaults;
    this.cache = options.cache;
    this.logger = options.logger;

    this.liquid = new Liquid();
    this.setupLiquid();
  }

  private setupLiquid() {
    this.liquid.registerFilter("json", (input: any) => JSON.stringify(input, null, 2));
  }

  /**
   * Loads a YAML file and returns a function that can be used to execute the YAML file as a string of LLM messages.
   * @param filePath The path to the YAML file.
   * @returns A function that can be used to execute the YAML file.
   */
  loadFile(filePath: string): YaplProgram {
    filePath = path.relative(process.cwd(), filePath);
    this.logger?.info(`YAPL: Loading YAML file: ${filePath}`);
    // read and parse the file
    const file = fs.readFileSync(filePath, "utf8");
    const yml = yaml.load(file, { filename: filePath });
    const data = schema.parse(yml);
    
    // Along with the user-defined inputs, these values are passed to liquidjs for interpolation.
    const builtinInputs: BuiltinInputs = {
      chains: {},
      outputs: {}
    };
    validateSchema(filePath, data, builtinInputs);

    // return a function that can be used to execute the YAML file
    return (inputs?: Inputs) => this._call(filePath, data, inputs ?? {}, builtinInputs);
  }

  loadString(yml: string) {
    const filePath = '(yapl:loadString)';
    const parsed = yaml.load(yml, { filename: filePath });
    const data = schema.parse(parsed);
    
    // Along with the user-defined inputs, these values are passed to liquidjs for interpolation.
    const builtinInputs: BuiltinInputs = {
      chains: {},
      outputs: {}
    };
    
    validateSchema(filePath, data, builtinInputs);

    return (inputs?: Inputs) => this._call(filePath, data, inputs ?? {}, builtinInputs);
  }

  private _call = async (filePath: string, data: Schema, inputs: Inputs, builtins: BuiltinInputs): Promise<CallResult> => {
    this.logger?.info(`YAPL: Calling file: ${filePath}`);
    const defaultExecuteOpts = {
      path: filePath,
      liquid: this.liquid,
      providers: this.providers,
      inputs: inputs ?? {},
      builtins,
      tools: this.tools,
      yapl: this,
      cache: this.cache,
      logger: this.logger,
      defaults: this.defaults,
    };
    if ('messages' in data) {
      // Simple format: The file itself is a single chain definition
      const result = await executeChain({
        ...defaultExecuteOpts,
        id: DEFAULT_OUTPUT_ID,
        chain: {
          messages: data.messages,
          inputs: data.inputs ?? [],
          model: toModel(data.model ?? this.defaults?.model),
          provider: data.provider ?? this.defaults?.provider,
          tools: data.tools ?? this.defaults?.tools,
        }
      });
      return {
        messages: result.messages ?? null,
        output: result.outputs[DEFAULT_OUTPUT_ID] ?? null,
        content: result.messages[result.messages.length - 1].content ?? null,
        value: result.outputs[DEFAULT_OUTPUT_ID].value ?? null,
        chains: {
          [DEFAULT_OUTPUT_ID]: result
        }
      }
    } else if ('chains' in data) {
      let results: Record<string, Awaited<ReturnType<typeof executeChain>>> = {};
      const satisfied: string[] = [];
      while (satisfied.length < Object.keys(data.chains).length) {
        const next = Object.entries(data.chains)
          .filter(([name, chain]) => (chain.dependsOn ?? []).every(dep => satisfied.includes(dep)))
          .map(([name, chain]) => name);
        const _results = await Promise.all(
          next.map(name => executeChain({
            ...defaultExecuteOpts,
            id: name,
            chain: {
              ...data.chains[name].chain,
              provider: data.chains[name].chain.provider ?? data.provider,
              model: data.chains[name].chain.model ?? data.model,
            }
          }).then(result => ({
            id: name,
            ...result
          })))
        );
        _results.forEach(result => results[result.id] = result);
        builtins.chains = results;
        satisfied.push(...next);
      }
      const defaultChain = results[DEFAULT_CHAIN_ID];
      return {
        messages: defaultChain?.messages ?? null,
        output: defaultChain?.outputs[DEFAULT_OUTPUT_ID] ?? null,
        content: defaultChain?.messages[defaultChain.messages.length - 1].content ?? null,
        value: defaultChain?.outputs[DEFAULT_OUTPUT_ID]?.value ?? null,
        chains: results
      }
    }
    throw new Error(`YAPL: Invalid YAML file: ${filePath}`);
  }

  addCost(cost: Cost) {
    this._cost = addCost(this._cost, cost);
  }
}