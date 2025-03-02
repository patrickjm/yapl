import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import type { Message, Tool } from 'yapl-js';
import { hashKey, hashString, hashValue, serializeKey } from '../cache';

describe('cache utils', () => {
  const mockBrowserEnvironment = () => {
    // Mock window and document to simulate browser environment
    global.window = { document: {} } as any;
  };

  const restoreNodeEnvironment = () => {
    // Clean up window mock
    delete (global as any).window;
  };

  describe('hashString in Node environment', () => {
    beforeEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same input', () => {
      const input = 'test string';
      expect(hashString(input)).toBe(hashString(input));
    });

    it('should return different hashes for different inputs', () => {
      expect(hashString('test1')).not.toBe(hashString('test2'));
    });
  });

  describe('hashString in Browser environment', () => {
    beforeEach(mockBrowserEnvironment);
    afterEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same input in browser environment', () => {
      const input = 'test string';
      expect(hashString(input)).toBe(hashString(input));
    });

    it('should return different hashes for different inputs in browser environment', () => {
      expect(hashString('test1')).not.toBe(hashString('test2'));
    });
  });

  describe('hashValue', () => {
    beforeEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same input object', () => {
      const input = { a: 1, b: 'test' };
      expect(hashValue(input)).toBe(hashValue(input));
    });

    it('should return different hashes for different input objects', () => {
      expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }));
    });
  });

  describe('hashValue in Browser environment', () => {
    beforeEach(mockBrowserEnvironment);
    afterEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same input object in browser environment', () => {
      const input = { a: 1, b: 'test' };
      expect(hashValue(input)).toBe(hashValue(input));
    });

    it('should return different hashes for different input objects in browser environment', () => {
      expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }));
    });
  });

  describe('serializeKey', () => {
    it('should correctly serialize a HashKey object', () => {
      const mockTool: Tool = {
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          arguments: { type: 'object', properties: { arg: { type: 'string' } } },
          execute: async () => 'result'
        }
      };

      const mockMessage: Message = {
        role: 'user',
        content: 'Test message'
      };

      const key = {
        provider: 'testProvider',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [mockMessage]
      };

      const serialized = serializeKey(key);
      expect(serialized).toEqual([
        'testProvider',
        { name: 'testModel' },
        undefined,
        [
          [
            'function',
            'testTool', 
            'A test tool',
            {
              type: 'object',
              properties: {
                arg: { type: 'string' }
              }
            }
          ]
        ],
        [
          [
            'user',
            'Test message'
          ]
        ]
      ] as any);
    });
  });

  describe('hashKey in Node environment', () => {
    beforeEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same HashKey', () => {
      const mockTool: Tool = {
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          arguments: { type: 'object', properties: { arg: { type: 'string' } } },
          execute: async () => 'result'
        }
      };

      const mockMessage: Message = {
        role: 'user',
        content: 'Test message'
      };

      const key = {
        provider: 'testProvider',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [mockMessage]
      };

      expect(hashKey(key)).toBe(hashKey(key));
    });

    it('should return different hashes for different HashKeys', () => {
      const mockTool: Tool = {
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          arguments: { type: 'object', properties: { arg: { type: 'string' } } },
          execute: async () => 'result'
        }
      };

      const key1 = {
        provider: 'testProvider1',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [{ role: 'user', content: 'Test message 1' }]
      };

      const key2 = {
        provider: 'testProvider2',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [{ role: 'user', content: 'Test message 2' }]
      };

      expect(hashKey(key1 as any)).not.toBe(hashKey(key2 as any));
    });
  });

  describe('hashKey in Browser environment', () => {
    beforeEach(mockBrowserEnvironment);
    afterEach(restoreNodeEnvironment);

    it('should return a consistent hash for the same HashKey in browser environment', () => {
      const mockTool: Tool = {
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          arguments: { type: 'object', properties: { arg: { type: 'string' } } },
          execute: async () => 'result'
        }
      };

      const mockMessage: Message = {
        role: 'user',
        content: 'Test message'
      };

      const key = {
        provider: 'testProvider',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [mockMessage]
      };

      expect(hashKey(key)).toBe(hashKey(key));
    });

    it('should return different hashes for different HashKeys in browser environment', () => {
      const mockTool: Tool = {
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          arguments: { type: 'object', properties: { arg: { type: 'string' } } },
          execute: async () => 'result'
        }
      };

      const key1 = {
        provider: 'testProvider1',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [{ role: 'user', content: 'Test message 1' }]
      };

      const key2 = {
        provider: 'testProvider2',
        model: { name: 'testModel' },
        tools: [mockTool],
        messages: [{ role: 'user', content: 'Test message 2' }]
      };

      expect(hashKey(key1 as any)).not.toBe(hashKey(key2 as any));
    });
  });
});
