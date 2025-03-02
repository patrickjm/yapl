import { DEFAULT_CHAIN_ID, DEFAULT_OUTPUT_ID } from "./constants";
import type { BuiltinInputs } from "./public-types";
import type { Schema, SchemaChains } from "./schema";

export function validateSchema(path: string, schema: Schema, builtinInputs?: BuiltinInputs) {
  let chains: SchemaChains = {};
  if ("chains" in schema) {
    chains = schema.chains;
    validateChainDependencies(
      path,
      Object.fromEntries(Object.entries(schema.chains)
        .map(([name, chain]) => [name, { dependsOn: chain.dependsOn ?? [] }]))
    );
  } else {
    chains = {
      [DEFAULT_CHAIN_ID]: { dependsOn: [], chain: schema }
    }
  }
  
  // validate that output names are all unique per chain
  for (const chain in chains) {
    const outputNames = new Set<string>();
    for (let i = 0; i < chains[chain].chain.messages.length; i++) {
      const instr = chains[chain].chain.messages[i];
      if (typeof instr === 'object' && 'output' in instr && instr.output.id) {
        if (outputNames.has(instr.output.id)) {
          throw new Error(`${path}: Chain "${chain}" has duplicate output name "${instr.output.id}".`);
        }
        if (instr.output.id === DEFAULT_OUTPUT_ID && i !== chains[chain].chain.messages.length - 1) {
          throw new Error(`${path}: Chain "${chain}": the ${DEFAULT_OUTPUT_ID} output must be the last output`);
        }
        outputNames.add(instr.output.id);
      }
    }
  }

  // validate input names are not conflicting with builtins
  for (const i of schema.inputs ?? []) {
    if (Object.keys(builtinInputs ?? []).includes(i)) {
      throw new Error(`${path}: The '${i}' input is reserved for internal use.`);
    }
  }
}

/**
 * Validates the dependencies between chains (i.e. that there are no circular dependencies and all the chains are declared).
 */
function validateChainDependencies(path: string, chains: Record<string, { dependsOn: string[]; }>) {
  const visited = new Set<string>();
  const currentPath: string[] = [];

  function dfs(chain: string): boolean {
    if (currentPath.includes(chain)) {
      return true;
    }

    if (visited.has(chain)) {
      return false;
    }

    currentPath.push(chain);
    visited.add(chain);

    if (!(chain in chains)) {
      const dependentChain = currentPath[currentPath.length - 2]; // Get the previous chain in the path
      throw new Error(`${path}: Chain "${chain}" is not declared but is listed as a dependency of "${dependentChain}".`);
    }

    for (const dependency of chains[chain].dependsOn) {
      if (dfs(dependency)) {
        return true;
      }
    }

    currentPath.pop();

    return false;
  }

  for (const chain in chains) {
    if (dfs(chain)) {
      throw new Error(`${path}: Circular dependency detected involving "${chain}".`);
    }
  }

  return true;
}