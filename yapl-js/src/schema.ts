import { z } from "zod";

const model = z.union([
  z.string(),
  z.object({
    name: z.string(),
    params: z.record(z.string(), z.any()).optional(),
  })
])

const messages = z.array(z.union([
  z.object({
    role: z.string().describe("The role of the message: 'user', 'assistant', 'system'."),
    content: z.string().describe("The content of the message."),
  }),
  z.object({
    user: z.string(),
  }),
  z.object({
    assistant: z.string(),
  }),
  z.object({
    system: z.string(),
  }),
  z.literal("output"),
  z.object({
    output: z.object({
      id: z.string().optional(),
      tools: z.array(z.string()).optional(),
      model: model.optional(),
      provider: z.string().optional(),
      format: z.object({
        json: z.union([z.boolean(), z.string()]).optional(),
      }).optional(),
    }),
  }),
  z.literal("clear"),
  z.object({
    clear: z.object({
      system: z.boolean().optional().describe("Whether to clear the system message."),
    }),
  }).describe("Clears the message history and starts a new conversation. However, you can still manually access old messages using ids."),
]));

const common = {
  provider: z.string().optional().describe("The provider to use for the model."),
  model: model.optional().describe("The model to use."),
  inputs: z.array(z.string()).optional().describe("Arbitrary inputs which are transcluded into messages by Liquidjs."),
  outputs: z.record(z.string(), z.string()).optional().describe("Outputs pulled from the chain. Overrides existing named outputs."),
  tools: z.array(z.string()).optional().describe("The tools to use."),
}

const chain = z.object({
  ...common,
  messages,
});

export const schema = z.union([
  chain,
  z.object({
    ...common,
    chains: z.record(
      z.string(),
      z.object({
        dependsOn: z.array(z.string()).optional(),
        chain,
      })
    ),
  })
]);

export type Schema = z.infer<typeof schema>;
export type Chain = z.infer<typeof chain>;
export type SchemaModel = z.infer<typeof model>;
export type SchemaChains = Exclude<Schema, { messages: SchemaMessages }>["chains"];
export type SchemaInputs = Schema["inputs"];
export type SchemaMessages = z.infer<typeof messages>;