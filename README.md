# yapl-js

[![NPM Version](https://img.shields.io/npm/v/yapl-js)](https://www.npmjs.com/package/yapl-js)

YAPL (YAML Prompting Language) is like a declarative, simpler version of LangChain. You can write YAML files that chain together LLM calls and enforce structured outputs. You can even pass inputs to it and use the Liquid templating engine to dynamically generate prompts!

## Installation

```bash
npm install yapl-js
```

## Key Features

YAPL makes it super easy to work with AI models. Here's what you can do with it:

- Write your AI prompts in simple YAML files that are easy to read and modify
- Use templates to make your prompts dynamic and reusable
- Work with different AI providers like OpenAI and OpenRouter without changing your code
- Make sure your inputs and outputs are exactly what you expect using Zod
- Chain multiple AI calls together in a workflow
- Get structured JSON responses that you can easily work with
- Add custom tools that the AI can use to help solve problems
- Save money by caching responses you've already gotten
- Debug what's happening with detailed logs

## Quick Start

Here's a simple example of using YAPL to extract proper nouns from text. It receives a Zod schema as an input to force the LLM to output a JSON object:

```yml
provider: openai
model: gpt-4o
inputs:
  - content
  - schema
messages:
  - system: |
      You are a proper noun identification system.
  - user: |
      Please identify all proper nouns in the following text:
      
      {{ content }}
  - output
  - user: |
      Please review your work and make sure you've found all proper nouns.
  - output:
      id: reviewed-response
  - user: |
      Great! Now format your answer as a JSON list of proper nouns.
  - output: 
      format:
        json: "{{ schema | json-schema }}"
```

And here's how to use it in your JavaScript/TypeScript code:

```typescript
import { Yapl } from "yapl-js";
import { OpenAIProvider } from "yapl-js/dist/providers/openai";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

// Define your expected output schema
const properNounsSchema = z.object({
  properNouns: z.array(z.string()),
});

// Set up your provider
const openaiProvider = new OpenAIProvider(
  "openai",
  process.env.OPENAI_API_KEY!
);

// Create the YAPL engine
const engine = new Yapl({
  providers: [openaiProvider],
});

// Register a custom filter to convert Zod schemas to JSON Schema
engine.liquid.registerFilter("json-schema", (input: z.ZodTypeAny) => 
  JSON.stringify(zodToJsonSchema(input), null, 2)
);

// Load the YAPL file
const program = engine.loadFile("path/to/proper-nouns.yapl.yml");

// Execute the program with inputs
const result = await program({
  content: "New York City is a big city in the United States.",
  schema: properNounsSchema,
});

console.log(result.value);
// Output: { properNouns: ["New York City", "United States"] }
```

## YAPL File Format

### Basic Structure

A YAPL file consists of a few key components:

```yml
provider: openai               # LLM provider to use
model: gpt-4o                  # Default model for all LLM calls
inputs:                         # Input parameters expected from code
  - param1
  - param2
messages:                       # Chain of messages for the conversation
  - system: "System message"    # System message
  - user: "User message"        # User message
  - output                      # LLM call/response
  - user: "Follow-up question"  # Another user message
  - output                      # Another LLM call/response
```

### Message Types

YAPL supports several message types:

- **System Messages**: Set the context and behavior for the LLM
  ```yml
  - system: |
      You are a helpful assistant specialized in biology.
  ```

- **User Messages**: Represent user inputs to the LLM
  ```yml
  - user: |
      What is DNA? Please keep your answer under {{ max_length }} words.
  ```

- **Assistant Messages**: Pre-defined assistant responses (rarely used, as you typically want the LLM to generate these)
  ```yml
  - assistant: |
      DNA stands for deoxyribonucleic acid.
  ```

- **Clear Messages**: Reset the conversation context
  ```yml
  - clear
  # Or to preserve system messages:
  - clear:
      system: false
  ```

### Output Messages

Output messages are where the LLM is actually called. They can be configured in several ways:

```yml
# Simple output (uses default model/provider)
- output

# Output with configuration
- output:
    id: my-output-id        # ID to reference this output later
    model: gpt-4-turbo      # Override the model for this specific call
    provider: openai        # Override the provider
    tools:                  # Tools to make available for this call
      - calculator
      - weather-api
    format:                 # Output format constraints
      json: true            # Request JSON output
```

### Formatting JSON Output

YAPL can enforce JSON formatting for outputs:

```yml
- output:
    format:
      json: true  # Simple JSON object format

# Or with a specific schema:
- output:
    format:
      json: |
        {
          "type": "object",
          "properties": {
            "sentiment": {
              "type": "string",
              "enum": ["positive", "neutral", "negative"]
            },
            "score": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          },
          "required": ["sentiment", "score"]
        }
```

When using TypeScript, you can pass a Zod schema and convert it to JSON Schema:

```yml
- output:
    format:
      json: "{{ schema | json-schema }}"
```

### Chaining Multiple LLM Calls

YAPL supports complex chains with dependencies between calls:

```yml
provider: openai
model: gpt-4o
chains:
  extract:
    chain:
      messages:
        - user: |
            Extract key facts from this text:
            {{ text }}
        - output:
            id: facts
            format:
              json: true
  
  summarize:
    dependsOn: [extract]  # This chain depends on 'extract' completing first
    chain:
      messages:
        - user: |
            Summarize these facts in 3 sentences:
            {{ chains.extract.outputs.facts.value | json }}
        - output
```

### Tool Usage

YAPL supports LLM function calling with tools:

```yml
provider: openai
model: gpt-4o
tools: [calculator]
messages:
  - system: |
      You are a math assistant.
  - user: |
      What is 1337 × 42?
  - output:
      tools:
        - calculator  # Reference to a tool registered in code
```

## API Reference

### Yapl Class

The main entry point for using YAPL:

```typescript
interface YaplOptions {
  providers: Provider[];          // Array of LLM providers
  tools?: Tool<any>[];            // Optional array of tools
  cache?: YaplCache;              // Optional cache implementation
  logger?: YaplLogger;            // Optional logger interface
  defaults?: {                   
    provider?: string;            // Default provider name
    model?: Model;                // Default model configuration
    tools?: string[];             // Default tools to enable
  };
}

class Yapl {
  // Constructor
  constructor(options: YaplOptions);
  
  // Properties
  readonly liquid: Liquid;        // Access to the Liquid template engine
  readonly cost: Cost;            // Aggregated cost information
  
  // Methods
  loadFile(filePath: string): YaplProgram;
  loadString(yamlContent: string): YaplProgram;
  addCost(cost: Cost): void;
}

// YaplProgram is a function that executes the YAPL file
type YaplProgram = (inputs?: Record<string, any>) => Promise<CallResult>;

// CallResult contains the output of the execution
interface CallResult {
  messages: Message[] | null;     // All messages in the conversation
  output: Record<string, any> | null;  // Default output
  content: string | null;         // Default output content
  value: any;                     // Default output parsed value (for JSON outputs)
  chains: Record<string, ChainResult>;  // All chain results
}
```

### Provider Interface

YAPL uses an abstract Provider class to interact with different LLM APIs:

```typescript
abstract class Provider {
  readonly name: string;
  
  constructor(name: string);
  
  abstract execute(params: ProviderExecuteParams): Promise<[Message[], Cost]>;
}

interface ProviderExecuteParams {
  type: "chat";
  model: Model;
  messages: Message[];
  tools: Tool<any>[];
  format?: OutputFormat;
}
```

### Custom Providers

You can implement custom providers by extending the Provider class:

```typescript
class MyCustomProvider extends Provider {
  constructor() {
    super("my-provider");
  }
  
  async execute(params: ProviderExecuteParams): Promise<[Message[], Cost]> {
    // Implement your provider logic here
    // Call your API, format the result, etc.
    
    return [messages, cost];
  }
}
```

### Caching

YAPL supports optional caching of LLM responses:

```typescript
interface CacheValueMetadata {
  provider: string;
  model: Model;
  tools: Tool<any>[];
  format?: OutputFormat;
}

interface YaplCache {
  set(key: string, value: Message[], metadata: CacheValueMetadata): Promise<void>;
  get(key: string): Promise<Message[] | undefined>;
}
```

Example implementation with a simple in-memory cache:

```typescript
class InMemoryCache implements YaplCache {
  private cache = new Map<string, {value: Message[], metadata: CacheValueMetadata}>();
  
  async set(key: string, value: Message[], metadata: CacheValueMetadata) {
    this.cache.set(key, {value, metadata});
  }
  
  async get(key: string) {
    return this.cache.get(key)?.value;
  }
}
```

### Logging

YAPL provides a flexible logging interface:

```typescript
interface YaplLogger {
  error: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
  info: (message: string, meta?: Record<string, any>) => void;
  verbose: (message: string, meta?: Record<string, any>) => void;
}
```

### Liquid Templating

YAPL uses LiquidJS for templating. You can register custom filters:

```typescript
const engine = new Yapl({
  providers: [openaiProvider]
});

// Register a custom filter
engine.liquid.registerFilter("uppercase", (input: string) => input.toUpperCase());

// Use it in your YAPL file
// {{ content | uppercase }}
```

## Advanced Usage

### Using Multiple Providers

YAPL supports using multiple providers in the same application:

```typescript
const yapl = new Yapl({
  providers: [
    new OpenAIProvider("openai", process.env.OPENAI_API_KEY!),
    new OpenRouterProvider("openrouter", process.env.OPENROUTER_API_KEY!)
  ],
  defaults: {
    provider: "openai",
    model: "gpt-4o"
  }
});
```

Then in your YAPL file:

```yml
provider: openrouter  # Override the default provider
model: claude-3-opus-20240229
messages:
  - system: |
      You are Claude, an AI assistant by Anthropic.
  - user: |
      Tell me about yourself.
  - output:
      provider: openai  # Override the provider *again*
      model: gpt-4o
```

### Custom Tools

You can define and use custom tools with YAPL:

```typescript
import { Tool } from "yapl-js";
import { z } from "zod";

// Define a calculator tool
const calculatorTool: Tool = {
  type: "function",
  function: {
    name: "calculator",
    description: "Calculate a mathematical expression",
    arguments: {
      type: "object",
      properties: {
        expression: { type: "string" }
      },
      required: ["expression"]
    },
    execute: async (args: { expression: string }) => {
      try {
        // Just an example, eval is not safe!
        return String(eval(args.expression));
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }
  }
};

// Create the YAPL engine with the tool
const yapl = new Yapl({
  providers: [openaiProvider],
  tools: [calculatorTool]
});
```

### Managing Dependencies

In complex chains, you can manage dependencies between different chains:

```yml
chains:
  data:
    chain:
      messages:
        - user: |
            Extract data from this text: {{ text }}
        - output:
            format:
              json: true
  
  analysis:
    dependsOn: [data]
    chain:
      messages:
        - user: |
            Analyze this data: {{ chains.data.outputs.default.value | json }}
        - output
  
  summary:
    dependsOn: [data, analysis]
    chain:
      messages:
        - user: |
            Summarize this:
            Data: {{ chains.data.outputs.default.value | json }}
            Analysis: {{ chains.analysis.outputs.default.content }}
        - output
```

### Error Handling

YAPL includes built-in error handling for common issues:

- Circular dependencies between chains
- Unknown chain references
- Unknown providers
- Duplicate output IDs
- Reserved input names
- JSON parsing errors in outputs

## Integration Examples

### Express API Integration

```typescript
import express from 'express';
import { Yapl } from 'yapl-js';
import { OpenAIProvider } from 'yapl-js/dist/providers/openai';
import { z } from 'zod';

const app = express();
app.use(express.json());

const yapl = new Yapl({
  providers: [new OpenAIProvider('openai', process.env.OPENAI_API_KEY!)]
});

// Load a YAPL file for sentiment analysis
const sentimentAnalyzer = yapl.loadFile('./sentiment.yapl.yml');

app.post('/analyze', async (req, res) => {
  try {
    const result = await sentimentAnalyzer({
      text: req.body.text,
      schema: z.object({
        sentiment: z.enum(['positive', 'neutral', 'negative']),
        score: z.number().min(0).max(1)
      })
    });
    
    res.json(result.value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Node.js CLI Tool

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { Yapl } from 'yapl-js';
import { OpenAIProvider } from 'yapl-js/dist/providers/openai';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('yapl-cli')
  .description('Run YAPL prompts from the command line')
  .version('1.0.0');

program
  .command('run <yapl-file>')
  .description('Run a YAPL file')
  .option('-i, --input <json>', 'Input JSON')
  .option('-o, --output <file>', 'Output file')
  .action(async (yaplFile, options) => {
    const yapl = new Yapl({
      providers: [new OpenAIProvider('openai', process.env.OPENAI_API_KEY!)]
    });
    
    const inputs = options.input ? JSON.parse(fs.readFileSync(options.input, 'utf8')) : {};
    const promptProgram = yapl.loadFile(path.resolve(yaplFile));
    
    try {
      const result = await promptProgram(inputs);
      
      const output = {
        result: result.value,
        cost: yapl.cost
      };
      
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
        console.log(`Output written to ${options.output}`);
      } else {
        console.log(JSON.stringify(output, null, 2));
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

## Development

To contribute to YAPL:

1. Clone the repository
2. Install dependencies with `bun install`
3. Build the project with `bun run build`
4. Run tests with `bun test`

## VSCode Integration

YAPL includes JSON Schema support for VSCode autocompletion:

1. Ensure you have the 'YAML' extension installed in VSCode.
2. Add the following to your `.vscode/settings.json` file:
```json
{
  "yaml.schemas": {
    "./node_modules/yapl-js/dist/schema.json": "*.yap.yml"
  }
}
```

## Prior Art
- [Prompt Poet](https://github.com/character-ai/prompt-poet)
- [R2R Prompting](https://github.com/SciPhi-AI/R2R/blob/7c5b9a6dda60cd9b183edeeaed078f43b061c646/r2r/base/providers/prompt.py#L27) using [yaml files](https://github.com/SciPhi-AI/R2R/blob/7c5b9a6dda60cd9b183edeeaed078f43b061c646/r2r/providers/prompts/defaults/kg_search_with_spec.yaml)