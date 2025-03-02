import { beforeEach, describe, expect, it } from "bun:test";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { Cost, Message, Provider, ProviderExecuteParams, Yapl } from "..";

type FixtureFile = { prompt: string, response: string }[];
class TestProvider extends Provider {
  responses?: FixtureFile;
  constructor(name: string, private readonly responsesFile?: string) {
    super(name);
    if (responsesFile) {
      this.responses = yaml.load(fs.readFileSync(responsesFile, "utf8")) as FixtureFile;
    }
  }
  execute(params: ProviderExecuteParams): Promise<[Message[], Cost]> {
    const { messages } = params;
    const prompt = messages[messages.length - 1].content;
    const response = this.responses?.find(r => r.prompt.trim() === prompt.trim())?.response;
    if (!response) {
      throw new Error(`No response found for prompt: ${prompt}`);
    }
    return Promise.resolve([[{
      role: "assistant",
      content: response!.trim()
    }], { ms: 0, tokens: 0, usd: 0 }]);
  }
}

describe("Yapl", () => {

	it("loads a yapl file 01_basic", async () => {
		const yapl = new Yapl({
			providers: [new TestProvider("test", path.join(__dirname, "fixtures/01_basic.responses.yml"))]
		});
    const prog = yapl.loadFile(path.join(__dirname, "fixtures/01_basic.yapl.yml"));
    const result = await prog();
    expect(result.output).toEqual({
      content: `{ "temperature": 2000 }`,
      role: "assistant",
      value: { temperature: 2000 }
    });
    expect(Object.keys(result.chains).length).toBe(1);
    expect(result.output).toEqual(result.chains.default.outputs.default);
    expect(result.messages?.length).toBe(3);
    expect(result.content).toBe(`{ "temperature": 2000 }`);
    expect(result.value).toEqual({ temperature: 2000 });
	});

  it("loads a yapl file 02_chain", async () => {
    const yapl = new Yapl({
      providers: [new TestProvider("test", path.join(__dirname, "fixtures/02_chain.responses.yml"))]
    });
    yapl.liquid.registerFilter("stringify", (value: string) => JSON.stringify(value));
    const prog = yapl.loadFile(path.join(__dirname, "fixtures/02_chain.yapl.yml"));
    const result = await prog();
    expect(result.output).toEqual({
      content: `["BLUE", "PIZZA", "COFFEE"]`,
      role: "assistant",
      value: ["BLUE", "PIZZA", "COFFEE"]
    });
    expect(result.output).toEqual(result.chains.default.outputs.default);
    expect(result.messages?.length).toBe(2);
    expect(result.content).toBe(`["BLUE", "PIZZA", "COFFEE"]`);
    expect(result.value).toEqual(["BLUE", "PIZZA", "COFFEE"]);
    expect(result.chains.favorites.messages?.length).toBe(3);
    expect(result.chains.favorites.outputs.default).toEqual({
      content: `{ "favorites": ["blue", "pizza", "coffee"] }`,
      role: "assistant",
      value: { favorites: ["blue", "pizza", "coffee"] }
    });
  });

  describe("Error cases 03_errors_galore.multi", () => {
    let yamlContents: string[];

    beforeEach(() => {
      const filePath = path.join(__dirname, "fixtures/03_errors_galore.multi.yapl.yml");
      const fileContent = fs.readFileSync(filePath, 'utf8');
      yamlContents = fileContent.split('---');
    });

    it("errors on circular dependencies", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[0])).toThrow(/Circular dependency/);
    });

    it("errors on unknown chains", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[1])).toThrow(/not declared but is listed as a dependency of/);
    });

    it("errors on unknown providers", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      const prog = yapl.loadString(yamlContents[2]);
      await expect(prog()).rejects.toThrow(/Provider some-unknown-provider not found/);
    });

    it("errors on duplicate output ids", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[3])).toThrow(/Chain "default" has duplicate output name "123"/);
    });

    it("errors on named default output before last output", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[4])).toThrow(/output must be the last output/);
    });

    it("errors on inputs conflict with builtins (chains)", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[5])).toThrow(/The 'chains' input is reserved for internal use/);
    });

    it("errors on inputs conflict with builtins (outputs)", async () => {
      const yapl = new Yapl({
        providers: [new TestProvider("test")]
      });
      await expect(() => yapl.loadString(yamlContents[6])).toThrow(/The 'outputs' input is reserved for internal use/);
    });
  });

  it("should use model params 04_model_params", async () => {
    class ModelParamProvider extends Provider {
      constructor() {
        super("test");
      }
      execute(params: ProviderExecuteParams): Promise<[Message[], Cost]> {
        expect(params.model.params).toEqual({ temperature: 100 });
        return Promise.resolve([[{
          role: "assistant",
          content: "Hello"
        }], { ms: 0, tokens: 0, usd: 0 }]);
      }
    }
    const yapl = new Yapl({
      providers: [new ModelParamProvider()]
    });
    const prog = yapl.loadFile(path.join(__dirname, "fixtures/04_model_params.yapl.yml"));
    await prog();
  });
});