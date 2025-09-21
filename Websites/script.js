const chips = document.querySelectorAll('.chip');
const sections = document.querySelectorAll('section');
const minimap = document.getElementById('minimap');
const earthEl = document.querySelector('.earth');

function show(id) {
	sections.forEach((s) => s.classList.toggle('active', s.id === id));
	chips.forEach((c) => c.classList.toggle('active', c.dataset.target === id));
	history.replaceState(null, '', '#' + id);

	// Show global minimap only on Story
	if (minimap) {
		if (id === 'story') minimap.classList.remove('hidden');
		else minimap.classList.add('hidden');
	}

	if (earthEl) {
		earthEl.classList.toggle('hidden', id !== 'home');
	}
}
chips.forEach((c) => c.addEventListener('click', () => show(c.dataset.target)));
if (location.hash) {
	const id = location.hash.slice(1);
	if (document.getElementById(id)) show(id);
}

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

(function () {
	// DOM
	const p2Start = document.getElementById('p2Start');
	const p2Skip = document.getElementById('p2Skip');
	const p2Reset = document.getElementById('p2Reset');
	const p2Log = document.getElementById('p2Log');
	const p2Choices = document.getElementById('p2Choices');
	const p2Fill = document.getElementById('p2Fill');
	const p2Text = document.getElementById('p2Text');
	const p2Axis = document.getElementById('p2Axis');

	// 4 inputs (Prompt 1)
	const fitGender = document.getElementById('fitGender');
	const fitAge = document.getElementById('fitAge');
	const fitMilitary = document.getElementById('fitMilitary');
	const fitDiscipline = document.getElementById('fitDiscipline');

	// optional profile (for flavor text)
	const uName = document.getElementById('uName');
	const uBackground = document.getElementById('uBackground');
	const uSkills = document.getElementById('uSkills');
	const uInterests = document.getElementById('uInterests');

	// Result cards
	const fitCard = document.getElementById('fitCard');
	const fitSummary = document.getElementById('fitSummary');
	const fitRoles = document.getElementById('fitRoles');
	const fitWhy = document.getElementById('fitWhy');

	const typeCard = document.getElementById('typeCard');
	const typeSummary = document.getElementById('typeSummary');
	const typeStrengths = document.getElementById('typeStrengths');
	const typeTips = document.getElementById('typeTips');

	if (!p2Start) return;

	// State
	const MAX_Q = 20;
	let QUESTIONS = [];
	let idx = -1;
	let finished = false;
	const answers = []; // [{id,pair,yes,reverse}]
	const profile = () => ({
		name: (uName?.value || '').trim(),
		background: (uBackground?.value || '').trim(),
		skills: (uSkills?.value || '').trim(),
		interests: (uInterests?.value || '').trim(),
	});

	function appendMessage(text, role = 'bot') {
		const wrap = document.createElement('div');
		wrap.className = 'msg ' + role;

		const bubble = document.createElement('div');
		bubble.className = 'bubble';
		bubble.textContent = text;

		wrap.appendChild(bubble);
		p2Log.appendChild(wrap);

		// auto-scroll to bottom
		p2Log.scrollTop = p2Log.scrollHeight;
	}
	const say = (t) => {
		const d = document.createElement('div');
		d.className = 'msg bot';

		// avatar
		const avatar = document.createElement('div');
		avatar.className = 'avatar';
		avatar.innerHTML = '<img src="pictures/robot.jpg" alt="Bot" />';

		// bubble
		const bubble = document.createElement('div');
		bubble.className = 'bubble';
		bubble.textContent = t;

		d.appendChild(avatar);
		d.appendChild(bubble);

		p2Log.appendChild(d);
		p2Log.scrollTop = p2Log.scrollHeight;
	};

	const me = (t) => {
		const d = document.createElement('div');
		d.className = 'msg me';

		const bubble = document.createElement('div');
		bubble.className = 'bubble';
		bubble.textContent = t;

		const avatar = document.createElement('div');
		avatar.className = 'avatar';
		avatar.innerHTML = '<img src="pictures/me.jpg" alt="Bot" />';

		d.appendChild(bubble);
		d.appendChild(avatar);

		p2Log.appendChild(d);
		p2Log.scrollTop = p2Log.scrollHeight;
	};

	const axisLabel = (pair) =>
		({ BR: 'Bold vs Reserved', PG: 'Pioneer vs Globalist', SC: 'Scholar vs Common', LM: 'Leader vs Member' }[pair] ||
		pair);
	function updateProgress() {
		const pct = Math.max(0, Math.min(100, ((idx + 1) / MAX_Q) * 100));
		p2Fill.style.width = pct.toFixed(0) + '%';
		if (idx < 0) {
			p2Text.textContent = 'Ready';
			p2Axis.textContent = '';
		} else if (idx < MAX_Q) {
			p2Text.textContent = `Q ${idx + 1}/${MAX_Q}`;
			p2Axis.textContent = axisLabel(QUESTIONS[idx].pair);
		} else {
			p2Text.textContent = 'Done';
			p2Axis.textContent = '';
		}
	}

	function reset() {
		idx = -1;
		finished = false;
		answers.length = 0;
		p2Log.innerHTML = '';
		p2Choices.replaceChildren();
		p2Skip.disabled = true;
		p2Reset.disabled = true;
		fitCard.hidden = true;
		typeCard.hidden = true;
		updateProgress();
	}

	// Step 1: send 4 inputs → recommended roles
	async function getFitRecommendation() {
		const payload = {
			gender: (fitGender.value || '').trim(),
			mission_age: Number(fitAge.value || 0),
			military_status: (fitMilitary.value || '').trim() || 'None',
			discipline: (fitDiscipline.value || '').trim(),
		};
		const res = await fetch('/api/fit/recommend', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error('fit/recommend failed');
		return res.json();
	}

	// Step 2: ask server for 20 questions
	async function getQuestions() {
		const res = await fetch('/api/type/questions', { method: 'POST' });
		if (!res.ok) throw new Error('type/questions failed');
		const data = await res.json();
		return data.questions || [];
	}

	// Step 3: after 20 answers, post to server for scoring
	async function scoreAnswers() {
		const res = await fetch('/api/type/score', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ answers, profile: profile() }),
		});
		if (!res.ok) throw new Error('type/score failed');
		return res.json();
	}

	function renderQ(q) {
		if (finished) return;
		p2Choices.replaceChildren();
		say(q.text);

		const yesBtn = document.createElement('button');
		yesBtn.className = 'btn';
		yesBtn.textContent = 'Yes';
		yesBtn.onclick = () => {
			if (finished) return;
			me('Yes');
			answers.push({ ...q, yes: true });
			next();
		};

		const noBtn = document.createElement('button');
		noBtn.className = 'btn';
		noBtn.textContent = 'No';
		noBtn.onclick = () => {
			if (finished) return;
			me('No');
			answers.push({ ...q, yes: false });
			next();
		};

		const skipBtn = document.createElement('button');
		skipBtn.className = 'btn';
		skipBtn.textContent = 'Not sure';
		skipBtn.onclick = () => {
			if (finished) return;
			me('(skip)');
			answers.push({ ...q, yes: null });
			next();
		};

		p2Choices.append(yesBtn, noBtn, skipBtn);
		p2Skip.disabled = false;
	}

	async function next() {
		if (finished) return;
		idx++;
		updateProgress();
		if (idx >= MAX_Q) {
			return finish();
		}
		renderQ(QUESTIONS[idx]);
	}

	async function finish() {
		finished = true;
		p2Choices.replaceChildren();
		p2Skip.disabled = true;
		p2Reset.disabled = false;

		say('Thanks! Calculating your astronaut type…');
		try {
			const out = await scoreAnswers();
			typeSummary.textContent = `${out.summary} (Type: ${out.type})`;
			typeStrengths.innerHTML = (out.strengths || []).map((s) => `<li>${s}</li>`).join('');
			typeTips.innerHTML = (out.tips || []).map((s) => `<li>${s}</li>`).join('');
			typeCard.hidden = false;
		} catch (e) {
			console.error(e);
			say('⚠️ Could not score your answers. Please try again.');
		}
	}

	// Events
	p2Start.addEventListener('click', async () => {
		reset();
		// A) recommend roles from the 4 inputs
		say('Analyzing your background for role recommendations…');
		try {
			const fit = await getFitRecommendation();
			fitSummary.textContent = fit.summary || '—';
			fitWhy.textContent = fit.why || '';
			fitRoles.innerHTML = (fit.roles || []).map((r) => `<li>${r}</li>`).join('') || '<li>—</li>';
			fitCard.hidden = false;
		} catch (e) {
			console.error(e);
			say('⚠️ Could not fetch recommended roles.');
		}

		// B) fetch questions
		say('Preparing 20 questions…');
		try {
			QUESTIONS = await getQuestions();
			if (!Array.isArray(QUESTIONS) || QUESTIONS.length !== 20) throw new Error('bad question count');
			say('Answer Yes/No (skip if unsure).');
			p2Reset.disabled = false;
			next();
		} catch (e) {
			console.error(e);
			say('⚠️ Could not load questions. Please try again.');
			finished = true;
		}
	});

	p2Skip.addEventListener('click', () => {
		if (!finished && idx >= 0 && idx < MAX_Q) {
			me('(skip)');
			answers.push({ ...QUESTIONS[idx], yes: null });
			next();
		}
	});

	p2Reset.addEventListener('click', reset);

	updateProgress();
})();

