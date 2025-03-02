import { Provider, type AssistantMessage, type Cost, type Message, type ProviderExecuteParams, type ToolMessage } from "./public-types";
import OpenAI from "openai";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIProvider extends Provider {
  private openai: OpenAI;
  constructor(
    name: string = "openai",
    private apiKey: string,
    private baseUrl: string = "https://api.openai.com/v1",
  ) {
    super(name)
    this.openai = new OpenAI({
      apiKey,
      baseURL: this.baseUrl,
    })
  }

  async execute(params: ProviderExecuteParams): Promise<[Message[], Cost]> {
    const { model, messages, tools, format } = params;
    const _tools = params.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.function.name,
        arguments: tool.function.arguments,
      },
    }));
    let responseFormat: ChatCompletionCreateParamsBase["response_format"] = undefined;
    if (typeof format?.json === "string") {
      responseFormat = {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: JSON.parse(format.json),
        }
      }
    } else if (typeof format?.json === "boolean") {
      responseFormat = {
        type: "json_object"
      }
    }
    
    const response = await this.openai.chat.completions.create({
      model: model.name,
      ...(model.params ?? {}),
      response_format: responseFormat,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        tool_call_id: (message as ToolMessage).toolCallId,
        tool_calls: (message as AssistantMessage)
          .toolCalls
          ?.map((toolCall) => ({
            type: "function",
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
          })),
        tools: _tools?.length ? _tools : undefined
      }) as ChatCompletionMessageParam),
    });
    return [
      [
        {
          role: response.choices?.[0]?.message?.role ?? "assistant",
          content: response.choices?.[0]?.message?.content ?? "",
          toolCalls: response.choices?.[0]?.message?.tool_calls?.map((toolCall) => ({
            id: toolCall.id,
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
          })),
        }
      ],
      {
        usd: 0,
        ms: 0,
        tokens: 0,
      }
    ]
  }
}