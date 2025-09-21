/*********************************************************
 * Simple SPA router (top nav chips) + minimap toggle
 *********************************************************/
const chips = document.querySelectorAll('.chip');
const sections = document.querySelectorAll('section');
const minimap = document.getElementById('minimap');

function show(id) {
	sections.forEach((s) => s.classList.toggle('active', s.id === id));
	chips.forEach((c) => c.classList.toggle('active', c.dataset.target === id));
	history.replaceState(null, '', '#' + id);

	// Show global minimap only on Story
	if (minimap) {
		if (id === 'story') minimap.classList.remove('hidden');
		else minimap.classList.add('hidden');
	}
}
chips.forEach((c) => c.addEventListener('click', () => show(c.dataset.target)));
if (location.hash) {
	const id = location.hash.slice(1);
	if (document.getElementById(id)) show(id);
}

/*********************************************************
 * Optional: generate extra craters procedurally (visual)
 *********************************************************/
(function generateCraters() {
	const moon = document.querySelector('.moon');
	if (!moon) return;
	const N = 40,
		minW = 18,
		maxW = 140;
	for (let i = 0; i < N; i++) {
		const d = document.createElement('div');
		d.className = 'crater';
		const w = Math.round(minW + Math.random() * (maxW - minW));
		const aspect = 0.42 + Math.random() * 0.28,
			h = Math.round(w * aspect);
		d.style.width = w + 'px';
		d.style.height = h + 'px';
		d.style.left = 5 + Math.random() * 90 + '%';
		d.style.bottom = 8 + Math.random() * 28 + '%';
		const g = 125 + Math.round(Math.random() * 25),
			a = 0.6 + Math.random() * 0.3;
		d.style.position = 'absolute';
		d.style.borderRadius = '50%';
		d.style.background = `radial-gradient(closest-side, rgba(${g},${g + 8},${g + 16},${a}) 0 62%, transparent 63%)`;
		d.style.boxShadow = `inset -6px -6px 10px rgba(0,0,0,.12), inset 6px 6px 10px rgba(255,255,255,.06)`;
		moon.appendChild(d);
	}
})();

/*********************************************************
 * MBTI-style Assessment (front-end scoring + LLM explain)
 *********************************************************/
