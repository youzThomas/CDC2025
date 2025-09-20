const chips = document.querySelectorAll('.chip');
const sections = document.querySelectorAll('section');
const minimap = document.getElementById('minimap'); // global minimap (only visible on story section)

function toggleMinimap(id) {
	if (!minimap) return;
	const showMap = id === 'story';
	minimap.classList.toggle('hidden', !showMap);
	minimap.setAttribute('aria-hidden', String(!showMap));
}

function show(id) {
	sections.forEach((s) => s.classList.toggle('active', s.id === id));
	chips.forEach((c) => c.classList.toggle('active', c.dataset.target === id));
	history.replaceState(null, '', '#' + id);
	toggleMinimap(id);
}

chips.forEach((c) => c.addEventListener('click', () => show(c.dataset.target)));
if (location.hash) {
	const id = location.hash.slice(1);
	if (document.getElementById(id)) show(id);
	else {
		toggleMinimap('home');
	}
} else {
	// ensure correct initial minimap state
	toggleMinimap('home');
}

// ----- Minimap interactions (dots) -----
if (minimap) {
	minimap.addEventListener('click', (e) => {
		const dot = e.target.closest('.map-dot');
		if (!dot) return;
		const info =
			dot.dataset.info || `Landing site (${Array.from(minimap.querySelectorAll('.map-dot')).indexOf(dot) + 1})`;
		// Simple accessible announcement (could be replaced with custom tooltip UI)
		alert('Landing Site: ' + info);
		show('story');
	});
}

// ----- CSV parser (no deps) -----
function parseCSV(text) {
	const rows = [];
	let i = 0,
		field = '',
		row = [],
		inQ = false;
	while (i < text.length) {
		const ch = text[i];
		if (inQ) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i += 2;
				continue;
			}
			if (ch === '"') {
				inQ = false;
				i++;
				continue;
			}
			field += ch;
			i++;
			continue;
		}
		if (ch === '"') {
			inQ = true;
			i++;
			continue;
		}
		if (ch === ',') {
			row.push(field);
			field = '';
			i++;
			continue;
		}
		if (ch === '\n' || ch === '\r') {
			if (field !== '' || row.length) {
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
			}
			if (ch === '\r' && text[i + 1] === '\n') i++;
			i++;
			continue;
		}
		field += ch;
		i++;
	}
	if (field !== '' || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.length > 0);
}

// ----- Visualization -----
const fileInput = document.getElementById('csvFile');
const xSel = document.getElementById('xSelect');
const ySel = document.getElementById('ySelect');
const drawBarBtn = document.getElementById('drawBar');
const drawLineBtn = document.getElementById('drawLine');
const canvas = document.getElementById('chart');
const ctx = canvas ? canvas.getContext('2d') : null;

let headers = [],
	dataRows = [];

function populateSelectors() {
	xSel.innerHTML = '<option value="">X axis</option>';
	ySel.innerHTML = '<option value="">Y axis (numeric)</option>';
	headers.forEach((h) => {
		xSel.add(new Option(h, h));
		ySel.add(new Option(h, h));
	});
	drawBarBtn.disabled = drawLineBtn.disabled = false;
}

