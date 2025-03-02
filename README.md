# yapl-js

[![NPM Version](https://img.shields.io/npm/v/yapl-js)](https://www.npmjs.com/package/yapl-js)

YAPL is a tool for prompting LLMs with Liquid-templated YAML files. It's opinionated and tightly coupled with Zod.

```bash
npm install yapl-js
```

Here's an example YAPL file:
```yml
provider: openai
model: gpt-4.5-preview
inputs: # Inputs are passed from JS into the YAPL file
  - content
  - schema
messages:
  - system: |
      You are a proper noun identification system.
  - user: |
      Please perform proper noun identification on the following text. It is very important that you capture ALL proper nouns in the text.
      Please conclude your message with a final list of the proper nouns identified.

      {{ content }}
  - output # LLM call made here! It uses gpt-4.5-preview (above)
  - user: |
      This is an automated opportunity to review your work:
      Did you miss any proper nouns? Do you want to make any additional passes or edits? Think carefully before answering.
      If you feel you have found everything, please continue.
  # LLM call made here! If we wanted to grab this output from js, we can use its id
  - output:
      id: second-pass
  - user: |
      Excellent! Please capture ALL entities that qualify as proper nouns in the provided JSON format.
      Please omit the scores from the JSON and omit any entities that don't qualify as proper nouns.
  # LLM call made below! It overrides the model with gpt-4o-mini and enforces a JSON output format.
  # The last output automatically assigns an id of "default" which is the main output from the program
  - output: 
      model: gpt-4o-mini
      format:
        json: "{{ schema | json-schema }}"
```

Then running it is pretty easy:
```ts
import { Yapl, type YaplLogger, type YaplProgram } from "yapl-js";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

// You can make your own provider if you want
const openaiProvider = new OpenAIProvider(
  "openai",
  "https://api.openai.com/v1",
  process.env.OPENAI_API_KEY!,
)

// Expected result type
const properNounsSchema = z.object({
  properNouns: z.array(z.string()),
});

// Create the YAPL engine
const engine = new Yapl({
  providers: [openrouterProvider, openaiProvider],
  cache,
  logger: _logger
});

// We can register our own liquid filters if we want! 
// You can see this get used in the yapl file above.
// In this case, it lets us pass the actual zod schema to the yapl file, 
// then inline its jsonschema in LLM prompts.
engine.liquid.registerFilter("json-schema", (input: z.ZodTypeAny) => JSON.stringify(zodToJsonSchema(input), null, 2));

// Load the yapl file
const program = engine.loadFile("path/to/yapl/file.yap.yml");

program({
  content: "New York City is a big city in the United States.",
  schema: properNounsSchema,
}).then((result) => {
  console.log(result);
});
```


## JSON Output

- OpenAI provider has built in support for JSON output, but others do not.
- For providers that do not support JSON output, YAPL will still validate the JSON output, but you should also put the JSON schema in the prompt.

## Retries

- In certain cases, YAPL will retry requests up to 3 times before giving up and throwing an error:
  - Tool call arguments failed to parse or failed jsonschema validation
  - Tool call threw an error
  - Chat JSON response type failed to parse / validate

## Future ideas

- Macro instruction type
  - Allow liquid which outputs more messages etc using {%raw %} tags
- Automatically add the JSON schema to the prompt for providers that do not support JSON output.
- Multi-message with inputs which can be called from chains
- Add other params like temperature, top_p, etc.

## VSCode autocompletion for YAML files

1. Ensure you have the 'YAML' extension installed in VSCode.
2. Add the following to your `.vscode/settings.json` file:
```json
{
  "yaml.schemas": {
    "./node_modules/yapl/dist/schema.json": "*.yap.yml"
  }
}
```

## Prior art
- [Prompt Poet](https://github.com/character-ai/prompt-poet)
- [R2R Prompting](https://github.com/SciPhi-AI/R2R/blob/7c5b9a6dda60cd9b183edeeaed078f43b061c646/r2r/base/providers/prompt.py#L27) using [yaml files](https://github.com/SciPhi-AI/R2R/blob/7c5b9a6dda60cd9b183edeeaed078f43b061c646/r2r/providers/prompts/defaults/kg_search_with_spec.yaml)