(function () {
	// ----- Elements
	const startBtn = document.getElementById('startAssessment');
	const skipBtn = document.getElementById('skipQuestion');
	const resetBtn = document.getElementById('resetAssessment');
	const logEl = document.getElementById('botLog');
	const choices = document.getElementById('choices');
	const progFill = document.getElementById('progressFill');
	const progText = document.getElementById('progressText');
	const axisHint = document.getElementById('axisHint');

	const resultCard = document.getElementById('resultCard');
	const typeBadge = document.getElementById('typeBadge');
	const scoreList = document.getElementById('scoreList');
	const strengthsUl = document.getElementById('strengthsList');
	const tipsUl = document.getElementById('tipsList');
	const rolesUl = document.getElementById('rolesList');

	if (!startBtn) return; // not on this page

	// ----- Question bank (12 demo; expand to 24–32 for reliability)
	const questions = [
		{
			id: 'E1',
			axis: 'EI',
			type: 'ab',
			text: 'At a hackathon kickoff, you prefer to…',
			a: { label: 'Meet everyone & whiteboard', score: { EI: +1 } },
			b: { label: 'Read docs quietly first', score: { EI: -1 } },
		},
		{
			id: 'S1',
			axis: 'SN',
			type: 'likert',
			target_pole: 'S',
			text: 'I trust tested methods over novel ideas.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
		{
			id: 'T1',
			axis: 'TF',
			type: 'ab',
			text: 'When teammates disagree, you lean toward…',
			a: { label: 'Objective criteria & tradeoffs', score: { TF: +1 } },
			b: { label: 'Perspectives & team harmony', score: { TF: -1 } },
		},
		{
			id: 'J1',
			axis: 'JP',
			type: 'likert',
			target_pole: 'J',
			text: 'I like locking a plan early and executing it.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
		{
			id: 'E2',
			axis: 'EI',
			type: 'likert',
			target_pole: 'E',
			text: 'I recharge through group brainstorming.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
		{
			id: 'S2',
			axis: 'SN',
			type: 'ab',
			text: 'Faced with ambiguous data, you…',
			a: { label: 'Gather more concrete examples', score: { SN: +1 } },
			b: { label: 'Sketch patterns & hypotheses', score: { SN: -1 } },
		},
		{
			id: 'T2',
			axis: 'TF',
			type: 'likert',
			target_pole: 'T',
			text: 'I value consistent logic over personal preference.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
		{
			id: 'J2',
			axis: 'JP',
			type: 'ab',
			text: 'Your ideal workflow is…',
			a: { label: 'Kanban with clear milestones', score: { JP: +1 } },
			b: { label: 'Flexible exploration & pivots', score: { JP: -1 } },
		},
		{
			id: 'E3',
			axis: 'EI',
			type: 'ab',
			text: 'During presentations, you…',
			a: { label: 'Enjoy presenting & Q&A', score: { EI: +1 } },
			b: { label: 'Prefer others present', score: { EI: -1 } },
		},
		{
			id: 'S3',
			axis: 'SN',
			type: 'likert',
			target_pole: 'N',
			text: 'I’m energized by imagining future possibilities.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
		{
			id: 'T3',
			axis: 'TF',
			type: 'ab',
			text: 'For model selection, you lean toward…',
			a: { label: 'Metrics & error analysis', score: { TF: +1 } },
			b: { label: 'Use-case fit & user impact', score: { TF: -1 } },
		},
		{
			id: 'J3',
			axis: 'JP',
			type: 'likert',
			target_pole: 'P',
			text: 'I like to keep options open until late.',
			weights: { 1: -2, 2: -1, 3: 0, 4: +1, 5: +2 },
		},
	];

	// ----- State
	let i = -1;
	let finished = false; // <— lock flag to stop after finish
	const scores = { EI: 0, SN: 0, TF: 0, JP: 0 };

	// ----- UI helpers
	function say(t) {
		append(t, 'bot');
	}
	function user(t) {
		append(t, 'me');
	}
	function append(text, cls) {
		const d = document.createElement('div');
		d.className = 'msg ' + cls;
		d.textContent = text;
		logEl.appendChild(d);
		logEl.scrollTop = logEl.scrollHeight;
	}
	function axisLabel(ax) {
		const map = {
			EI: 'Expedition (E) ↔ Inward (I)',
			SN: 'Sensor (S) ↔ Navigator (N)',
			TF: 'Tactician (T) ↔ Fellow (F)',
			JP: 'Journey-planner (J) ↔ Pathfinder (P)',
		};
		return map[ax] || ax;
	}
	function updateProgress() {
		const total = questions.length;
		const idx = Math.max(-1, Math.min(i, total)); // clamp

		const pct = Math.max(0, Math.min(100, ((idx + 1) / total) * 100));
		progFill.style.width = pct.toFixed(0) + '%';

		// If we're between -1 and total-1, show Q x/y; if we've just finished, show Done.
		if (idx >= 0 && idx < total) {
			progText.textContent = `Q ${idx + 1}/${total}`;
			axisHint.textContent = axisLabel(questions[idx].axis);
		} else if (idx >= total) {
			progText.textContent = 'Done';
			axisHint.textContent = '';
		} else {
			// idx === -1 (before start)
			progText.textContent = 'Ready';
			axisHint.textContent = '';
		}
	}

	// Clear and render one question; all handlers guard against finished=true
	function renderQ(q) {
		if (finished) return;
		choices.replaceChildren();
		say(q.text);

		if (q.type === 'ab') {
			['a', 'b'].forEach((k) => {
				const b = document.createElement('button');
				b.className = 'btn';
				b.textContent = q[k].label;
				b.onclick = () => {
					if (finished) return;
					user(b.textContent);
					for (const ax in q[k].score) {
						scores[ax] += q[k].score[ax];
					}
					next();
				};
				choices.appendChild(b);
			});
		} else {
			for (let v = 1; v <= 5; v++) {
				const b = document.createElement('button');
				b.className = 'btn';
				b.textContent = String(v);
				b.title = '1=Strongly disagree … 5=Strongly agree';
				b.onclick = () => {
					if (finished) return;
					user(String(v));
					const w = q.weights[String(v)] || 0;
					scores[q.axis] += w;
					next();
				};
				choices.appendChild(b);
			}
		}
	}

	function pickType() {
		const p = (axis, pos, neg) => (scores[axis] >= 0 ? pos : neg);
		return p('EI', 'E', 'I') + p('SN', 'S', 'N') + p('TF', 'T', 'F') + p('JP', 'J', 'P');
	}

	// ----- Backend call for explanation
	async function llmExplain(scores, type) {
		const res = await fetch('/api/mbti/explain', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				scores,
				type,
				context: 'student hackathon, astronaut data challenge',
			}),
		});
		if (!res.ok) throw new Error('LLM explain failed');
		return res.json(); // { summary, strengths[], tips[], roles[] }
	}

	// ----- Finish (locks UI hard so it cannot continue)
	async function finish() {
		finished = true; // stop any further clicks
		choices.replaceChildren(); // remove lingering buttons
		skipBtn.disabled = true;
		resetBtn.disabled = false;

		const type = pickType();
		say('Great work! Generating your personalized summary…');
		typeBadge.textContent = `Type: ${type}`;
		scoreList.innerHTML = `
      <li>EI: ${scores.EI}</li>
      <li>SN: ${scores.SN}</li>
      <li>TF: ${scores.TF}</li>
      <li>JP: ${scores.JP}</li>
    `;
		try {
			const out = await llmExplain(scores, type);
			strengthsUl.innerHTML = (out.strengths || []).map((s) => `<li>${s}</li>`).join('') || '<li>Collaborative</li>';
			tipsUl.innerHTML = (out.tips || []).map((s) => `<li>${s}</li>`).join('') || '<li>Share thinking early</li>';
			rolesUl.innerHTML = (out.roles || []).map((s) => `<li>${s}</li>`).join('') || '<li>Presenter</li>';
			if (out.summary) say(out.summary);
		} catch (e) {
			console.error(e);
			say('The AI summary is unavailable. Here’s a basic result card from your scores.');
		}
		resultCard.hidden = false;
	}

	// ----- Next question (hard stop at end)
	function next() {
		if (finished) return;
		i++;
		updateProgress();
		if (i >= questions.length) {
			finish();
			return;
		}
		renderQ(questions[i]);
	}

	// ----- Reset everything for a new run
	function reset() {
		i = -1;
		finished = false;
		scores.EI = scores.SN = scores.TF = scores.JP = 0;
		logEl.innerHTML = '';
		choices.replaceChildren();
		resultCard.hidden = true;
		skipBtn.disabled = true;
		resetBtn.disabled = true;
		updateProgress();
	}

	// ----- Controls
	startBtn.addEventListener('click', () => {
		reset();
		say('Welcome to the Moon Personality Bot! This is for learning & fun — not psychological advice.');
		skipBtn.disabled = false;
		next();
	});

	skipBtn.addEventListener('click', () => {
		if (finished) return;
		user('(skip)');
		next();
	});

	resetBtn.addEventListener('click', reset);

	// Init progress
	updateProgress();
})();
