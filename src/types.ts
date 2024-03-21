// MIT License
//
// Copyright (c) 2024 Marcel Joachim Kloubert (https://marcel.coffee)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import crypto from 'node:crypto';

/**
 * An asynchronious iterable blockchain.
 */
export interface IBlockChain extends AsyncIterable<IBlockChainBlock> {
    /**
     * Adds a new block to chain.
     *
     * @param {string} data The data in Base64 format.
     *
     * @returns {Promise<IBlockChainBlock>} The promise with the new block.
     */
    addBlock: (data: string) => Promise<IBlockChainBlock>;
}

/**
 * Describes a block in a blockchain.
 */
export interface IBlockChainBlock {
    /**
     * The data in Base64 format.
     */
    readonly data: string;
    /**
     * The hash of this block in Base64 format.
     */
    readonly hash: string;
    /**
     * The zero based index.
     */
    readonly index: number;
    /**
     * The hash of this block in Base64 format.
     */
    readonly previousHash: string;
    /**
     * The time of creation as UNIX timestamp (UTC).
     */
    readonly timestamp: number;
}


// implementation of `IBlockChain`
class ArrayBlockChain implements IBlockChain {
    readonly #blocks: BlockChainBlock[] = [];
    readonly #genesisBlock: BlockChainBlock;

    constructor() {
        const newGenesisBlock = new BlockChainBlock(
            -1,
            Buffer.alloc(0),
            undefined
        );
        
        this.#genesisBlock = newGenesisBlock;
    }

    [Symbol.asyncIterator](): AsyncIterator<IBlockChainBlock, any, undefined> {
        const copyOfBlocks = [...this.#blocks];
        let cursorIndex = 0;
        
        return {
            next: async () => {
                const currentIndex = cursorIndex++;

                return {
                    done: currentIndex >= copyOfBlocks.length,
                    value: copyOfBlocks[currentIndex]
                };
            }
        };
    }

    public async addBlock(data: string): Promise<BlockChainBlock> {
        const previousBlock = this.#previousBlock;

        const newGenesisBlock = new BlockChainBlock(
            previousBlock.index + 1,
            Buffer.from(data, 'base64'),
            previousBlock
        );

        this.#blocks.push(newGenesisBlock);

        return newGenesisBlock;
    }

    get #previousBlock(): BlockChainBlock {
        return this.#blocks[this.#blocks.length - 1] ?? this.#genesisBlock;
    }
} 

// implementation of `IBlockChainBlock`
class BlockChainBlock implements IBlockChainBlock {
    readonly #data: Buffer;
    readonly #previousBlock: BlockChainBlock | undefined;
    readonly #timestamp: number;

    constructor(
        public index: number,
        data: Buffer,
        previousBlock: BlockChainBlock | undefined,
        now = new Date()
    ) {
        const utcNow = Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
        );

        this.#data = data;
        this.#previousBlock = previousBlock;
        this.#timestamp = utcNow.valueOf();
    }

    get data(): string {
        return this.#data.toString('base64');
    }

    get hash(): string {
        const sha256 = crypto.createHash('sha256');

        return sha256.update(`${this.index}\n${this.previousHash}\n${this.timestamp}\n${this.data}`)
            .digest()
            .toString('base64');
    }

    get previousHash(): string {
        return this.#previousBlock?.hash || '';
    }

    get timestamp(): number {
        return this.#timestamp;
    }
}


/**
 * Creates a new instance of an `IBlockChain`.
 *
 * @returns {Promise<IBlockChain>} The promise with the new instance of a `IBlockChain`.
 */
export async function createNewBlockChain(): Promise<IBlockChain> {
    return new ArrayBlockChain();
}
