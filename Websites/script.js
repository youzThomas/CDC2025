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
