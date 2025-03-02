import type { CacheValueMetadata, Message } from 'yapl-js';

export interface HashKey extends CacheValueMetadata {
  messages: Message[];
}

export function hashString(str: string) {
  // This is an MD5-like implementation that works in the browser
  
  // Simple hash function for browsers (based on MurmurHash3)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  
  // Combine h1 and h2 into a 32-character hex string (similar to md5 output)
  const h1Hex = (h1 >>> 0).toString(16).padStart(8, '0');
  const h2Hex = (h2 >>> 0).toString(16).padStart(8, '0');
  
  return h1Hex + h2Hex + h1Hex + h2Hex;
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