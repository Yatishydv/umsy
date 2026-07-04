import readline from 'readline';

/**
 * Prompts the user for input via CLI
 * @param {string} prompt - The prompt message to display
 * @returns {Promise<string>} - User's input
 */
export function getUserInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
