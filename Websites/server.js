import 'dotenv/config';
console.log('[BOOT]', 'MODEL=', process.env.OPENAI_MODEL || 'gpt-4o-mini', 'KEY_LOADED=', !!process.env.OPENAI_API_KEY);

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(__dirname));

const FIT_PROMPT_JSON = {
	role: 'system',
	content:
		'You are a professional career coach who specializes in data-informed astronaut role recommendations. Based on statistical pivot tables provided below, your job is to suggest the most suitable astronaut career path—Commander, Flight Engineer, Mission Specialist, or Pilot—based on user inputs.\n\nYou will receive the following four inputs from the user:\n1. Gender (Male or Female)\n2. Mission Age (as a number)\n3. Military Status:\n   - If served in the military: provide both military rank and military branch\n   - If not served: specify as \'None\'\n4. Undergraduate Discipline (e.g., engineering, physical_sciences, life_sciences, math, other/unknown)\n\n---\n\nUse the pivot tables below to determine role correlations:\n\n### Pivot Table: Gender vs Mission Role\n```\n| Gender | Commander | Flight Engineer | Mission Specialist | Pilot |\n|--------|-----------|-----------------|--------------------|-------|\n| Female | 2.7%      | 8.2%            | 85.5%              | 3.6%  |\n| Male   | 23.4%     | 5.0%            | 48.8%              | 22.7% |\n```\n\n### Pivot Table: Age Group vs Mission Role\n```\n| Age Group | Commander | Flight Engineer | Mission Specialist | Pilot |\n|-----------|-----------|-----------------|--------------------|-------|\n| 30–39     | 6.9%      | 1.7%            | 65.9%              | 25.4% |\n| 40–49     | 26.9%     | 5.1%            | 49.1%              | 18.9% |\n| 50–59     | 27.3%     | 21.2%           | 48.5%              | 3.0%  |\n```\n\n### Pivot Table: Military Rank vs Mission Role\n```\n(Use only if military status is provided)\n| Rank           | Commander | Flight Engineer | Mission Specialist | Pilot |\n|----------------|-----------|-----------------|--------------------|-------|\n| Colonel        | 26.4%     | 4.5%            | 37.8%              | 31.3% |\n| Major General  | 100%      | —               | —                  | —     |\n| Captain        | 36.7%     | 5.4%            | 28.6%              | 29.3% |\n... (and others)\n```\n\n### Pivot Table: Military Branch vs Mission Role\n```\n(Use only if military status is provided)\n| Branch         | Commander | Flight Engineer | Mission Specialist | Pilot |\n|----------------|-----------|-----------------|--------------------|-------|\n| US Navy        | 8.3%      | 12.5%           | 54.2%              | 25.0% |\n| US Air Force   | 15.4%     | 7.7%            | 57.7%              | 19.2% |\n... (and others)\n```\n\n### Pivot Table: Undergraduate Discipline vs Mission Role\n```\n| Discipline        | Commander | Flight Engineer | Mission Specialist | Pilot |\n|------------------|-----------|-----------------|--------------------|-------|\n| Engineering       | 24.9%     | 4.2%            | 47.3%              | 23.6% |\n| Math              | 22.5%     | 7.5%            | 42.5%              | 27.5% |\n| Life Sciences     | —         | 6.3%            | 93.8%              | —     |\n| Physical Sciences | 6.8%      | 6.8%            | 82.2%              | 4.2%  |\n| Other/Unknown     | 18.3%     | 8.6%            | 51.6%              | 21.5% |\n```\n\n---\n\n### Your Task:\n\nWhen the user says something like:\n\n"For this user, the gender is Female, mission age is 42, military status is Colonel in US Navy, and undergraduate discipline is engineering."\n\nYou must:\n\n1. Map "mission age" to the appropriate age group from the pivot tables.\n2. Use all four factors to calculate the **most likely astronaut role**.\n3. Write a **formal and encouraging career recommendation** using these statistics (e.g., “Based on the data, your background aligns most strongly with the Mission Specialist track...”).\n4. If any information is missing or not available in the table, use your reasoning to interpolate or infer the best match.\n5. Respond in a professional, data-driven tone—as a career advisor would.\n\nDo not list probabilities directly—synthesize them into a readable interpretation.\n\nWait for the user input before generating a response.',
};

