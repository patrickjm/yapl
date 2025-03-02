# yapl-js

[![NPM Version](https://img.shields.io/npm/v/yapl-js)](https://www.npmjs.com/package/yapl-js)

YAPL is a tool for prompting LLMs with Liquid-templated YAML files.

## JSON Output

- OpenAI has built in support for JSON output, but others do not.
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