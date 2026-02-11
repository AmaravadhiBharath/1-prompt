import { describe, it, expect } from 'vitest';
import { fastHash } from '../src/utils/hash';

describe('Hash Utilities', () => {
    it('should generate a consistent hash for the same input', () => {
        const input = 'test-string';
        const hash1 = fastHash(input);
        const hash2 = fastHash(input);
        expect(hash1).toBe(hash2);
        expect(hash1).toBeTypeOf('string');
    });

    it('should generate different hashes for different inputs', () => {
        const hash1 = fastHash('string-a');
        const hash2 = fastHash('string-b');
        expect(hash1).not.toBe(hash2);
    });
});
