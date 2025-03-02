import type { Message, Model } from "./public-types";


export type Maybe<T> = T | null | undefined;

export interface PushMessageInstruction {
  type: "push";
  message: Message;
}

export interface ClearInstruction {
  type: "clear";
  /** Whether to clear the system message. */
  system?: boolean;
}
/** Intermediate type for the output reply message */

export interface OutputInstruction {
  type: "output";
  id?: string;
  model?: Model;
  provider?: string;
  tools?: string[];
  format?: {
    json?: boolean | string;
  };
}

export type Instruction = ClearInstruction | PushMessageInstruction | OutputInstruction;
/** The shape of an output within liquidjs templating, i.e. {{ output.my-output }} */

export type ContextOutput = Message & { value?: any; };
/** The shape all outputs within liquidjs templating, i.e. {{ output.my-output }} */
export type ContextOutputs = Record<string, ContextOutput>;