const TYPE_PROMPT_TEXT = `Here is a list of 20 questions designed to assess an individual's inclinations across the four astronaut traits we have discussed. If the user showed inclination toward one trait in at least 3 of the 5 questions, the user is classified as that characteristic. For example, if the user is bold in 3 questions and reserved in 2, the user is classified as a reserved individual. At the end, return the 4-letter type for the user (Ex. BPSL)xq
Bold vs. Reserved
On a mission requiring a spacewalk, would you prefer to stay outside the spacecraft cabin for an extended period to complete a complex task, even if it means exceeding the planned EVA duration?
If a critical repair required an unscheduled and high-risk spacewalk, would you volunteer immediately without waiting for your commander to assign the task?
Would you be more motivated by a mission that is a high-stakes, first-of-its-kind exploration rather than one with established procedures and minimal risk?
In a high-stakes situation, would you be more comfortable making an on-the-spot decision based on your own judgment rather than waiting for detailed instructions from ground control?
Do you find the idea of prolonged isolation in a remote, high-risk environment (such as the far side of the moon or deep space) to be more exciting than daunting?

Pioneer vs. Globalist
A historic, early-stage mission to a new celestial body is being planned. Would you be eager to participate as one of the first human explorers?
A space mission is being organized as a multinational effort, with astronauts from a wide variety of countries. Would you find this to be an exciting prospect?
Would you be more motivated by a mission that continues a legacy of national exploration rather than one focused on international cooperation?
You are offered a mission with a seasoned, experienced crew on a routine resupply mission. Would you prefer this over a new, experimental mission with an international crew of first-time astronauts?
Do you feel that space exploration is a national endeavor, or should it be a joint effort among all countries?

Scholar vs. Common
When faced with a complex scientific anomaly, do you prefer to consult academic papers and scholarly research first?
A new mission requires a difficult technical repair in space. Would you feel more confident if you had a formal degree in engineering?
A problem arises on the space station. Do you prefer to fix it by using a method you read about in a textbook or by improvising with available materials?
Do you believe that formal education is more important than practical experience for an astronaut's success?
Would you feel more comfortable on a mission if your crew members all had advanced degrees, even if they had less hands-on training?

Leader vs. Member
On a long-duration space mission, do you feel more comfortable if you are in charge of a crew or if you are part of the crew?
A complex task requires input from every crew member. Do you prefer to delegate roles and oversee the process or take on a specialized role yourself?
Would you prefer to be the one giving the final 'go' signal for a critical spacewalk or be the one receiving it?
A new crew is being formed. Would you rather have a role where you are directly responsible for the mission's direction or where you support a more experienced astronaut?
A mission is encountering a problem that requires a creative solution. Would you prefer to lead the team's brainstorming session or to contribute ideas from your area of expertise?
`;

async function callLLM(messages, { json = false } = {}) {
	const resp = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
			temperature: 0.7,
			messages,
		}),
	});
	if (!resp.ok) {
		const t = await resp.text();
		console.error('[LLM ERROR]', resp.status, t);
		throw new Error(`LLM HTTP ${resp.status}: ${t}`);
	}
	const data = await resp.json();
	return data?.choices?.[0]?.message?.content || '';
}

app.post('/api/fit/recommend', async (req, res) => {
	try {
		const { gender, mission_age, military_status, discipline } = req.body || {};
		if (!gender || mission_age == null || !discipline) {
			return res.status(400).json({ error: 'missing required inputs' });
		}

		const msgs = [
			FIT_PROMPT_JSON,
			{
				role: 'user',
				content: `User inputs:
- Gender: ${gender}
- Mission Age: ${mission_age}
- Military Status: ${military_status || 'None'}
- Undergraduate Discipline: ${discipline}

Return strict JSON with keys:
{
  "summary": "2-4 sentence recommendation",
  "roles": ["Commander|Flight Engineer|Mission Specialist|Pilot", "...", "..."],
  "why": "1-2 sentence rationale"
}`,
			},
		];

		let out;
		try {
			const raw = await callLLM(msgs, { json: true });
			out = JSON.parse(raw);
		} catch {
			out = {
				summary: 'Based on similar profiles, your background aligns with mission operations and applied science roles.',
				roles: ['Mission Specialist', 'Flight Engineer'],
				why: 'Your inputs suggest strengths in technical contribution and collaboration on board.',
			};
		}
		out.roles = Array.isArray(out.roles) ? out.roles.slice(0, 4) : [];
		return res.json(out);
	} catch (e) {
		console.error('[fit/recommend]', e);
		return res.status(200).json({
			summary: 'Based on your inputs, you fit operations-leaning roles.',
			roles: ['Mission Specialist', 'Flight Engineer'],
			why: 'Education and age bracket point to technical mission work.',
		});
	}
});

