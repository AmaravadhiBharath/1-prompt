#!/usr/bin/env node

/**
 * Compare Gemini vs Llama via Deployed Backend
 * This script allows you to see both outputs side-by-side for any conversation.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://1prompt-backend.amaravadhibharath.workers.dev';

// Test Inputs
const testCases = [
    {
        id: "override-test",
        description: "Iterative Override (Blue wins)",
        prompts: "make a cta button\nblack cta button\nmake cta black to blue"
    },
    {
        id: "accumulation-test",
        description: "Accumulation (All survive)",
        prompts: "landing page\nadd hero section\nadd testimonials\nblue theme"
    },
    {
        id: "negation-test",
        description: "Negation + Exception",
        prompts: "no animations\nadd hover animation on button"
    }
];

async function callBackend(prompts, provider = 'auto') {
    try {
        const response = await fetch(`${BACKEND_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: prompts,
                provider: provider, // 'gemini' or 'auto' (which now defaults to Gemini)
                additionalInfo: 'Comparison Test'
            })
        });

        if (!response.ok) return { error: await response.text() };
        return await response.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function runComparison(testCase) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🆔 ID: ${testCase.id}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`${'='.repeat(80)}`);

    console.log(`⏳ Fetching results...`);

    // To test Llama explicitly, we can pass a dummy key or modify backend. 
    // For now, since Gemini is default, we'll try to get both if possible.
    // We'll use a trick: pass 'cloudflare' as provider if we want Llama.

    const [geminiResult, llamaResult] = await Promise.all([
        callBackend(testCase.prompts, 'gemini'),
        callBackend(testCase.prompts, 'cloudflare')
    ]);

    console.log(`\n🤖 GEMINI 1.5 FLASH (Default)`);
    console.log(`─`.repeat(40));
    if (geminiResult.error) {
        console.error(`❌ Error: ${geminiResult.error}`);
    } else {
        console.log(geminiResult.summary);
    }

    console.log(`\n🦙 LLAMA 3.2 (Fallback)`);
    console.log(`─`.repeat(40));
    if (llamaResult.error) {
        console.error(`❌ Error: ${llamaResult.error}`);
    } else {
        console.log(llamaResult.summary);
    }

    console.log(`\n🔍 MONITORING SUMMARY:`);
    if (!geminiResult.error && !llamaResult.error) {
        const gLen = geminiResult.summary.length;
        const lLen = llamaResult.summary.length;
        console.log(`  - Gemini Length: ${gLen} chars`);
        console.log(`  - Llama Length: ${lLen} chars`);

        // Simple heuristic for "Better"
        const hasFlag = geminiResult.summary.includes('[?]');
        if (hasFlag) console.log(`  - ⚠️ Gemini flagged an ambiguity [?]`);

        console.log(`  - Comparison Note: Gemini usually follows the "No Meta" and "Imperative" rules more strictly.`);
    }
}

async function start() {
    console.log(`🚀 Starting Intent Engine Comparison (Gemini vs Llama)`);
    console.log(`Backend: ${BACKEND_URL}`);

    for (const testCase of testCases) {
        await runComparison(testCase);
    }

    console.log(`\n✅ Comparison Complete.`);
}

start();
