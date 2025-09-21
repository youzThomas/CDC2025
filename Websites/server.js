import 'dotenv/config';
console.log('[BOOT]', 'MODEL=', process.env.OPENAI_MODEL || 'gpt-4o-mini', 'KEY_LOADED=', !!process.env.OPENAI_API_KEY);
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend (index.html, css, js) from root
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(__dirname)); // serves index.html, styles.css, script.js

// --- Helpers: call your LLM provider (OpenAI-compatible) ---
async function callLLM(messages, { json = false } = {}) {
	const resp = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/json',
			// 'OpenAI-Organization': process.env.OPENAI_ORG ?? undefined, // if your org requires it
		},
		body: JSON.stringify({
			model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // override via .env
			temperature: 0.7,
			messages,
			// response_format: json ? { type: "json_object" } : undefined
		}),
	});

	if (!resp.ok) {
		const errorText = await resp.text();
		console.error('[LLM ERROR]', resp.status, errorText); // <— shows real cause
		throw new Error(`LLM HTTP ${resp.status}: ${errorText}`);
	}

	const data = await resp.json();
	return data?.choices?.[0]?.message?.content || '';
}

app.post('/api/mbti/explain', async (req, res) => {
	try {
		const { scores, type, context } = req.body || {};
		if (!scores || !type) {
			return res.status(400).json({ error: 'missing scores/type' });
		}

		const system = `You write friendly, motivational summaries for a student hackathon.
Be concise, inclusive, and non-diagnostic. Avoid medical or psychological claims.`;

		const user = `
Return a strict JSON object with keys:
{
  "summary": "2-3 sentences",
  "strengths": ["...", "...", "..."],
  "tips": ["...", "...", "..."],
  "roles": ["...", "..."]
}

Context: ${context || 'data hackathon, astronaut theme'}
Scores: EI=${scores.EI}, SN=${scores.SN}, TF=${scores.TF}, JP=${scores.JP}
Type: ${type}

Write content tailored to team collaboration at a hackathon (practical, specific).
Avoid stereotypes and any medical/psych claims.`;

		const content = await callLLM(
			[
				{ role: 'system', content: system },
				{ role: 'user', content: user },
			],
			{ json: true }
		);

		// Try parsing the JSON returned by the model
		let out;
		try {
			out = JSON.parse(content);
		} catch {
			// fallback if parse fails
			out = {
				summary: content.slice(0, 300),
				strengths: ['Collaborative', 'Curious', 'Focused'],
				tips: ['Share thinking early', 'Timebox decisions', 'Pair with complements'],
				roles: ['Project manager', 'Data storyteller'],
			};
		}

		// Sanity check (limit array lengths)
		out.strengths = Array.isArray(out.strengths) ? out.strengths.slice(0, 5) : ['Collaborative', 'Curious', 'Focused'];
		out.tips = Array.isArray(out.tips)
			? out.tips.slice(0, 5)
			: ['Share thinking early', 'Timebox decisions', 'Pair with complements'];
		out.roles = Array.isArray(out.roles) ? out.roles.slice(0, 3) : ['Project manager', 'Data storyteller'];

		// ✅ now return
		return res.json(out);
	} catch (e) {
		console.error('[EXPLAIN ROUTE ERROR]', e.message);
		// fallback so frontend doesn’t break
		return res.status(200).json({
			summary: 'Great job completing the assessment! Here are strengths and tips tailored for hackathon teamwork.',
			strengths: ['Collaborative', 'Curious', 'Outcome-driven'],
			tips: ['Share thinking early', 'Timebox decisions', 'Pair with a complementary teammate'],
			roles: ['Project manager', 'Data storyteller'],
		});
	}
});

// Conversational chat endpoint for Moonbase Copilot
app.post('/api/chat', async (req, res) => {
	try {
		const { messages } = req.body || {};
		if (!Array.isArray(messages) || messages.length === 0) {
			return res.status(400).json({ error: 'messages_required' });
		}
		const sanitized = messages
			.map((m) => ({
				role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
				content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
			}))
			.filter((m) => m.content.trim().length)
			.map((m) => ({ ...m, content: m.content.slice(0, 2000) }));
		if (!sanitized.length) {
			return res.status(400).json({ error: 'messages_empty' });
		}
		const reply = await callLLM(sanitized);
		return res.json({ reply: reply?.trim() || '' });
	} catch (e) {
		console.error('[CHAT ROUTE ERROR]', e.message);
		return res.status(500).json({ error: 'llm_failed' });
	}
});

// (Optional) Route: adaptive next question (not used by default)
app.post('/api/mbti/next-question', async (req, res) => {
	try {
		const { scores } = req.body || {};
		if (!scores) return res.status(400).json({ error: 'missing scores' });

		// Identify weakest axis (smallest |score|)
		const axes = Object.entries(scores).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
		const target = axes[0][0]; // 'EI', 'SN', 'TF', or 'JP'

		const system = `You generate one short, neutral, non-leading assessment question as JSON.
Return: {"axis":"EI|SN|TF|JP","type":"ab|likert","text":"...","a?":"...","b?":"...","weights?":{"1":-2,"2":-1,"3":0,"4":1,"5":2}}.`;

		const user = `Scores so far: EI=${scores.EI}, SN=${scores.SN}, TF=${scores.TF}, JP=${scores.JP}
Target axis: ${target}
Constraints: 1 sentence, simple words, hackathon teamwork context.`;

		const content = await callLLM(
			[
				{ role: 'system', content: system },
				{ role: 'user', content: user },
			],
			{ json: true }
		);

		let q;
		try {
			q = JSON.parse(content);
		} catch {
			q = { axis: target, type: 'ab', text: 'Do you prefer group planning or solo planning?', a: 'Group', b: 'Solo' };
		}
		return res.json(q);
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: 'llm_failed' });
	}
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`✅ Server running on http://localhost:${PORT}`);
});
