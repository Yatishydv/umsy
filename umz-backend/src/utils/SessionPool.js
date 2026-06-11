/**
 * SessionPool - Manages Playwright sessions with a maximum concurrency limit
 * 
 * Features:
 * - Maximum 20 active Playwright sessions at any time
 * - FIFO queue for excess requests
 * - Automatic slot acquisition and release
 * - Comprehensive logging
 */
class SessionPool {
    constructor(maxActive = 20) {
        this.maxActive = maxActive;
        this.activeCount = 0;
        this.queue = []; // Array of {resolve, reject} objects

        console.log(`🎫 SessionPool initialized with max ${maxActive} concurrent sessions`);
    }

    /**
     * Acquire a slot from the pool
     * Returns a promise that resolves when a slot is available
     */
    async acquire() {
        if (this.activeCount < this.maxActive) {
            // Slot available immediately
            this.activeCount++;
            console.log(`✅ Slot acquired | Active: ${this.activeCount}/${this.maxActive} | Queued: ${this.queue.length}`);
            return Promise.resolve();
        }

        // Pool is full, queue the request
        console.log(`⏳ Pool full, queueing request | Active: ${this.activeCount}/${this.maxActive} | Queued: ${this.queue.length + 1}`);

        return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject });
        });
    }

    /**
     * Release a slot back to the pool
     * Processes the next queued request if any
     */
    release() {
        this.activeCount--;

        if (this.queue.length > 0) {
            // Dequeue the next waiting request (FIFO)
            const { resolve } = this.queue.shift();
            this.activeCount++;
            console.log(`🔄 Slot released and reassigned | Active: ${this.activeCount}/${this.maxActive} | Queued: ${this.queue.length}`);
            resolve();
        } else {
            console.log(`🔓 Slot released | Active: ${this.activeCount}/${this.maxActive} | Queued: 0`);
        }
    }

    /**
     * Execute a function with automatic slot management
     * @param {Function} fn - Async function to execute
     * @returns {Promise} Result of the function
     */
    async run(fn) {
        await this.acquire();

        try {
            const result = await fn();
            return result;
        } finally {
            // Always release the slot, even on error
            this.release();
        }
    }

    /**
     * Get current pool status
     */
    getStatus() {
        return {
            active: this.activeCount,
            maxActive: this.maxActive,
            queued: this.queue.length,
            available: this.maxActive - this.activeCount
        };
    }
}

export default SessionPool;
