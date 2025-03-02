import crypto from 'crypto';
import type { CacheValueMetadata, Message, Model, OutputFormat, Tool } from 'yapl-js';

export interface HashKey extends CacheValueMetadata {
  messages: Message[];
}

export function hashString(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function hashValue(value: any) {
  return hashString(JSON.stringify(value));
}

export function serializeKey(key: HashKey) {
  function serializeMessage(message: Message) {
    const msg: any[] = [
      message.role,
      message.content,
    ];
    if ("toolCalls" in message && message.toolCalls) {
      msg.push(message.toolCalls.map(toolCall => [
        toolCall.function.name,
        toolCall.function.arguments,
      ]));
    }
    return msg;
  }
  return [
    key.provider,
    key.model,
    key.format,
    key.tools.map(tool => [tool.type, tool.function?.name, tool.function?.description, tool.function?.arguments]),
    key.messages.map(serializeMessage),
  ]
}

export function hashKey(hashKey: HashKey) {
  return hashValue(serializeKey(hashKey));
}