if (fileInput) {
	fileInput.addEventListener('change', (e) => {
		const f = e.target.files[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = () => {
			const rows = parseCSV(reader.result);
			headers = rows.shift();
			dataRows = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
			populateSelectors();
			botSay(`Loaded CSV with ${dataRows.length} rows and ${headers.length} columns.`);
		};
		reader.readAsText(f);
	});
}

function clearCanvas() {
	if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function drawAxes() {
	ctx.strokeStyle = 'rgba(255,255,255,.6)';
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(60, 20);
	ctx.lineTo(60, 380);
	ctx.lineTo(980, 380);
	ctx.stroke();
}
const asNumber = (v) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

function drawBar() {
	const xKey = xSel.value,
		yKey = ySel.value;
	if (!xKey || !yKey) return;
	const items = dataRows.map((r) => ({ x: r[xKey], y: asNumber(r[yKey]) })).filter((d) => d.y !== null);
	const agg = new Map();
	items.forEach((d) => agg.set(d.x, (agg.get(d.x) || 0) + d.y));
	const labels = [...agg.keys()],
		values = [...agg.values()];
	const max = Math.max(...values);
	clearCanvas();
	drawAxes();
	const base = 380,
		pad = 80,
		w = (920 - pad) / labels.length,
		scale = max > 0 ? 300 / max : 0;
	ctx.fillStyle = 'rgba(91,209,255,.85)';
	labels.forEach((lab, i) => {
		const x = 60 + i * w + 8,
			h = values[i] * scale;
		ctx.fillRect(x, base - h, Math.max(6, w - 16), h);
	});
	ctx.fillStyle = 'rgba(255,255,255,.9)';
	ctx.font = '16px "Exo 2", "Orbitron", ui-sans-serif, system-ui';
	ctx.fillText(`${yKey} by ${xKey}`, 70, 28);
}

function drawLine() {
	const xKey = xSel.value,
		yKey = ySel.value;
	if (!xKey || !yKey) return;
	const items = dataRows.map((r) => ({ x: r[xKey], y: asNumber(r[yKey]) })).filter((d) => d.y !== null);
	const xs = items.map((d) => Number(d.x)),
		numericX = xs.every(Number.isFinite);
	const labels = numericX ? xs : items.map((_, i) => i + 1);
	const ys = items.map((d) => d.y),
		maxY = Math.max(...ys),
		minY = Math.min(...ys);
	const scale = (v) => {
		const a = 380,
			b = 60;
		return a - ((v - minY) / (maxY - minY || 1)) * (a - b);
	};
	clearCanvas();
	drawAxes();
	ctx.strokeStyle = 'rgba(91,209,255,.9)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	labels.forEach((_, i) => {
		const x = 60 + (i / (labels.length - 1 || 1)) * 920,
			y = scale(ys[i]);
		i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
	});
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,.9)';
	ctx.font = '16px ui-sans-serif, system-ui';
	ctx.fillText(`${yKey} over ${xKey}`, 70, 28);
}

if (drawBarBtn) drawBarBtn.addEventListener('click', drawBar);
if (drawLineBtn) drawLineBtn.addEventListener('click', drawLine);

// ----- Chat bot (rule-based over uploaded CSV) -----
const messages = document.getElementById('messages');
const input = document.getElementById('prompt');
const send = document.getElementById('send');

function append(text, cls) {
	const div = document.createElement('div');
	div.className = 'msg ' + cls;
	div.textContent = text;
	messages.appendChild(div);
	messages.scrollTop = messages.scrollHeight;
}
function botSay(text) {
	append(text, 'bot');
}

if (send) {
	send.addEventListener('click', () => {
		if (!input.value.trim()) return;
		append(input.value, 'me');
		respond(input.value);
		input.value = '';
	});
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			send.click();
		}
	});
}

function respond(q) {
	const s = q.toLowerCase();
	if (!dataRows.length) {
		botSay('Upload a CSV on the Visualization tab first.');
		return;
	}
	if (s.includes('row')) {
		botSay(`Rows: ${dataRows.length}`);
		return;
	}
	if (s.includes('column')) {
		botSay(`Columns: ${headers.join(', ')}`);
		return;
	}
	if (s.includes('unique')) {
		const col = headers.find((h) => s.includes(h.toLowerCase())) || headers[0];
		const set = new Set(dataRows.map((r) => r[col]));
		botSay(`Unique values in "${col}": ${set.size}`);
		return;
	}
	if (s.includes('mean') || s.includes('average')) {
		const col = headers.find((h) => s.includes(h.toLowerCase())) || headers[0];
		const nums = dataRows.map((r) => Number(r[col])).filter(Number.isFinite);
		const mean = (nums.reduce((a, b) => a + b, 0) / (nums.length || 1)).toFixed(2);
		botSay(`Mean of "${col}": ${mean} (n=${nums.length})`);
		return;
	}
	botSay('Try: "how many rows", "what columns", "unique Country", or "mean Total Flights".');
}
