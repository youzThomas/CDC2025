/*********************************************************
 * Simple SPA router (top nav chips) + minimap toggle
 *********************************************************/
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
 * Moonbase Copilot — conversational assistant UI
 *********************************************************/
(function () {
	const form = document.getElementById('chatForm');
	const promptEl = document.getElementById('chatPrompt');
	const logEl = document.getElementById('chatLog');
	const statusEl = document.getElementById('chatStatus');
	const suggestions = document.getElementById('chatSuggestions');
	const sendBtn = document.getElementById('chatSend');
	const resetBtn = document.getElementById('chatReset');
	if (!form || !promptEl || !logEl) return;

	const systemMessage = {
		role: 'system',
		content:
			'You are Moonbase Copilot, an AI guide for the Astronaut Data Challenge. Answer succinctly, reference mission or demographic insights when useful, and keep responses under 180 words.',
	};
	const history = [];
	let busy = false;

	function updateStatus(text) {
		if (statusEl) statusEl.textContent = text;
	}

	function setBusy(state) {
		busy = state;
		if (sendBtn) sendBtn.disabled = state;
		promptEl.disabled = state;
		if (state) {
			updateStatus('Consulting mission control…');
		}
	}

	function createBubble(text) {
		const bubble = document.createElement('div');
		bubble.className = 'bubble';
		const lines = text.split(/\n/);
		lines.forEach((line, idx) => {
			if (idx) bubble.appendChild(document.createElement('br'));
			bubble.appendChild(document.createTextNode(line));
		});
		return bubble;
	}

	function appendMessage(role, text) {
		const message = document.createElement('div');
		message.className = `chat-message ${role}`;
		const avatar = document.createElement('div');
		avatar.className = 'avatar';
		avatar.textContent = role === 'user' ? '🧑‍🚀' : '🤖';
		message.appendChild(avatar);
		message.appendChild(createBubble(text));
		logEl.appendChild(message);
		logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
	}

	function resetChat() {
		history.length = 0;
		logEl.innerHTML = '';
		if (suggestions) {
			suggestions.classList.remove('hidden');
			suggestions.setAttribute('aria-hidden', 'false');
		}
		appendMessage('bot', 'Moonbase Copilot online. Ask about astronaut data, mission stories, or presentation ideas.');
		updateStatus('Ready for launch.');
		promptEl.value = '';
		autoSize();
	}

	async function sendMessage(content) {
		if (!content) return;
		appendMessage('user', content);
		history.push({ role: 'user', content });
		if (suggestions && !suggestions.classList.contains('hidden')) {
			suggestions.classList.add('hidden');
			suggestions.setAttribute('aria-hidden', 'true');
		}
		setBusy(true);
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: [systemMessage, ...history] }),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const reply = (data && (data.reply || data.message || data.content)) || 'I could not generate a response.';
			history.push({ role: 'assistant', content: reply });
			appendMessage('bot', reply.trim());
			updateStatus('Awaiting your next question.');
		} catch (err) {
			console.error('[chat-error]', err);
			appendMessage('bot', 'I hit interference while contacting mission control. Please try again.');
			updateStatus('Connection interrupted.');
		} finally {
			setBusy(false);
		}
	}

	function autoSize() {
		promptEl.style.height = 'auto';
		promptEl.style.height = Math.min(promptEl.scrollHeight, 160) + 'px';
	}

	suggestions?.addEventListener('click', (event) => {
		const target = event.target.closest('[data-prompt]');
		if (!target) return;
		const suggestion = target.getAttribute('data-prompt');
		if (!suggestion) return;
		promptEl.value = suggestion;
		autoSize();
		promptEl.focus();
	});

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		if (busy) return;
		const prompt = promptEl.value.trim();
		if (!prompt) return;
		promptEl.value = '';
		autoSize();
		sendMessage(prompt);
	});

	resetBtn?.addEventListener('click', () => {
		if (busy) return;
		resetChat();
	});

	promptEl.addEventListener('input', autoSize);
	resetChat();
})();

/*********************************************************
 * Mission story swapping (minimap dots)
 *********************************************************/
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
					description:
						'Co-piloted Eagle, deployed the EASEP science package, and captured iconic surface photography.',
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
			const footer = document.createElement('footer');
			footer.textContent = card.highlight;
			article.appendChild(header);
			article.appendChild(body);
			article.appendChild(footer);
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
				url: 'https://public.tableau.com/views/astronauts_17435559954980/Sheet9?:language=zh-CN&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
				name: 'Count of Mission Roles ',
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