app.post('/api/type/questions', async (_req, res) => {
	const system = {
		role: 'system',
		content: `You generate 20 personality-style questions for an astronaut team context.
Pairs: BR (Bold vs Reserved), PG (Pioneer vs Globalist), SC (Scholar vs Common), LM (Leader vs Member).
Return a STRICT JSON array of 20 items:
[{"id":"BR1","pair":"BR","text":"...","reverse":false}, ... ]
Rules:
- Exactly 20 questions: 5 per pair (BR, PG, SC, LM).
- reverse=true only when "Yes" should count for the second trait.
- No extra commentary.`,
	};

	const user = {
		role: 'user',
		content: `Base your questions on this guidance:\n${TYPE_PROMPT_TEXT}`,
	};

	try {
		let questions = [];
		try {
			const raw = await callLLM([system, user], { json: true });
			const arr = JSON.parse(raw);
			if (Array.isArray(arr) && arr.length === 20) questions = arr;
		} catch (e) {
			console.warn('[type/questions] LLM parse failed, using fallback', e.message);
		}

		if (!questions.length) {
			questions = [
				{
					id: 'BR1',
					pair: 'BR',
					text: 'On a mission requiring a spacewalk, would you stay out longer to finish a complex task?',
					reverse: false,
				},
				{
					id: 'BR2',
					pair: 'BR',
					text: 'If a risky unscheduled spacewalk is needed, would you volunteer immediately?',
					reverse: false,
				},
				{
					id: 'BR3',
					pair: 'BR',
					text: 'Are you more motivated by a first-of-its-kind mission than a low-risk procedural one?',
					reverse: false,
				},
				{
					id: 'BR4',
					pair: 'BR',
					text: 'In a high-stakes situation, are you comfortable making on-the-spot decisions?',
					reverse: false,
				},
				{
					id: 'BR5',
					pair: 'BR',
					text: 'Does prolonged isolation in a remote, high-risk environment sound more exciting than daunting?',
					reverse: false,
				},

				{
					id: 'PG1',
					pair: 'PG',
					text: 'Would you be eager to join a historic first mission to a new body?',
					reverse: false,
				},
				{
					id: 'PG2',
					pair: 'PG',
					text: 'A mission is a broad multinational effort. Do you find this exciting?',
					reverse: true,
				},
				{
					id: 'PG3',
					pair: 'PG',
					text: 'More motivated by national legacy than international cooperation?',
					reverse: false,
				},
				{
					id: 'PG4',
					pair: 'PG',
					text: 'Prefer a routine resupply with seasoned crew over experimental international crew?',
					reverse: true,
				},
				{ id: 'PG5', pair: 'PG', text: 'Is space exploration primarily a national endeavor?', reverse: false },

				{
					id: 'SC1',
					pair: 'SC',
					text: 'Facing a complex anomaly, do you consult academic papers first?',
					reverse: false,
				},
				{
					id: 'SC2',
					pair: 'SC',
					text: 'Would a formal engineering degree boost your confidence for difficult repairs?',
					reverse: false,
				},
				{ id: 'SC3', pair: 'SC', text: 'Prefer textbook methods over improvisation for fixes?', reverse: false },
				{
					id: 'SC4',
					pair: 'SC',
					text: 'Is formal education more important than practical experience for astronaut success?',
					reverse: false,
				},
				{
					id: 'SC5',
					pair: 'SC',
					text: 'Prefer crewmates with advanced degrees even if less hands-on?',
					reverse: false,
				},

				{
					id: 'LM1',
					pair: 'LM',
					text: 'On a long mission, do you feel more comfortable being in charge?',
					reverse: false,
				},
				{
					id: 'LM2',
					pair: 'LM',
					text: 'When tasks need everyone, do you prefer to delegate and oversee?',
					reverse: false,
				},
				{
					id: 'LM3',
					pair: 'LM',
					text: 'Would you prefer to give the final “go” for a critical spacewalk?',
					reverse: false,
				},
				{
					id: 'LM4',
					pair: 'LM',
					text: 'Would you rather be directly responsible for mission direction?',
					reverse: false,
				},
				{
					id: 'LM5',
					pair: 'LM',
					text: 'When problems arise, do you prefer to lead the brainstorming?',
					reverse: false,
				},
			];
		}

		return res.json({ questions });
	} catch (e) {
		console.error('[type/questions]', e);
		return res.status(500).json({ error: 'questions_failed' });
	}
});

