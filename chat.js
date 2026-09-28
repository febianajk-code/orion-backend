export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'Messages are required' });
        }

        const lastMessage = messages[messages.length - 1].content;

        // 1. Melakukan pencarian real-time via Tavily API
        const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: "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",
                query: lastMessage,
                search_depth: "basic",
                max_results: 3
            })
        });

        const tavilyData = await tavilyRes.json();
        let searchContext = "";
        
        if (tavilyData && tavilyData.results) {
            searchContext = tavilyData.results.map(r => `Sumber URL: ${r.url}\nKonten: ${r.content}`).join("\n\n");
        }

        // 2. Menyusun system prompt dengan menyertakan hasil pencarian internet
        const systemPrompt = `Kamu adalah Orion AI, asisten pintar yang dilengkapi kemampuan pencarian internet secara langsung.
Berikut adalah informasi hasil pencarian web terbaru untuk membantu menjawab pertanyaan pengguna:
${searchContext}

Aturan Utama:
1. Gunakan informasi dari hasil pencarian web di atas agar jawaban selalu akurat dan up-to-date.
2. Berikan jawaban yang informatif, jelas, dan lengkap dengan penjelasan pendukung. Jangan menjawab terlalu singkat.
3. Jangan mengarang fakta jika tidak ada datanya.`;

        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // 3. Mengirim data ke OpenRouter untuk diproses AI
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer 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`,
                'HTTP-Referer': 'https://orion-ai.vercel.app',
                'X-Title': 'Orion AI',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "openrouter/free",
                max_tokens: 800,
                messages: apiMessages
            })
        });

        const data = await openRouterRes.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
