import { describe, it, expect, beforeEach } from "bun:test";
import { resolveConfig } from "../utils";
import { ExecuteOutputOptions } from "../execute-output";

describe("resolveConfig", () => {
  let mockProvider: any;
  let defaultProvider: any;
  let mockTool: any;
  let defaultTool: any;
  let options: ExecuteOutputOptions;

  beforeEach(() => {
    mockProvider = {
      name: "mockProvider",
      execute: async () => [[], { usd: 0, tokens: 0, ms: 0 }],
    };
    defaultProvider = {
      name: "defaultProvider",
      execute: async () => [[], { usd: 0, tokens: 0, ms: 0 }],
    };
    mockTool = {
      type: "function",
      function: {
        name: "mockTool",
        description: "A mock tool",
        arguments: {},
        execute: async () => "Mock tool result",
      },
    };
    defaultTool = {
      type: "function",
      function: {
        name: "defaultTool",
        description: "A default tool",
        arguments: {},
        execute: async () => "Default tool result",
      },
    };
  
    options = {
      path: "test",
      type: "chat",
      messages: [],
      output: {
        provider: "mockProvider",
        model: { name: "replyModel" },
        tools: ["mockTool"],
      },
      defaults: {
        provider: "defaultProvider",
        model: { name: "defaultModel" },
        tools: ["defaultTool"],
      },
      providers: [mockProvider, defaultProvider],
      tools: [mockTool, defaultTool],
    };
  });

  it("should prioritize the reply level over the defaults", () => {
    const result = resolveConfig(options);

    expect(result.provider.name).toBe("mockProvider");
    expect(result.model).toEqual({ name: "replyModel" });
    expect(result.tools).toHaveLength(1);
  });

  it("should fall back to the defaults if the reply level is set to null", () => {
    const result = resolveConfig({ 
      ...options, 
      output: {
        provider: null,
        model: null,
        tools: null,
      }
    });

    expect(result.provider.name).toBe("defaultProvider");
    expect(result.model).toEqual({ name: "defaultModel" });
    expect(result.tools).toHaveLength(1);
  });

  it("should fall back to the defaults if the reply level is set to empty strings", () => {
    const result = resolveConfig({ 
      ...options, 
      output: {
        provider: "",
        model: { name: "" },
        tools: [],
      }
    });

    expect(result.provider.name).toBe("defaultProvider");
    expect(result.model).toEqual({ name: "defaultModel" });
    expect(result.tools).toHaveLength(0);
  });

  it("should throw if the reply level provider is not found", () => {
    expect(() => resolveConfig({ ...options, output: { provider: "nonexistentProvider", model: null, tools: [] } })).toThrow();
  });

  it("should throw if the default provider is not found", () => {
    expect(() => resolveConfig({ 
      ...options, 
      output: {
        provider: null,
        model: null,
        tools: null,
      },
      defaults: { 
        provider: "nonexistentProvider", 
        model: null, 
        tools: [] 
      } 
    })).toThrow();
  });

  it("should throw if reply level tools are not found", () => {
    expect(() => resolveConfig({ 
      ...options, 
      output: {
        provider: null,
        model: null,
        tools: ["nonexistentTool"],
      },
      defaults: { 
        provider: null, 
        model: null, 
        tools: [] 
      } 
    })).toThrow();
  });

  it("should throw if defaults tools are not found", () => {
    expect(() => resolveConfig({ 
      ...options, 
      output: {
        provider: null,
        model: null,
        tools: null,
      },
      defaults: { 
        provider: null, 
        model: null, 
        tools: ["nonexistentTool"] 
      } 
    })).toThrow();
  });
});