app.post('/api/type/score', async (req, res) => {
	try {
		const { answers, profile } = req.body || {};
		// answers: [{id, pair:'BR'|'PG'|'SC'|'LM', yes:true|false|null}]
		if (!Array.isArray(answers) || answers.length === 0) {
			return res.status(400).json({ error: 'missing answers' });
		}

		// Tally: first >=3 wins the letter on each pair
		const tally = {
			BR: { first: 0, second: 0 },
			PG: { first: 0, second: 0 },
			SC: { first: 0, second: 0 },
			LM: { first: 0, second: 0 },
		};
		for (const a of answers) {
			if (a.yes == null) continue;
			const rev = !!a.reverse;
			if (a.pair && tally[a.pair]) {
				if (a.yes && !rev) tally[a.pair].first++;
				else if (a.yes && rev) tally[a.pair].second++;
				else if (!a.yes && !rev) tally[a.pair].second++;
				else tally[a.pair].first++;
			}
		}
		const pick = (pair, A, B) => (tally[pair].first >= 3 ? A : B);
		const typeCode = pick('BR', 'B', 'R') + pick('PG', 'P', 'G') + pick('SC', 'S', 'C') + pick('LM', 'L', 'M');

		// Ask LLM for a short summary using Prompt 2 context (optional)
		let out;
		try {
			const raw = await callLLM(
				[
					{ role: 'system', content: 'You write supportive, non-diagnostic summaries for a student hackathon.' },
					{
						role: 'user',
						content: `${TYPE_PROMPT_TEXT}

User profile (optional):
Name: ${profile?.name || 'N/A'}
Background: ${profile?.background || 'N/A'}
Skills: ${profile?.skills || 'N/A'}
Interests: ${profile?.interests || 'N/A'}

Trait tallies (first vs second):
BR: ${tally.BR.first} vs ${tally.BR.second}
PG: ${tally.PG.first} vs ${tally.PG.second}
SC: ${tally.SC.first} vs ${tally.SC.second}
LM: ${tally.LM.first} vs ${tally.LM.second}

Type: ${typeCode}

Return strict JSON:
{
  "summary": "2-3 sentences with the type in the first sentence",
  "strengths": ["...","...","..."],
  "tips": ["...","...","..."]
}`,
					},
				],
				{ json: true }
			);
			out = JSON.parse(raw);
		} catch {
			out = {
				summary: `You resemble the ${typeCode} pattern — practical tips follow.`,
				strengths: ['Curiosity', 'Structure', 'Momentum'],
				tips: ['Timebox exploration', 'Share decisions early'],
			};
		}
		out.strengths = Array.isArray(out.strengths) ? out.strengths.slice(0, 5) : [];
		out.tips = Array.isArray(out.tips) ? out.tips.slice(0, 5) : [];

		return res.json({ type: typeCode, tally, ...out });
	} catch (e) {
		console.error('[type/score]', e);
		return res.status(200).json({
			type: 'BPSL',
			summary: 'You resemble an Explorer profile—curious and action-oriented.',
			strengths: ['Curiosity', 'Resilience'],
			tips: ['Timebox exploration', 'Sync early with teammates'],
		});
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`✅ Server running on http://localhost:${PORT}`);
});
