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
		apollo: {
			mission: 'Apollo 17 — Taurus-Littrow Valley',
			summary:
				'NASA’s final Apollo landing paired veteran commanders with the program’s first scientist astronaut to harvest lunar geology.',
			crew: [
				{ name: 'Gene Cernan', role: 'Commander', agency: 'NASA' },
				{ name: 'Harrison Schmitt', role: 'Lunar Module Pilot', agency: 'NASA' },
				{ name: 'Ronald Evans', role: 'Command Module Pilot', agency: 'NASA' },
			],
			cards: [
				{
					name: 'Gene Cernan',
					title: 'Mission Commander',
					image: 'https://via.placeholder.com/96x96.png?text=GC',
					description:
						'Veteran pilot overseeing EVA choreography and the deployment of experiments on the lunar surface.',
					highlight: 'Highlight: Last footsteps on the Moon, December 1972.',
				},
				{
					name: 'Harrison Schmitt',
					title: 'Scientist Astronaut',
					image: 'https://via.placeholder.com/96x96.png?text=HS',
					description:
						'Geologist collecting orange soil samples that reshaped lunar volcanic theories for decades.',
					highlight: 'Highlight: Returned 110 kg of lunar material.',
				},
				{
					name: 'Ronald Evans',
					title: 'Orbital Specialist',
					image: 'https://via.placeholder.com/96x96.png?text=RE',
					description:
						'Orbited above in America, relaying comms and capturing sweeping photography for mapping teams.',
					highlight: 'Highlight: Deep-space EVA to retrieve film canisters.',
				},
			],
		},
		'iss-expedition': {
			mission: 'ISS Expedition 70 — Microgravity Lab',
			summary:
				'An international crew juggling maintenance, microgravity research, and STEM outreach from low Earth orbit.',
			crew: [
				{ name: 'Jasmin Moghbeli', role: 'Commander', agency: 'NASA' },
				{ name: 'Konstantin Borisov', role: 'Flight Engineer', agency: 'Roscosmos' },
				{ name: 'Satoshi Furukawa', role: 'Science Lead', agency: 'JAXA' },
				{ name: 'Andreas Mogensen', role: 'Operations Lead', agency: 'ESA' },
			],
			cards: [
				{
					name: 'Jasmin Moghbeli',
					title: 'Crew Commander',
					image: 'https://via.placeholder.com/96x96.png?text=JM',
					description:
						'Oversees daily planning and collision-avoidance drills while mentoring first-time flyers.',
					highlight: 'Highlight: Coordinated three spacewalks to swap solar array electronics.',
				},
				{
					name: 'Konstantin Borisov',
					title: 'Systems Engineer',
					image: 'https://via.placeholder.com/96x96.png?text=KB',
					description:
						'Keeps life-support and thermal systems humming, logging anomalies for ground teams.',
					highlight: 'Highlight: Completed 120+ maintenance tasks in microgravity.',
				},
				{
					name: 'Satoshi Furukawa',
					title: 'Science Coordinator',
					image: 'https://via.placeholder.com/96x96.png?text=SF',
					description:
						'Leads fluid dynamics and biomanufacturing experiments for future lunar habitats.',
					highlight: 'Highlight: Streamed live lessons to 40 classrooms worldwide.',
				},
				{
					name: 'Andreas Mogensen',
					title: 'Operations Lead',
					image: 'https://via.placeholder.com/96x96.png?text=AM',
					description:
						'Runs robotics sessions with Canadarm2 and pilots the station’s handheld lidar demo.',
					highlight: 'Highlight: Logged the first nighttime aurora survey with new cameras.',
				},
			],
		},
		'lunar-gateway': {
			mission: 'Artemis: Lunar Gateway Concept Crew',
			summary:
				'A forward-looking manifest for a cislunar outpost staging sustainable Moon missions and Mars prep.',
			crew: [
				{ name: 'Naomi Reyes', role: 'Gateway Commander', agency: 'NASA (Placeholder)' },
				{ name: 'Liang Chen', role: 'Habitation Specialist', agency: 'CNSA (Placeholder)' },
				{ name: 'Sara Okoye', role: 'Life Sciences Lead', agency: 'CSA (Placeholder)' },
				{ name: 'Mateo Rossi', role: 'Power Systems Engineer', agency: 'ESA (Placeholder)' },
			],
			cards: [
				{
					name: 'Naomi Reyes',
					title: 'Gateway Commander',
					image: 'https://via.placeholder.com/96x96.png?text=NR',
					description:
						'Coordinates logistics for Orion dockings and surface sorties, balancing multiple mission timelines.',
					highlight: 'Highlight: Simulated 45-day rotation with zero unplanned downtime.',
				},
				{
					name: 'Liang Chen',
					title: 'Habitation Specialist',
					image: 'https://via.placeholder.com/96x96.png?text=LC',
					description:
						'Designs modular living quarters and closed-loop recycling systems for rotating crews.',
					highlight: 'Highlight: Trialed hybrid algae scrubbers for oxygen regeneration.',
				},
				{
					name: 'Sara Okoye',
					title: 'Life Sciences Lead',
					image: 'https://via.placeholder.com/96x96.png?text=SO',
					description:
						'Studies radiation countermeasures and nutrient recycling to prep for Mars-class missions.',
					highlight: 'Highlight: Demonstrated bio-printing of tissue samples in partial gravity.',
				},
				{
					name: 'Mateo Rossi',
					title: 'Power Systems Engineer',
					image: 'https://via.placeholder.com/96x96.png?text=MR',
					description:
						'Leads solar array deployment drills and energy storage simulations for lunar night ops.',
					highlight: 'Highlight: Validated modular microwave beaming prototypes.',
				},
			],
		},
	};

	const defaultStory = 'apollo';

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
			const img = new Image();
			img.src = card.image;
			img.alt = `Portrait of ${card.name}`;
			const meta = document.createElement('div');
			const title = document.createElement('h3');
			title.textContent = card.name;
			const role = document.createElement('p');
			role.className = 'story-role';
			role.textContent = card.title;
			meta.appendChild(title);
			meta.appendChild(role);
			header.appendChild(img);
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
})();
