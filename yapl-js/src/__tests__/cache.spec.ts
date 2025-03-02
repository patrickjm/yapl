import { describe, it, expect } from "bun:test";

import { hashString, hashValue, serializeKey, hashKey } from '../cache';
import { z } from 'zod';
import type { Message, Tool } from 'yapl-js';

describe('cache utils', () => {
  describe('hashString', () => {
    it('should return a consistent hash for the same input', () => {
      const input = 'test string';
      expect(hashString(input)).toBe(hashString(input));
    });

    it('should return different hashes for different inputs', () => {
      expect(hashString('test1')).not.toBe(hashString('test2'));
    });
  });

  describe('hashValue', () => {
    it('should return a consistent hash for the same input object', () => {
      const input = { a: 1, b: 'test' };
      expect(hashValue(input)).toBe(hashValue(input));
    });

    it('should return different hashes for different input objects', () => {
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

  describe('hashKey', () => {
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
});
