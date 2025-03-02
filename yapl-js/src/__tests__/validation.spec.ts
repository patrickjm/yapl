import { describe, it, expect } from "bun:test";
import { validateSchema } from "../validation";
import { DEFAULT_OUTPUT_ID } from "../constants";

describe("validateSchema", () => {
  it("should throw error if named output is duplicated", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4o",
      chains: {
        default: {
          chain: {
            messages: [
              { output: { id: "abc" } },
              { output: { id: "abc" } }
            ]
          }
        }
      }
    };
    expect(() => validateSchema("test", schema)).toThrow();
  });

  it("should throw error if default output is not last", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4o",
      chains: {
        default: {
          chain: {
            messages: [
              { output: { id: DEFAULT_OUTPUT_ID } },
              { output: { id: "abc" } }
            ]
          }
        }
      }
    };
    expect(() => validateSchema("test", schema)).toThrow();
  });

  it("should throw error if input conflicts with builtins", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4o",
      inputs: ["chains"],
      messages: []
    };
    expect(() => validateSchema("test", schema, { chains: {} } as any)).toThrow();
  });

  it("should throw an error if there is a circular dependency", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4o",
      chains: {
        a: { dependsOn: ["b"], chain: { messages: [] }},
        b: { dependsOn: ["a"], chain: { messages: [] }},
      }
    };
    expect(() => validateSchema("test", schema)).toThrow();
  });

  it("should not throw an error if there are no circular dependencies", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4",
      chains: {
        a: { dependsOn: ["b"], chain: { messages: [] }},
        b: { dependsOn: ["c"], chain: { messages: [] }},
        c: { dependsOn: [], chain: { messages: [] }},
      }
    };
    expect(() => validateSchema("test", schema)).not.toThrow();
  });

  it("should throw an error if a chain is not declared", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4",
      chains: {
        a: { dependsOn: ["b"], chain: { messages: [] }},
        b: { dependsOn: ["c"], chain: { messages: [] }},
      }
    };
    expect(() => validateSchema("test", schema)).toThrow();
  });

  it("should work with no chains", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4",
      chains: {}
    };
    expect(() => validateSchema("test", schema)).not.toThrow();
  });

  it("should work with no dependencies", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4",
      chains: {
        a: { dependsOn: [], chain: { messages: [] }},
      }
    };
    expect(() => validateSchema("test", schema)).not.toThrow();
  });

  it("should work with multiple complicated chains", () => {
    const schema = {
      provider: "openai",
      model: "gpt-4",
      chains: {
        a: { dependsOn: ["b"], chain: { messages: [] }},
        b: { dependsOn: ["c"], chain: { messages: [] }},
        c: { dependsOn: ["d"], chain: { messages: [] }},
        d: { dependsOn: ["e"], chain: { messages: [] }},
        e: { dependsOn: [], chain: { messages: [] }},
      }
    };
    expect(() => validateSchema("test", schema)).not.toThrow();
  });
});