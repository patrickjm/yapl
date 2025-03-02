import { describe, it, jest, beforeEach, mock, expect } from "bun:test";
import { Provider, Tool, YaplCache } from "../public-types";
import { executeOutput, type ExecuteOutputOptions } from "../execute-output";

mock.module('../utils', () => ({
  resolveConfig: () => ({
    provider: "mockProvider",
    model: "mockModel",
    tools: ["mockTool"],
  }),
  addCost: () => ({
    usd: -1,
    tokens: -1,
    ms: -1
  })
}))

describe("executeOutput", () => {
  let cache: YaplCache;
  let output: ExecuteOutputOptions;
  let mockTool: Tool<any>;
  let mockProvider: Provider;

  beforeEach(() => {
    mock.restore();
    cache = {
      get: jest.fn(),
      set: jest.fn()
    };
    mockTool = {
      type: "function",
      function: {
        name: "mockTool",
        description: "mockToolDescription"
      } as any
    };
    mockProvider = {
      name: "mockProvider",
      execute: jest.fn()
    };
    output = {
      cache,
      messages: [],
      output: {
        model: "mockModel",
        provider: "mockProvider",
        tools: ["mockTool"],
        format: {
          json: { hi: "schema" } as any
        }
      },
      path: "",
      type: "chat",
      tools: [mockTool],
      providers: [mockProvider]
    };
  })

  it("should return cached reply if it exists", async () => {
    (cache.get as jest.Mock).mockReturnValueOnce([{
      role: "assistant",
      content: "mockReply"
    }]);
    const [messages] = await executeOutput(output);
    expect(cache.get).toHaveBeenCalled();
    expect(messages).toEqual([{
      role: "assistant",
      content: "mockReply"
    }]);
  });
})