(function () {
	const crewList = document.getElementById('storyCrewList');
	const cardsEl = document.getElementById('storyCards');
	const missionTitleEl = document.getElementById('storyMissionName');
	const missionSummaryEl = document.getElementById('storyMissionSummary');
	const dots = document.querySelectorAll('#minimap .map-dot');
	if (!crewList || !cardsEl || dots.length === 0) return;

	const storyData = {
		'chang-e-4': {
			mission: "Chang'e-4 • Von Kármán Crater",
			summary:
				'On 3 Jan 2019, China soft-landed the Chang’e-4 lander and Yutu-2 rover on the lunar far side, opening a new chapter for science in the South Pole–Aitken basin.',
			crew: [
				{ name: 'Wu Weiren', role: 'Chief Designer', agency: 'CNSA' },
				{ name: 'Sun Zezhou', role: 'Mission Commander', agency: 'CNSA' },
				{ name: 'Yutu-2 Rover Team', role: 'Surface Ops', agency: 'Harbin Institute of Technology' },
			],
			cards: [
				{
					name: 'Chang’e-4 Lander',
					title: 'Far-side Observatory',
					image: 'https://via.placeholder.com/96x96.png?text=C4',
					description:
						'Controls relay communications through Queqiao and deploys instruments probing subsurface structure and radiation.',
					highlight: 'Highlight: Deployed the Lunar Penetrating Radar to map hidden layers below Von Kármán.',
				},
				{
					name: 'Yutu-2 Rover',
					title: 'Mobile Explorer',
					image: 'https://via.placeholder.com/96x96.png?text=Y2',
					description:
						'Traverses the crater floor, investigating rocks and regolith maturity with panoramic cameras and spectrometers.',
					highlight: 'Highlight: Logged the longest-running rover mission on the Moon’s far side.',
				},
				{
					name: 'Mission Control',
					title: 'Relay Coordination',
					image: 'https://via.placeholder.com/96x96.png?text=MC',
					description:
						'Engineers in Beijing choreograph night-day cycles, data downlinks, and health checks via the Queqiao relay satellite.',
					highlight: 'Highlight: Managed the first lunar far-side biological experiment germinating cotton seeds.',
				},
			],
		},
		'apollo-11': {
			mission: 'Apollo 11 • Tranquility Base',
			summary:
				'NASA’s July 1969 landing delivered the first humans to the lunar surface, fulfilling a decade of engineering and flight test breakthroughs.',
			crew: [
				{ name: 'Neil A. Armstrong', role: 'Commander', agency: 'NASA' },
				{ name: 'Edwin “Buzz” Aldrin', role: 'Lunar Module Pilot', agency: 'NASA' },
				{ name: 'Michael Collins', role: 'Command Module Pilot', agency: 'NASA' },
			],
			cards: [
				{
					name: 'Neil Armstrong',
					title: 'Mission Commander',
					image: 'https://via.placeholder.com/96x96.png?text=NA',
					description:
						'Led the descent of Eagle and delivered the historic first steps, deploying cameras and collecting contingency samples.',
					highlight: 'Highlight: “That’s one small step…” broadcast to an estimated 600 million viewers.',
				},
				{
					name: 'Buzz Aldrin',
					title: 'Lunar Module Pilot',
					image: 'https://via.placeholder.com/96x96.png?text=BA',
					description: 'Co-piloted Eagle, deployed the EASEP science package, and captured iconic surface photography.',
					highlight: 'Highlight: Installed the solar wind experiment and U.S. flag at Tranquility Base.',
				},
				{
					name: 'Michael Collins',
					title: 'CSM Pilot',
					image: 'https://via.placeholder.com/96x96.png?text=MC',
					description:
						'Orbited in Columbia, performing platform alignment, system checks, and rendezvous prep while keeping comms flowing.',
					highlight: 'Highlight: Executed precise orbital rendezvous bringing Eagle and Columbia back together.',
				},
			],
		},
		'surveyor-7': {
			mission: 'Surveyor 7 • Tycho Highlands',
			summary:
				'NASA’s final Surveyor lander touched down on 10 Jan 1968 near Tycho, testing landing techniques and probing highland soil chemistry.',
			crew: [
				{ name: 'Surveyor Program Office', role: 'Flight Control', agency: 'NASA JPL' },
				{ name: 'Bendix Engineering Team', role: 'Lander Design', agency: 'Bendix Corp.' },
				{ name: 'Lunar Science Working Group', role: 'Science Leads', agency: 'Multiple Universities' },
			],
			cards: [
				{
					name: 'Surveyor 7 Lander',
					title: 'Robotic Geologist',
					image: 'https://via.placeholder.com/96x96.png?text=S7',
					description:
						'Acquired images, performed scoop operations, and fired alpha-scattering instruments across two lunar days.',
					highlight: 'Highlight: Collected 21,000 TV frames and confirmed viable highland landing zones.',
				},
				{
					name: 'Television Camera',
					title: 'Survey Imager',
					image: 'https://via.placeholder.com/96x96.png?text=TV',
					description:
						'Provided high-resolution panoramas to map slopes, boulder fields, and potential Apollo landing hazards.',
					highlight: 'Highlight: Captured detailed views of Tycho’s ray material for Apollo site planning.',
				},
				{
					name: 'Mission Specialists',
					title: 'Operations Crew',
					image: 'https://via.placeholder.com/96x96.png?text=OPS',
					description:
						'Coordinated nightly command uploads and analyzed telemetry to stretch Surveyor 7 beyond its planned lifetime.',
					highlight: 'Highlight: Achieved 122 hours of science operations before lunar night shutdown.',
				},
			],
		},
	};

	const defaultStory = 'chang-e-4';

	function renderCrew(crew = []) {
		crewList.innerHTML = '';
		if (!crew.length) {
			const empty = document.createElement('li');
			empty.className = 'story-empty';
			empty.textContent = 'No crew data available yet.';
			crewList.appendChild(empty);
			return;
		}
		crew.forEach((person) => {
			const li = document.createElement('li');
			const agencyLabel = person.agency ? ` • ${person.agency}` : '';
			li.innerHTML = `<strong>${person.name}</strong><span>${person.role}${agencyLabel}</span>`;
			crewList.appendChild(li);
		});
	}

	function renderCards(cards = []) {
		cardsEl.innerHTML = '';
		if (!cards.length) {
			const empty = document.createElement('p');
			empty.className = 'story-empty';
			empty.textContent = 'Pick a mission marker to load astronaut highlights.';
			cardsEl.appendChild(empty);
			return;
		}
		cards.forEach((card) => {
			const article = document.createElement('article');
			article.className = 'story-card';
			const header = document.createElement('header');
			header.className = 'story-card-header';
			const meta = document.createElement('div');
			const title = document.createElement('h3');
			title.textContent = card.name;
			const role = document.createElement('p');
			role.className = 'story-role';
			role.textContent = card.title;
			meta.appendChild(title);
			meta.appendChild(role);
			header.appendChild(meta);
			const body = document.createElement('p');
			body.textContent = card.description;
			// Highlight block (improved styling)
			const highlightWrap = document.createElement('div');
			highlightWrap.className = 'story-highlight';
			const hlLabel = document.createElement('span');
			hlLabel.className = 'hl-label';
			hlLabel.textContent = 'Highlight';
			const hlText = document.createElement('span');
			hlText.className = 'hl-text';
			// Remove any leading 'Highlight:' prefix from data to avoid duplication
			const cleaned = (card.highlight || '').replace(/^\s*highlight\s*:\s*/i, '');
			hlText.textContent = cleaned;
			highlightWrap.appendChild(hlLabel);
			highlightWrap.appendChild(hlText);
			article.appendChild(header);
			article.appendChild(body);
			article.appendChild(highlightWrap);
			cardsEl.appendChild(article);
		});
	}

	function renderStory(id) {
		const story = storyData[id] || storyData[defaultStory];
		if (!story) return;
		dots.forEach((dot) => {
			dot.classList.toggle('active', dot.dataset.story === id);
		});
		if (missionTitleEl) missionTitleEl.textContent = story.mission;
		if (missionSummaryEl) missionSummaryEl.textContent = story.summary;
		renderCrew(story.crew);
		renderCards(story.cards);
	}

	dots.forEach((dot) => {
		const id = dot.dataset.story;
		if (!id) return;
		const story = storyData[id];
		if (story) {
			dot.setAttribute('aria-label', story.mission);
			dot.title = `View ${story.mission}`;
		}
		dot.addEventListener('click', () => renderStory(id));
	});

	renderStory(defaultStory);

	(function () {
		const PER_PAGE = 4;

		// ======= YOUR LINKS HERE (url + optional name) =======
		const PRESET_LINKS = [
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet9?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Count of Mission Roles ',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet2?:language=en-US&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Undergraduate Areas',
			},
			{
				url: 'https://public.tableau.com/shared/9BWZX3X7Z?:display_count=n&:origin=viz_share_link',
				name: 'Total Flight Hours by Countries',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet4?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Total Duration vs. Mission Year',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet5?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Which institute do most astronauts come from?',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet7?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Graduate Studies Areas',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet8?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Military Branches',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet11?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Relation Between Average Duration and Number of Total Flights',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet14?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Gender Over Time Across Countries',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet15?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Astronauts per Country Over Time',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet16?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Generation',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet17?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Scholar Status Distribution',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet18?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Undergraduate Major Trend',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet19?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Role Trend',
			},
			{
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet20?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Risk Style Over Time',
			},
		];

		// DOM
		const listEl = document.getElementById('tbList');
		const prevBtn = document.getElementById('tbPrev');
		const nextBtn = document.getElementById('tbNext');
		const metaEl = document.getElementById('tbMeta');
		if (!listEl) return; // not on this page

		// State: normalize into objects { url, name }
		let links = PRESET_LINKS.map((item) => {
			const url = normalize(item?.url);
			const name = item && typeof item.name === 'string' ? item.name.trim() : '';
			return url ? { url, name } : null;
		}).filter(Boolean);
		let page = 0;

		// Helpers
		function normalize(url) {
			try {
				const u = new URL(String(url));
				if (!u.searchParams.has(':showVizHome')) u.searchParams.set(':showVizHome', 'no');
				if (!u.searchParams.has(':embed')) u.searchParams.set(':embed', 'y');
				return u.toString();
			} catch {
				console.warn('Bad Tableau URL skipped:', url);
				return null;
			}
		}

		function titleFrom(url) {
			try {
				const u = new URL(url);
				const parts = u.pathname.split('/').filter(Boolean);
				const idx = parts.indexOf('views');
				if (idx >= 0 && parts[idx + 1]) {
					const wb = decodeURIComponent(parts[idx + 1]).replace(/[_-]/g, ' ');
					const sh = parts[idx + 2] ? decodeURIComponent(parts[idx + 2]).replace(/[_-]/g, ' ') : '';
					return sh ? `${wb} — ${sh}` : wb;
				}
				return u.hostname;
			} catch {
				return 'Tableau View';
			}
		}

		function render() {
			const total = links.length;
			const pages = Math.max(1, Math.ceil(total / PER_PAGE));
			page = Math.min(Math.max(0, page), pages - 1);

			metaEl.textContent = `Page ${pages ? page + 1 : 1} / ${pages} • ${total} item${total === 1 ? '' : 's'}`;
			prevBtn.disabled = page <= 0;
			nextBtn.disabled = page >= pages - 1;

			const start = page * PER_PAGE;
			const slice = links.slice(start, start + PER_PAGE);

			listEl.innerHTML = '';
			slice.forEach(({ url, name }) => {
				const card = document.createElement('div');
				card.className = 'tb-card';

				const head = document.createElement('div');
				head.className = 'tb-card-header';

				const title = document.createElement('div');
				title.className = 'tb-title';
				title.textContent = name || titleFrom(url); // prefer custom name

				head.append(title);
				card.appendChild(head);

				// Ensure the tableau-viz web component script is loaded in <head>:
				// <script type="module" src="https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js"></script>
				const viz = document.createElement('tableau-viz');
				viz.setAttribute('src', url);
				viz.setAttribute('toolbar', 'bottom');
				viz.setAttribute('hide-tabs', 'false');
				viz.style.width = '100%';
				viz.style.height = window.innerWidth >= 1100 ? '800px' : '700px';

				card.appendChild(viz);
				listEl.appendChild(card);
			});
		}

		// Pager
		prevBtn?.addEventListener('click', () => {
			page = Math.max(0, page - 1);
			render();
		});
		nextBtn?.addEventListener('click', () => {
			page = page + 1;
			render();
		});

		// Render when the Viz tab is shown (SPA)
		const originalShow = window.show;
		if (typeof originalShow === 'function') {
			window.show = function (id) {
				originalShow(id);
				if (id === 'viz') render();
			};
		}
		if (document.getElementById('viz')?.classList.contains('active')) render();
	})();
})();
