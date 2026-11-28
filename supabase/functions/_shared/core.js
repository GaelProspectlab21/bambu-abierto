// src/lib/readingSession.ts
var text = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
function readingDetail(v) {
	return {
		...Number.isInteger(v.seconds) && Number(v.seconds) > 0 && Number(v.seconds) <= 86400 ? { seconds: Number(v.seconds) } : {},
		...text(v.location, 100) ? { location: text(v.location, 100) } : {},
		...text(v.takeaway, 2e3) ? { takeaway: text(v.takeaway, 2e3) } : {},
		...text(v.application, 1e3) ? { application: text(v.application, 1e3) } : {},
		...v.captureMode === "timer" || v.captureMode === "manual" ? { captureMode: v.captureMode } : {}
	};
}
function cleanActiveReading(v) {
	if (!v || typeof v !== "object") return null;
	const row = v;
	if (!text(row.id, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.day)) || !Number.isFinite(row.startedAt) || Number(row.startedAt) <= 0) return null;
	return {
		id: text(row.id, 80),
		day: String(row.day),
		startedAt: Number(row.startedAt),
		title: text(row.title, 300),
		location: text(row.location, 100),
		takeaway: text(row.takeaway, 2e3),
		application: text(row.application, 1e3),
		note: text(row.note, 500),
		...Object.fromEntries([
			"pausedAt",
			"pausedMilliseconds",
			"endedAt"
		].filter((k) => Number.isFinite(row[k]) && Number(row[k]) >= 0).map((k) => [k, Number(row[k])]))
	};
}
function readingSeconds(session, now = Date.now()) {
	const end = session.endedAt ?? session.pausedAt ?? now;
	return Math.max(0, Math.floor((end - session.startedAt - (session.pausedMilliseconds ?? 0)) / 1e3));
}
function finishReading(session, now = Date.now()) {
	return session.endedAt ? session : {
		...session,
		endedAt: session.pausedAt ?? now
	};
}
// src/lib/personal.ts
function provenance(value) {
	const source = typeof value.source === "string" && [
		"bambu",
		"codice",
		"cauce",
		"user_estimate"
	].includes(value.source) ? value.source : void 0;
	return {
		...value.durationKnown === false ? { durationKnown: false } : {},
		...typeof value.status === "string" ? { status: value.status.slice(0, 40) } : {},
		...typeof value.title === "string" ? { title: value.title.slice(0, 300) } : {},
		...typeof value.taskId === "string" ? { taskId: value.taskId.slice(0, 160) } : {},
		...source ? { source } : {},
		...typeof value.sourceId === "string" ? { sourceId: value.sourceId.slice(0, 160) } : {},
		...value.estimated === true ? { estimated: true } : {},
		...value.dayConfirmed === true ? { dayConfirmed: true } : {},
		...typeof value.estimateReason === "string" ? { estimateReason: value.estimateReason.slice(0, 300) } : {}
	};
}
function taskDay(value) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return void 0;
	const date = /* @__PURE__ */ new Date(`${value}T12:00:00`);
	return Number.isFinite(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === value ? value : void 0;
}
function normalizeTasks(value) {
	if (!Array.isArray(value)) return [];
	return value.slice(0, 5e3).flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const row = item;
		if (typeof row.id !== "string" || typeof row.text !== "string" || !row.text.trim()) return [];
		const minutes = Number(row.minutes);
		const level = row.level === null ? null : Number(row.level);
		return [{
			id: row.id.slice(0, 160),
			text: row.text.trim().slice(0, 200),
			status: row.status === "done" ? "done" : row.status === "archived" ? "archived" : row.status === "in_progress" ? "in_progress" : "pending",
			minutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 180 ? minutes : 25,
			level: level !== null && Number.isFinite(level) && level >= 1 && level <= 4 ? level : null,
			dueDate: taskDay(row.dueDate),
			completedOn: taskDay(row.completedOn),
			...taskDay(row.sapo) ? { sapo: taskDay(row.sapo) } : {},
			notes: typeof row.notes === "string" ? row.notes.slice(0, 4e3) : "",
			project: typeof row.project === "string" ? row.project.slice(0, 60) : "",
			subtasks: Array.isArray(row.subtasks) ? row.subtasks.slice(0, 100).filter((s) => !!s && typeof s === "object" && typeof s.id === "string" && typeof s.text === "string").map((s) => ({
				id: s.id.slice(0, 80),
				text: s.text.slice(0, 200),
				done: s.done === true
			})) : [],
			updatedAt: Number.isFinite(row.updatedAt) ? Number(row.updatedAt) : 0,
			...typeof row.sourceId === "string" ? { sourceId: row.sourceId.slice(0, 160) } : {}
		}];
	});
}
// src/lib/model.ts
var ALL_MODULES = {
	reading: true,
	bible: true,
	training: true,
	focus: true,
	food: true
};
function modulesOf(settings) {
	return settings.modules ?? ALL_MODULES;
}
var DEFAULT_HABITS = [
	{
		id: "bible",
		label: "Biblia",
		mark: "B",
		auto: "bible"
	},
	{
		id: "pushups",
		label: "Entrenar o moverme",
		mark: "E",
		auto: "training"
	},
	{
		id: "food",
		label: "Comer comida real",
		mark: "C"
	},
	{
		id: "stretch",
		label: "Estiramiento",
		mark: "S"
	},
	{
		id: "english",
		label: "Inglés",
		mark: "I"
	},
	{
		id: "speech",
		label: "Oratoria",
		mark: "O"
	}
];
var DEFAULT_REMINDERS = {
	on: false,
	checkin: "07:00",
	read: "20:00",
	train: "17:30",
	wake: "06:30",
	photos: true
};
var DEFAULT_SETTINGS = {
	footballDays: [],
	weeklyFocusGoal: 0,
	restSeconds: 90,
	leverageLabels: {
		"1": "Relleno: pendientes chicos que no mueven nada. Júntalos o suéltalos",
		"2": "Compromisos: lo que ya le prometiste a alguien",
		"3": "Construir: lo que mejora tus sistemas, tu escuela o tu trabajo",
		"4": "Lo importante: lo que más cambia tu semana. Va primero"
	},
	distractions: [
		{
			id: "celular",
			label: "Celular en otro cuarto o en modo avión",
			enabled: true
		},
		{
			id: "pestanas",
			label: "Cerrar todas las pestañas menos la que necesitas",
			enabled: true
		},
		{
			id: "notificaciones",
			label: "Notificaciones apagadas",
			enabled: true
		},
		{
			id: "agua",
			label: "Agua a la mano",
			enabled: true
		},
		{
			id: "aviso",
			label: "Avisar en casa que estás en bloque",
			enabled: true
		}
	],
	habits: DEFAULT_HABITS,
	age: 16,
	bibleOrder: "ruta",
	sleepTarget: 9,
	stepsTarget: 1e4,
	equipment: ["nada", "pared"],
	reminders: DEFAULT_REMINDERS
};
({ ...DEFAULT_SETTINGS }), [...DEFAULT_HABITS.slice(0, 2), ...DEFAULT_HABITS.slice(2)];
var EMPTY_DATA = {
	version: 2,
	schemaRevision: 3,
	profile: {
		name: "",
		onboardingComplete: false
	},
	settings: DEFAULT_SETTINGS,
	habits: {},
	reading: [],
	bible: [],
	works: [],
	focus: [],
	tasks: [],
	sets: [],
	activities: [],
	checkins: [],
	body: [],
	exercises: [],
	meals: [],
	training: [],
	activeFocus: null,
	activeReading: null,
	activeWorkout: null
};
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isDay(value) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = /* @__PURE__ */ new Date(`${value}T12:00:00`);
	return Number.isFinite(date.getTime()) && dateKey(date) === value;
}
function cleanText(value, max) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function int(value, min, max) {
	const n = Number(value);
	return value !== void 0 && value !== null && value !== "" && Number.isInteger(n) && n >= min && n <= max ? n : void 0;
}
function num(value, min, max) {
	const n = Number(value);
	return value !== void 0 && value !== null && value !== "" && Number.isFinite(n) && n >= min && n <= max ? n : void 0;
}
function stamp(value) {
	return num(value, 1, 9e15);
}
/** Quita las llaves undefined para que dos objetos iguales serialicen igual. */
function compact(value) {
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== void 0));
}
function texts(value, maxItems, maxLength) {
	if (!Array.isArray(value)) return void 0;
	const list = value.filter((v) => typeof v === "string" && v.trim().length > 0).map((v) => v.trim().slice(0, maxLength)).slice(0, maxItems);
	return list.length ? list : void 0;
}
function idOf(value) {
	return cleanText(value.id, 160);
}
function cleanReadingRow(value) {
	const id = idOf(value);
	const minutes = int(value.minutes, 0, 1440);
	if (!id || !isDay(value.day) || minutes === void 0) return null;
	const bible = Array.isArray(value.bible) ? value.bible.flatMap((range) => {
		if (!isRecord(range)) return [];
		const book = int(range.book, 1, 73), from = int(range.from, 1, 150), to = int(range.to, 1, 150);
		return book && from && to && to >= from ? [{
			book,
			from,
			to
		}] : [];
	}).slice(0, 30) : [];
	return compact({
		id,
		day: value.day,
		minutes,
		note: cleanText(value.note, 1e3),
		...provenance(value),
		...readingDetail(value),
		bible: bible.length ? bible : void 0,
		workId: cleanText(value.workId, 160) || void 0,
		pageTo: int(value.pageTo, 1, 2e4)
	});
}
function cleanBibleRow(value) {
	const book = int(value.book, 1, 73), chapter = int(value.chapter, 1, 150);
	if (!book || !chapter || !isDay(value.day)) return null;
	return compact({
		id: `${book}:${chapter}`,
		book,
		chapter,
		day: value.day,
		verses: cleanText(value.verses, 60) || void 0,
		source: cleanText(value.source, 20) || void 0
	});
}
function cleanWorkRow(value) {
	const id = idOf(value), title = cleanText(value.title, 200);
	if (!id || !title) return null;
	return compact({
		id,
		title,
		status: value.status === "done" || value.status === "paused" ? value.status : "reading",
		author: cleanText(value.author, 120) || void 0,
		totalPages: int(value.totalPages, 1, 2e4),
		currentPage: int(value.currentPage, 0, 2e4),
		startedOn: isDay(value.startedOn) ? value.startedOn : void 0,
		finishedOn: isDay(value.finishedOn) ? value.finishedOn : void 0
	});
}
function cleanMicro(value) {
	if (!Array.isArray(value)) return void 0;
	const rows = value.slice(0, 10).flatMap((item, index) => {
		if (!isRecord(item)) return [];
		const text = cleanText(item.text, 200);
		return text ? [compact({
			id: cleanText(item.id, 80) || `m${index}`,
			text,
			minutes: int(item.minutes, 1, 240),
			done: item.done === true
		})] : [];
	});
	return rows.length ? rows : void 0;
}
function cleanPauses(value) {
	if (!Array.isArray(value)) return void 0;
	const rows = value.slice(0, 100).flatMap((item) => {
		if (!isRecord(item)) return [];
		const at = stamp(item.at), seconds = int(item.seconds, 0, 86400);
		return at && seconds !== void 0 ? [{
			at,
			seconds,
			reason: cleanText(item.reason, 80) || "otra"
		}] : [];
	});
	return rows.length ? rows : void 0;
}
function cleanFocusRow(value) {
	const id = idOf(value), task = cleanText(value.task, 300), minutes = int(value.minutes, 0, 1440);
	if (!id || !task || minutes === void 0 || !isDay(value.day)) return null;
	return compact({
		id,
		day: value.day,
		task,
		minutes,
		result: cleanText(value.result, 1e3),
		goal: cleanText(value.goal, 300) || void 0,
		level: int(value.level, 1, 4),
		plannedMinutes: int(value.plannedMinutes, 1, 600),
		startedAt: stamp(value.startedAt),
		endedAt: stamp(value.endedAt),
		focusScore: int(value.focusScore, 1, 5),
		improvement: cleanText(value.improvement, 1e3) || void 0,
		blockers: texts(value.blockers, 12, 60),
		captured: texts(value.captured, 50, 300),
		micro: cleanMicro(value.micro),
		openLoop: cleanText(value.openLoop, 500) || void 0,
		resumePlan: cleanText(value.resumePlan, 300) || void 0,
		nextCue: cleanText(value.nextCue, 300) || void 0,
		pausedSeconds: int(value.pausedSeconds, 0, 86400),
		pauses: cleanPauses(value.pauses),
		...provenance(value)
	});
}
function cleanSetRow(value) {
	const id = idOf(value), exercise = cleanText(value.exercise, 80), at = stamp(value.at);
	const reps = int(value.reps, 0, 500), seconds = int(value.seconds, 0, 3600);
	if (!id || !exercise || !at || !isDay(value.day) || reps === void 0 && seconds === void 0) return null;
	return compact({
		id,
		day: value.day,
		at,
		exercise,
		reps,
		seconds,
		loadKg: num(value.loadKg, 0, 300),
		rir: int(value.rir, 0, 5),
		note: cleanText(value.note, 300) || void 0
	});
}
function cleanActivityRow(value) {
	const id = idOf(value);
	const kind = [
		"football",
		"rest",
		"walk",
		"other"
	].find((k) => k === value.kind);
	if (!id || !kind || !isDay(value.day)) return null;
	const sport = [
		"caminar",
		"correr",
		"bici"
	].find((k) => k === value.sport);
	const km = num(value.km, 0, 500);
	return compact({
		id,
		day: value.day,
		kind,
		minutes: int(value.minutes, 1, 1440),
		intensity: int(value.intensity, 1, 3),
		note: cleanText(value.note, 300) || void 0,
		sport,
		km: km !== void 0 ? Math.round(km * 100) / 100 : void 0,
		deporte: typeof value.deporte === "string" && /^[a-z]{2,20}$/.test(value.deporte) ? value.deporte : void 0,
		sinAjuste: value.sinAjuste === true ? true : void 0
	});
}
function cleanCheckinRow(value) {
	if (!isDay(value.day)) return null;
	return compact({
		id: value.day,
		day: value.day,
		sleepHours: num(value.sleepHours, 0, 16),
		energy: int(value.energy, 1, 5),
		steps: int(value.steps, 0, 1e5),
		soreness: texts(value.soreness, 20, 30),
		pain: cleanText(value.pain, 30) || void 0,
		painNote: cleanText(value.painNote, 300) || void 0,
		proteinMeals: int(value.proteinMeals, 0, 8),
		realFood: typeof value.realFood === "boolean" ? value.realFood : void 0,
		capacity: int(value.capacity, 0, 100),
		given: int(value.given, 0, 100),
		blocker: cleanText(value.blocker, 40) || void 0,
		reflection: cleanText(value.reflection, 600) || void 0,
		promises: cleanPromises(value.promises),
		anchors: cleanAnchors(value.anchors),
		felt: int(value.felt, 0, 100)
	});
}
var PROMISE_KINDS = [
	"reading",
	"training",
	"focus",
	"task",
	"habit",
	"free"
];
function cleanPromises(value) {
	if (!Array.isArray(value)) return void 0;
	const out = value.filter(isRecord).flatMap((p) => {
		const kind = PROMISE_KINDS.find((k) => k === p.kind);
		const id = cleanText(p.id, 80), label = cleanText(p.label, 120);
		if (!kind || !id || !label) return [];
		return [compact({
			id,
			kind,
			label,
			target: int(p.target, 1, 600),
			ref: cleanText(p.ref, 80) || void 0,
			done: p.done === true ? true : void 0
		})];
	}).slice(0, 3);
	return out.length ? out : void 0;
}
function cleanAnchors(value) {
	if (!isRecord(value)) return void 0;
	const pick = (v) => typeof v === "boolean" ? v : void 0;
	const out = compact({
		start: pick(value.start),
		escape: pick(value.escape),
		people: pick(value.people)
	});
	return Object.keys(out).length ? out : void 0;
}
function cleanBodyRow(value) {
	if (!isDay(value.day)) return null;
	return compact({
		id: value.day,
		day: value.day,
		weightKg: num(value.weightKg, 20, 250),
		heightCm: num(value.heightCm, 100, 230),
		neckCm: num(value.neckCm, 15, 70),
		armCm: num(value.armCm, 10, 70),
		waistCm: num(value.waistCm, 40, 200),
		photos: value.photos === true ? true : void 0
	});
}
var GROUPS = [
	"proteina",
	"lacteo",
	"leguminosa",
	"cereal",
	"verdura",
	"fruta",
	"grasa",
	"dulce",
	"bebida",
	"platillo"
];
var SLOTS = [
	"desayuno",
	"comida",
	"cena",
	"colacion"
];
function cleanMealItem(value) {
	if (!isRecord(value)) return null;
	const name = cleanText(value.name, 80), qty = num(value.qty, .1, 50), kcal = num(value.kcal, 0, 5e3), protein = num(value.protein, 0, 300);
	if (!name || qty === void 0 || kcal === void 0 || protein === void 0) return null;
	const group = GROUPS.includes(value.group) ? value.group : "platillo";
	return compact({
		name,
		qty,
		unit: cleanText(value.unit, 30) || "porción",
		kcal: Math.round(kcal),
		protein: Math.round(protein * 10) / 10,
		group,
		foodId: cleanText(value.foodId, 60) || void 0
	});
}
function cleanMealRow(value) {
	const id = idOf(value);
	if (!id || !isDay(value.day) || !Array.isArray(value.items)) return null;
	const items = value.items.slice(0, 40).map(cleanMealItem).filter((i) => !!i);
	if (!items.length) return null;
	return compact({
		id,
		day: value.day,
		at: stamp(value.at) ?? Date.parse(`${value.day}T12:00:00`),
		slot: SLOTS.includes(value.slot) ? value.slot : "comida",
		items,
		note: cleanText(value.note, 300) || void 0
	});
}
function cleanNutrition(value) {
	if (!isRecord(value)) return void 0;
	const out = compact({
		sex: value.sex === "h" || value.sex === "m" ? value.sex : void 0,
		goal: [
			"definir",
			"musculo",
			"ambos",
			"salud"
		].includes(value.goal) ? value.goal : void 0,
		trainingYears: num(value.trainingYears, 0, 60)
	});
	return Object.keys(out).length ? out : void 0;
}
function cleanHabitSuggest(value) {
	if (!isRecord(value)) return void 0;
	const out = compact({
		lastDay: isDay(value.lastDay) ? value.lastDay : void 0,
		skipped: texts(value.skipped, 60, 40)
	});
	return Object.keys(out).length ? out : void 0;
}
function cleanExerciseRow(value) {
	const id = idOf(value), name = cleanText(value.name, 80);
	if (!id || !name) return null;
	return {
		id,
		name,
		pattern: cleanText(value.pattern, 30) || "otro",
		mode: value.mode === "seconds" ? "seconds" : "reps",
		muscles: texts(value.muscles, 6, 30) ?? []
	};
}
function cleanActiveFocus(value) {
	if (!isRecord(value)) return null;
	const task = cleanText(value.task, 300), startedAt = stamp(value.startedAt);
	if (!task || !startedAt) return null;
	const phase = [
		"ritual",
		"active",
		"closing"
	].find((p) => p === value.phase);
	return compact({
		task,
		startedAt,
		plannedMinutes: int(value.plannedMinutes, 1, 600),
		goal: cleanText(value.goal, 300) || void 0,
		pausedAt: stamp(value.pausedAt),
		pausedMilliseconds: num(value.pausedMilliseconds, 0, 9e12),
		taskId: cleanText(value.taskId, 160) || void 0,
		taskIds: texts(value.taskIds, 12, 160),
		level: int(value.level, 1, 4),
		micro: cleanMicro(value.micro),
		captured: texts(value.captured, 50, 300),
		pauses: cleanPauses(value.pauses),
		phase,
		endedAt: stamp(value.endedAt),
		pauseReason: cleanText(value.pauseReason, 80) || void 0
	});
}
function cleanActiveWorkout(value) {
	if (!isRecord(value)) return null;
	const startedAt = stamp(value.startedAt);
	if (!startedAt) return null;
	return compact({
		startedAt,
		endedAt: stamp(value.endedAt),
		template: cleanText(value.template, 30) || void 0,
		restUntil: stamp(value.restUntil),
		timer: isRecord(value.timer) && cleanText(value.timer.exercise, 160) && stamp(value.timer.startedAt) ? compact({
			exercise: cleanText(value.timer.exercise, 160),
			startedAt: stamp(value.timer.startedAt),
			rir: int(value.timer.rir, 0, 3) ?? 1,
			loadKg: num(value.timer.loadKg, 0, 60)
		}) : void 0
	});
}
function cleanChecklist(value, fallback) {
	if (!Array.isArray(value)) return fallback;
	const rows = value.slice(0, 20).flatMap((item) => isRecord(item) && cleanText(item.label, 120) ? [{
		id: cleanText(item.id, 40) || cleanText(item.label, 40),
		label: cleanText(item.label, 120),
		enabled: item.enabled !== false
	}] : []);
	return rows.length ? rows : fallback;
}
function cleanHabitDefs(value) {
	if (!Array.isArray(value)) return DEFAULT_HABITS;
	const seen = /* @__PURE__ */ new Set();
	const rows = value.slice(0, 30).flatMap((item) => {
		if (!isRecord(item)) return [];
		const id = cleanText(item.id, 40), label = cleanText(item.label, 60);
		if (!id || !label || seen.has(id)) return [];
		seen.add(id);
		const auto = [
			"bible",
			"reading",
			"training",
			"focus"
		].find((a) => a === item.auto);
		return [compact({
			id,
			label,
			mark: cleanText(item.mark, 2) || label.charAt(0).toUpperCase(),
			archived: item.archived === true ? true : void 0,
			auto,
			when: item.when === "manana" ? "manana" : void 0
		})];
	});
	return rows.length || value.length === 0 ? rows : DEFAULT_HABITS;
}
var HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
var clock = (value, fallback) => typeof value === "string" && (value === "" || HHMM.test(value)) ? value : fallback;
function cleanReminders(value) {
	const v = isRecord(value) ? value : {};
	const d = DEFAULT_REMINDERS;
	return {
		on: v.on === true,
		checkin: clock(v.checkin, d.checkin),
		read: clock(v.read, d.read),
		train: clock(v.train, d.train),
		wake: clock(v.wake, d.wake) || d.wake,
		photos: v.photos !== false
	};
}
function cleanRoutineItem(value, i) {
	if (!isRecord(value)) return null;
	const name = cleanText(value.name, 80);
	if (!name) return null;
	const kind = [
		"reps",
		"seconds",
		"free"
	].find((k) => k === value.kind) ?? "reps";
	const when = value.when === "before" || value.when === "after" ? value.when : void 0;
	return compact({
		id: cleanText(value.id, 40) || `i${i}`,
		name,
		kind,
		target: int(value.target, 0, 3600) ?? 0,
		rounds: int(value.rounds, 1, 10),
		when,
		quiet: isDay(value.quiet) ? value.quiet : void 0,
		sides: value.sides === true ? true : void 0
	});
}
function cleanRoutine(value) {
	if (!isRecord(value) || !Array.isArray(value.items)) return null;
	const items = value.items.slice(0, 40).flatMap((item, i) => {
		const row = cleanRoutineItem(item, i);
		return row ? [row] : [];
	});
	return {
		title: cleanText(value.title, 80) || "Rutina",
		rounds: int(value.rounds, 1, 10) ?? 3,
		items
	};
}
function cleanTrain(value) {
	if (!isRecord(value) || !Array.isArray(value.week)) return void 0;
	return {
		week: Array.from({ length: 7 }, (_, i) => cleanRoutine(value.week[i])),
		deadline: clock(value.deadline, "19:00") || "19:00",
		lock: value.lock !== false,
		restSeconds: int(value.restSeconds, 0, 600) ?? 60
	};
}
function cleanAmigos(value) {
	if (!Array.isArray(value)) return void 0;
	const ids = [...new Set(value.filter((x) => typeof x === "string" && /^[A-Za-z0-9]{6,128}$/.test(x)))].slice(0, 200);
	return ids.length ? ids : void 0;
}
function cleanEscalones(value) {
	if (!isRecord(value)) return void 0;
	const out = {};
	for (const [slot, e] of Object.entries(value).slice(0, 40)) {
		if (!/^[a-z_]{2,20}$/.test(slot) || !isRecord(e) || typeof e.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(e.id) || typeof e.at !== "number" || !Number.isFinite(e.at)) continue;
		out[slot] = {
			id: e.id,
			at: e.at
		};
	}
	return Object.keys(out).length ? out : void 0;
}
function cleanCandado(value) {
	if (!isRecord(value) || typeof value.llave !== "string" || !/^[A-Za-z0-9]{16,40}$/.test(value.llave)) return void 0;
	const ms = (v) => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 864e13 ? Math.round(v) : void 0;
	const desde = ms(value.desde), hasta = ms(value.hasta);
	const pase = typeof value.pase === "string" && /^(pase|emergencia):[A-Za-z0-9-]{1,60}$/.test(value.pase) ? value.pase : void 0;
	return {
		llave: value.llave,
		...desde ? { desde } : {},
		...hasta ? { hasta } : {},
		...pase ? { pase } : {}
	};
}
function cleanAvisos(value) {
	return isRecord(value) && typeof value.hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.hora) ? { hora: value.hora } : void 0;
}
function cleanTablas(value) {
	if (!isRecord(value)) return void 0;
	const apodo = cleanText(value.apodo, 24);
	return apodo ? {
		apodo,
		avatar: int(value.avatar, 0, 9) ?? 0,
		...typeof value.privada === "boolean" ? { privada: value.privada } : {}
	} : void 0;
}
function cleanSettings(value) {
	const v = isRecord(value) ? value : {};
	const labels = isRecord(v.leverageLabels) ? v.leverageLabels : {};
	const m = isRecord(v.modules) ? v.modules : null;
	return compact({
		modules: m ? {
			reading: m.reading !== false,
			bible: m.bible !== false,
			training: m.training !== false,
			focus: m.focus !== false,
			food: m.food !== false
		} : void 0,
		footballDays: Array.isArray(v.footballDays) ? [...new Set(v.footballDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : DEFAULT_SETTINGS.footballDays,
		weeklyFocusGoal: int(v.weeklyFocusGoal, 0, 10080) ?? DEFAULT_SETTINGS.weeklyFocusGoal,
		restSeconds: int(v.restSeconds, 15, 600) ?? DEFAULT_SETTINGS.restSeconds,
		leverageLabels: Object.fromEntries([
			"1",
			"2",
			"3",
			"4"
		].map((k) => [k, cleanText(labels[k], 160) || DEFAULT_SETTINGS.leverageLabels[k]])),
		distractions: cleanChecklist(v.distractions, DEFAULT_SETTINGS.distractions),
		pendingCue: cleanText(v.pendingCue, 300) || void 0,
		habits: cleanHabitDefs(v.habits),
		age: int(v.age, 8, 99) ?? DEFAULT_SETTINGS.age,
		trainingLevel: int(v.trainingLevel, 1, 4) ?? void 0,
		escalones: cleanEscalones(v.escalones),
		diagnostico: typeof v.diagnostico === "string" && /^\d{4}-\d\d-\d\d$/.test(v.diagnostico) ? v.diagnostico : void 0,
		bibleOrder: v.bibleOrder === "canonico" ? "canonico" : "ruta",
		sleepTarget: num(v.sleepTarget, 6, 12) ?? DEFAULT_SETTINGS.sleepTarget,
		stepsTarget: int(v.stepsTarget, 1e3, 4e4) ?? DEFAULT_SETTINGS.stepsTarget,
		equipment: texts(v.equipment, 20, 20) ?? DEFAULT_SETTINGS.equipment,
		reminders: cleanReminders(v.reminders),
		nutrition: cleanNutrition(v.nutrition),
		habitSuggest: cleanHabitSuggest(v.habitSuggest),
		train: cleanTrain(v.train),
		morningSetup: v.morningSetup === true ? true : void 0,
		walkDaily: v.walkDaily === true ? true : void 0,
		cardioSetup: v.cardioSetup === true ? true : void 0,
		rutina2611: v.rutina2611 === true ? true : void 0,
		rondas2611: v.rondas2611 === true ? true : void 0,
		toques2611: v.toques2611 === true ? true : void 0,
		hspu2611: v.hspu2611 === true ? true : void 0,
		quitar2611: v.quitar2611 === true ? true : void 0,
		devolver2611: v.devolver2611 === true ? true : void 0,
		tablas: cleanTablas(v.tablas),
		amigos: cleanAmigos(v.amigos),
		aprobados: cleanAmigos(v.aprobados),
		candado: cleanCandado(v.candado),
		widget: cleanCandado(v.widget),
		avisos: cleanAvisos(v.avisos),
		despertador: isRecord(v.despertador) ? {
			on: v.despertador.on === true,
			reps: [
				5,
				10,
				15,
				20
			].includes(Number(v.despertador.reps)) ? Number(v.despertador.reps) : 10
		} : void 0,
		modo: v.modo === "competir" ? "competir" : void 0,
		sinEdad: v.sinEdad === true ? true : void 0,
		minLibres: int(v.minLibres, 0, 240),
		sinUsoImportante: v.sinUsoImportante === true ? true : void 0,
		legal: isRecord(v.legal) && typeof v.legal.version === "string" && /^\d{4}-\d\d-\d\d$/.test(v.legal.version) && typeof v.legal.fecha === "string" && v.legal.fecha.length <= 40 ? {
			version: v.legal.version,
			fecha: v.legal.fecha,
			salud: v.legal.salud === true
		} : void 0
	});
}
function dateKey(date = /* @__PURE__ */ new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function makeId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
function activeHabits(settings) {
	return settings.habits.filter((h) => !h.archived);
}
// src/lib/records.ts
/**
* El espacio de Bambú como registros sueltos.
*
* La app trabaja con un objeto grande (AppData) porque es cómodo para pintar pantallas.
* La nube guarda cada lectura, serie o tarea como su propia fila. Este módulo traduce
* entre las dos formas:
*  - diffRecords: qué registros cambiaron entre dos versiones del objeto (por referencia,
*    así que cuesta casi nada aunque haya miles de filas).
*  - applyRecords: mete en el objeto lo que llegó de la nube.
*  - toRecords: el objeto completo como filas (para la primera subida y los respaldos).
*/
var ARRAYS = [
	{
		key: "reading",
		collection: "reading",
		clean: cleanReadingRow
	},
	{
		key: "focus",
		collection: "focus",
		clean: cleanFocusRow
	},
	{
		key: "tasks",
		collection: "task",
		clean: (v) => normalizeTasks([v])[0] ?? null
	},
	{
		key: "bible",
		collection: "bible",
		clean: cleanBibleRow
	},
	{
		key: "works",
		collection: "work",
		clean: cleanWorkRow
	},
	{
		key: "sets",
		collection: "set",
		clean: cleanSetRow
	},
	{
		key: "activities",
		collection: "activity",
		clean: cleanActivityRow
	},
	{
		key: "checkins",
		collection: "checkin",
		clean: cleanCheckinRow
	},
	{
		key: "body",
		collection: "body",
		clean: cleanBodyRow
	},
	{
		key: "exercises",
		collection: "exercise",
		clean: cleanExerciseRow
	},
	{
		key: "meals",
		collection: "meal",
		clean: cleanMealRow
	}
];
var META = [
	"profile",
	"settings",
	"activeFocus",
	"activeReading",
	"activeWorkout"
];
/** Los registros que cambiaron de `prev` a `next`, con la hora del cambio. */
function diffRecords(prev, next, now = Date.now()) {
	const out = [];
	for (const { key, collection } of ARRAYS) {
		const before = prev[key];
		const after = next[key];
		if (before === after) continue;
		const old = new Map(before.map((row) => [row.id, row]));
		const seen = /* @__PURE__ */ new Set();
		for (const row of after) {
			seen.add(row.id);
			if (old.get(row.id) !== row) out.push({
				collection,
				id: row.id,
				payload: row,
				deleted: false,
				clientUpdatedAt: now
			});
		}
		for (const id of old.keys()) if (!seen.has(id)) out.push({
			collection,
			id,
			payload: {},
			deleted: true,
			clientUpdatedAt: now
		});
	}
	if (prev.habits !== next.habits) {
		const days = /* @__PURE__ */ new Set([...Object.keys(prev.habits), ...Object.keys(next.habits)]);
		for (const day of days) {
			if (prev.habits[day] === next.habits[day]) continue;
			const ids = next.habits[day];
			out.push({
				collection: "habit",
				id: day,
				payload: {
					day,
					ids: ids ?? []
				},
				deleted: !ids,
				clientUpdatedAt: now
			});
		}
	}
	for (const key of META) if (prev[key] !== next[key]) out.push({
		collection: "meta",
		id: key,
		payload: { value: next[key] ?? null },
		deleted: false,
		clientUpdatedAt: now
	});
	return out;
}
/** Aplica filas que llegaron de la nube. Devuelve el mismo objeto si nada cambió. */
function applyRecords(data, rows) {
	if (!rows.length) return data;
	let next = data;
	const byCollection = /* @__PURE__ */ new Map();
	rows.forEach((row) => byCollection.set(row.collection, [...byCollection.get(row.collection) ?? [], row]));
	for (const { key, collection, clean } of ARRAYS) {
		const incoming = byCollection.get(collection);
		if (!incoming?.length) continue;
		const map = new Map(next[key].map((row) => [row.id, row]));
		let changed = false;
		for (const row of incoming) {
			if (row.deleted) {
				changed = map.delete(row.id) || changed;
				continue;
			}
			const value = clean({
				...row.payload,
				id: row.id
			});
			if (value) {
				map.set(value.id, value);
				changed = true;
			} else console.warn(`Bambú ignoró un registro inválido: ${collection}/${row.id}`);
		}
		if (changed) next = {
			...next,
			[key]: [...map.values()]
		};
	}
	const habitRows = byCollection.get("habit");
	if (habitRows?.length) {
		const habits = { ...next.habits };
		for (const row of habitRows) {
			if (!isDay(row.id)) continue;
			const ids = row.payload.ids;
			if (row.deleted || !Array.isArray(ids)) delete habits[row.id];
			else habits[row.id] = [...new Set(ids.filter((id) => typeof id === "string"))].slice(0, 30);
		}
		next = {
			...next,
			habits
		};
	}
	for (const row of byCollection.get("meta") ?? []) {
		const value = row.payload.value;
		if (row.id === "profile" && isRecord(value)) next = {
			...next,
			profile: {
				name: String(value.name ?? "").slice(0, 40),
				onboardingComplete: value.onboardingComplete === true,
				north: typeof value.north === "string" && value.north.trim() ? value.north.trim().slice(0, 140) : void 0
			}
		};
		if (row.id === "settings") next = {
			...next,
			settings: cleanSettings(value)
		};
		if (row.id === "activeFocus") next = {
			...next,
			activeFocus: cleanActiveFocus(value)
		};
		if (row.id === "activeReading") next = {
			...next,
			activeReading: cleanActiveReading(value)
		};
		if (row.id === "activeWorkout") next = {
			...next,
			activeWorkout: cleanActiveWorkout(value)
		};
	}
	return next;
}
// src/lib/progress.ts
function shiftDay(day, count) {
	const value = /* @__PURE__ */ new Date(`${day}T12:00:00`);
	value.setDate(value.getDate() + count);
	return dateKey(value);
}
function realReading(row) {
	return (!row.estimated || row.dayConfirmed === true) && (row.minutes > 0 || (row.seconds ?? 0) > 0 || row.source === "codice");
}
function streak(dates, today = dateKey()) {
	const days = [...new Set(dates)].filter((day) => day <= today).sort();
	let best = 0, run = 0;
	days.forEach((day, i) => {
		run = i && shiftDay(days[i - 1], 1) === day ? run + 1 : 1;
		best = Math.max(best, run);
	});
	const set = new Set(days);
	let anchor = set.has(today) ? today : shiftDay(today, -1);
	let current = 0;
	while (set.has(anchor)) {
		current++;
		anchor = shiftDay(anchor, -1);
	}
	return {
		current,
		best,
		total: days.length,
		todayDone: set.has(today),
		days
	};
}
function mealTotals(meal) {
	return meal.items.reduce((t, i) => ({
		kcal: t.kcal + i.kcal,
		protein: t.protein + i.protein
	}), {
		kcal: 0,
		protein: 0
	});
}
function dayTotals(data, day) {
	const meals = data.meals.filter((m) => m.day === day);
	const out = {
		kcal: 0,
		protein: 0,
		meals: meals.length,
		proteinMeals: 0,
		produce: 0,
		sweets: 0
	};
	for (const m of meals) {
		const t = mealTotals(m);
		out.kcal += t.kcal;
		out.protein += t.protein;
		if (t.protein >= 12) out.proteinMeals++;
		for (const i of m.items) {
			if (i.group === "verdura" || i.group === "fruta") out.produce += i.qty;
			if (i.group === "dulce" || i.group === "bebida" && i.protein < 1) out.sweets += i.qty;
		}
	}
	out.protein = Math.round(out.protein);
	out.produce = Math.round(out.produce * 2) / 2;
	return out;
}
/** Comidas con proteína del día: lo registrado manda; si no registraste comidas, vale lo del check-in. */
function proteinMealsOn(data, day) {
	if (data.meals.some((m) => m.day === day)) return dayTotals(data, day).proteinMeals;
	return data.checkins.find((c) => c.day === day)?.proteinMeals;
}
// src/lib/exercises.ts
var MUSCLES = [
	{
		id: "pecho",
		label: "Pecho",
		group: "torso",
		recoveryHours: 48,
		weekly: [4, 10]
	},
	{
		id: "espalda",
		label: "Espalda",
		group: "torso",
		recoveryHours: 48,
		weekly: [6, 14]
	},
	{
		id: "hombros",
		label: "Hombros",
		group: "torso",
		recoveryHours: 48,
		weekly: [4, 10]
	},
	{
		id: "triceps",
		label: "Tríceps",
		group: "torso",
		recoveryHours: 48,
		weekly: [3, 8]
	},
	{
		id: "biceps",
		label: "Bíceps",
		group: "torso",
		recoveryHours: 48,
		weekly: [3, 8]
	},
	{
		id: "cuello",
		label: "Cuello",
		group: "extra",
		recoveryHours: 48,
		weekly: [4, 8]
	},
	{
		id: "antebrazo",
		label: "Antebrazo",
		group: "extra",
		recoveryHours: 36,
		weekly: [4, 8]
	},
	{
		id: "core",
		label: "Abdomen y core",
		group: "extra",
		recoveryHours: 24,
		weekly: [4, 10]
	},
	{
		id: "cuadriceps",
		label: "Cuádriceps",
		group: "pierna",
		recoveryHours: 48,
		weekly: [4, 10]
	},
	{
		id: "gluteos",
		label: "Glúteos",
		group: "pierna",
		recoveryHours: 48,
		weekly: [4, 10]
	},
	{
		id: "isquios",
		label: "Isquios",
		group: "pierna",
		recoveryHours: 48,
		weekly: [3, 8]
	},
	{
		id: "pantorrillas",
		label: "Pantorrillas",
		group: "pierna",
		recoveryHours: 24,
		weekly: [4, 10]
	},
	{
		id: "aductores",
		label: "Aductores (ingle)",
		group: "extra",
		recoveryHours: 48,
		weekly: [1, 4]
	}
];
var J004 = "J004";
var EXERCISES = [
	{
		id: "pushup-wall",
		name: "Lagartija en pared",
		slot: "empuje",
		level: 1,
		mode: "reps",
		range: [12, 20],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5
		},
		equipment: ["pared"],
		cues: [
			"Manos a la altura del pecho, un poco más abiertas que los hombros",
			"Cuerpo en línea de cabeza a talones",
			"Baja hasta que la nariz casi toque la pared"
		],
		mistakes: ["Sacar la cadera", "Bajar solo la cabeza"]
	},
	{
		id: "pushup-incline",
		name: "Lagartija inclinada en silla",
		slot: "empuje",
		level: 2,
		mode: "reps",
		range: [8, 15],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5
		},
		equipment: ["silla"],
		cues: [
			"Silla contra la pared para que no se mueva",
			"Pecho al borde del asiento",
			"Codos a 45 grados del cuerpo, no abiertos en T"
		],
		mistakes: ["Silla suelta", "Cadera caída"]
	},
	{
		id: "pushup-knee",
		name: "Lagartija con rodillas",
		slot: "empuje",
		level: 3,
		mode: "reps",
		range: [8, 15],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5
		},
		equipment: ["nada"],
		cues: [
			"Línea recta de rodillas a cabeza",
			"Pecho al piso, no la frente",
			"Aprieta glúteos y abdomen"
		],
		mistakes: ["Cadera hacia atrás (eso ya no es lagartija)", "Medio rango"]
	},
	{
		id: "pushup",
		name: "Lagartija normal",
		slot: "empuje",
		level: 4,
		mode: "reps",
		range: [8, 15],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5,
			core: .5
		},
		equipment: ["nada"],
		cues: [
			"Manos bajo los hombros, dedos al frente",
			"Baja controlado en 2 segundos",
			"Pecho a un puño del piso, sube explosivo"
		],
		mistakes: [
			"Codos abiertos en T: castiga el hombro",
			"Cadera arriba o caída",
			"Rebotar abajo"
		]
	},
	{
		id: "pushup-parallettes",
		name: "Lagartija en mini paralelas",
		slot: "empuje",
		level: 5,
		mode: "reps",
		range: [8, 15],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5,
			core: .5
		},
		equipment: ["paralelas"],
		cues: [
			"Las paralelas te dejan bajar más: ese rango extra es el estímulo",
			"Baja hasta que el pecho pase las manos, sin dolor de hombro",
			"Muñecas rectas, agarre firme"
		],
		mistakes: ["Bajar más de lo que tu hombro aguanta", "Hombros encogidos a las orejas"],
		caution: "Si el frente del hombro molesta abajo, recorta un poco el rango."
	},
	{
		id: "pushup-diamond",
		name: "Lagartija diamante",
		slot: "empuje",
		level: 6,
		mode: "reps",
		range: [6, 12],
		muscles: {
			triceps: 1,
			pecho: 1,
			hombros: .5
		},
		equipment: ["nada"],
		cues: [
			"Índices y pulgares forman un diamante bajo el pecho",
			"Codos pegados al cuerpo",
			"Más tríceps, menos pecho"
		],
		mistakes: ["Codos hacia afuera"]
	},
	{
		id: "pushup-decline",
		name: "Lagartija declinada (pies en silla)",
		slot: "empuje",
		level: 7,
		mode: "reps",
		range: [6, 12],
		muscles: {
			pecho: 1,
			hombros: 1,
			triceps: .5
		},
		equipment: ["silla"],
		cues: [
			"Pies arriba en la silla, manos en el piso o en las paralelas",
			"Más peso en las manos: más difícil",
			"Mismo cuerpo en tabla"
		],
		mistakes: ["Cadera colgando"]
	},
	{
		id: "pushup-backpack",
		name: "Lagartija con mochila",
		slot: "empuje",
		level: 8,
		mode: "reps",
		range: [6, 12],
		muscles: {
			pecho: 1,
			triceps: .5,
			hombros: .5,
			core: .5
		},
		equipment: ["mochila", "paralelas"],
		cues: [
			"Mochila con libros bien apretada en la espalda alta",
			"Pesa la mochila en la báscula y anota los kilos",
			"Sube los kilos poco a poco"
		],
		mistakes: ["Mochila suelta que se resbala al cuello"]
	},
	{
		id: "pike-hold",
		name: "Pica sostenida",
		slot: "hombro",
		level: 1,
		mode: "seconds",
		range: [20, 40],
		muscles: {
			hombros: 1,
			triceps: .5
		},
		equipment: ["nada"],
		cues: [
			"Desde lagartija, camina con los pies hacia las manos hasta que tu cuerpo sea una V al revés",
			"Brazos estirados, orejas entre los brazos, empuja el piso lejos de ti",
			"Cadera arriba y piernas lo más rectas que puedas; respira tranquilo"
		],
		mistakes: ["Hombros encogidos hacia las orejas", "Espalda redonda por doblar mucho las rodillas"]
	},
	{
		id: "pike-negative",
		name: "Pica negativa (solo bajar)",
		slot: "hombro",
		level: 2,
		mode: "reps",
		range: [4, 8],
		muscles: {
			hombros: 1,
			triceps: .5
		},
		equipment: ["nada"],
		cues: [
			"En posición de pica, baja la cabeza hacia el piso en 4 segundos",
			"Codos hacia atrás, no hacia los lados",
			"Abajo, apoya las rodillas y vuelve a la V sin empujar: solo cuenta la bajada"
		],
		mistakes: ["Caer de golpe en lugar de frenar", "Bajar la frente en lugar de la coronilla"]
	},
	{
		id: "pike",
		name: "Lagartija pica (pike)",
		slot: "hombro",
		level: 3,
		mode: "reps",
		range: [6, 12],
		muscles: {
			hombros: 1,
			triceps: .5
		},
		equipment: ["nada"],
		cues: [
			"Empieza en lagartija y camina con los pies hacia las manos hasta que la cadera quede arriba: tu cuerpo es una V al revés",
			"Manos al ancho de hombros, dedos abiertos, piernas lo más rectas que puedas",
			"Dobla los codos hacia atrás (no hacia los lados) y baja la cabeza a un punto un poco adelante de las manos: manos y cabeza forman un triángulo",
			"Toca el piso con la frente o casi, y empuja el piso lejos hasta estirar los brazos"
		],
		mistakes: [
			"Convertirla en lagartija normal bajando la cadera",
			"Abrir los codos como alas",
			"Bajar la cabeza entre las manos en vez de adelante"
		]
	},
	{
		id: "pike-elevated",
		name: "Pike con pies en silla",
		slot: "hombro",
		level: 4,
		mode: "reps",
		range: [6, 12],
		muscles: {
			hombros: 1,
			triceps: .5
		},
		equipment: ["silla"],
		cues: [
			"Silla pegada a la pared para que no se mueva; pies (o rodillas, más fácil) arriba de la silla",
			"Camina con las manos hacia la silla hasta que la cadera quede casi sobre los hombros",
			"Baja lento, en 2 o 3 segundos, con la cabeza un poco adelante de las manos",
			"Empuja hasta estirar los brazos sin perder la cadera alta"
		],
		mistakes: ["Silla que se resbala", "Manos demasiado lejos de la silla: se vuelve lagartija declinada"]
	},
	{
		id: "pike-parallettes",
		name: "Pike en mini paralelas",
		slot: "hombro",
		level: 5,
		mode: "reps",
		range: [6, 12],
		muscles: {
			hombros: 1,
			triceps: .5
		},
		equipment: ["paralelas", "silla"],
		cues: [
			"Igual que el pike con pies en silla, pero con las manos en las mini paralelas",
			"Como las manos quedan más altas, la cabeza baja más abajo que las manos: ese es el rango extra",
			"Bajada de 3 segundos, codos hacia atrás",
			"Si no llegas abajo con buena técnica, regresa al escalón anterior"
		],
		mistakes: ["Bajar de golpe", "Paralelas que se deslizan: ponlas sobre un tapete"]
	},
	{
		id: "row-backpack",
		name: "Remo inclinado abierto con mochila",
		slot: "jalon",
		level: 1,
		mode: "reps",
		range: [10, 15],
		muscles: {
			espalda: 1,
			hombros: .5,
			biceps: .5
		},
		equipment: ["mochila"],
		cues: [
			"Rodillas un poco dobladas, torso inclinado casi paralelo al piso, espalda recta",
			"Agarra la mochila de las dos asas, manos más abiertas que los hombros",
			"Jala con los codos abiertos hacia afuera y junta los omóplatos arriba 1 segundo",
			"Baja en 2 o 3 segundos"
		],
		mistakes: [
			"Espalda redonda",
			"Subir con impulso de la cadera",
			"Codos pegados: eso ya es otro movimiento"
		]
	},
	{
		id: "row-table",
		name: "Remo bajo mesa",
		slot: "jalon",
		level: 2,
		mode: "reps",
		range: [10, 15],
		muscles: {
			espalda: 1,
			biceps: .5,
			core: .5
		},
		equipment: ["mesa"],
		cues: [
			"Acostado bajo una mesa muy firme, agarra el borde por encima con las manos abiertas",
			"Rodillas dobladas y cuerpo recto de rodillas a cabeza",
			"Sube el pecho al borde apretando la espalda arriba",
			"Baja lento, contando 2 o 3 segundos"
		],
		mistakes: ["Mesa ligera o con patas débiles", "Llegar con la barbilla y no con el pecho"],
		caution: "Solo con una mesa pesada y estable. Pruébala primero sin cargar todo tu peso. Si se levanta, que alguien se siente encima o ponle mucho peso; si se mueve, no."
	},
	{
		id: "row-table-straight",
		name: "Remo bajo mesa con piernas rectas",
		slot: "jalon",
		level: 3,
		mode: "reps",
		range: [8, 15],
		muscles: {
			espalda: 1,
			biceps: .5,
			core: .5
		},
		equipment: ["mesa"],
		cues: [
			"Igual que el remo bajo mesa, pero con las piernas estiradas y los talones en el piso",
			"Cuerpo en tabla: aprieta glúteos para que la cadera no cuelgue",
			"Pecho al borde y bajada de 3 segundos"
		],
		mistakes: ["Cadera caída", "Bajar de golpe"],
		caution: "Misma regla de la mesa: pesada, estable y probada antes."
	},
	{
		id: "row-backpack-1arm",
		name: "Remo a una mano con mochila",
		slot: "jalon_ancho",
		level: 1,
		mode: "reps",
		range: [8, 15],
		muscles: {
			espalda: 1,
			biceps: .5
		},
		equipment: ["mochila", "silla"],
		cues: [
			"Mano y rodilla del mismo lado apoyadas en la silla, espalda plana",
			"Piensa en llevar el codo hacia la cintura, no la mano al pecho",
			"Movimiento de péndulo: el brazo se dobla lo menos posible y no empiezas jalando con el bíceps",
			"Aprieta la espalda arriba 1 segundo y baja lento. Las repeticiones son por lado"
		],
		mistakes: ["Girar el torso para subir", "Doblar todo el brazo: trabaja más el bíceps que la espalda"]
	},
	{
		id: "floor-towel-pull",
		name: "Dominada en el piso con toalla",
		slot: "aduccion",
		level: 1,
		mode: "reps",
		range: [8, 20],
		sets: 1,
		muscles: {
			espalda: 1,
			biceps: .5
		},
		equipment: ["toalla"],
		cues: [
			"Boca abajo en un piso liso, con una toalla debajo de la cadera y las piernas",
			"Brazos estirados al frente y abiertos, palmas apoyadas en el piso",
			"Jala como en una dominada: codos hacia abajo y hacia los lados, y deslízate hacia adelante",
			"Una sola serie al final, al máximo de repeticiones. Para más peso, dobla las piernas y sostén la mochila con los pies"
		],
		mistakes: ["Empujar con los pies en vez de jalar con la espalda", "Hacerla en tapete o alfombra: la toalla no se desliza"]
	},
	{
		id: "pullup-negative",
		name: "Dominada negativa",
		slot: "aduccion",
		level: 2,
		mode: "reps",
		range: [3, 8],
		muscles: {
			espalda: 1,
			biceps: 1,
			antebrazo: .5
		},
		equipment: ["barra"],
		cues: ["Sube con un brinco o una silla, barbilla arriba de la barra", "Baja lo más lento que puedas (3 a 5 segundos)"],
		mistakes: ["Soltarse de golpe abajo"]
	},
	{
		id: "pullup",
		name: "Dominada",
		slot: "aduccion",
		level: 3,
		mode: "reps",
		range: [3, 10],
		muscles: {
			espalda: 1,
			biceps: 1,
			antebrazo: .5
		},
		equipment: ["barra"],
		cues: ["Brazos estirados abajo, barbilla arriba de la barra", "Pecho hacia la barra, sin balancearte"],
		mistakes: ["Medio rango", "Patear para subir"]
	},
	{
		id: "curl-backpack",
		name: "Curl con mochila",
		slot: "biceps",
		level: 1,
		mode: "reps",
		range: [10, 15],
		muscles: {
			biceps: 1,
			antebrazo: .5
		},
		equipment: ["mochila"],
		cues: [
			"Agarra la mochila de las asas con palmas arriba",
			"Codos quietos a los lados",
			"Baja en 2 segundos"
		],
		mistakes: ["Columpiar la espalda"]
	},
	{
		id: "curl-towel",
		name: "Curl isométrico con toalla",
		slot: "biceps",
		level: 1,
		mode: "seconds",
		range: [20, 40],
		muscles: {
			biceps: 1,
			antebrazo: .5
		},
		equipment: ["toalla"],
		cues: [
			"De pie, pisa el centro de una toalla con los dos pies",
			"Agarra una punta con cada mano, palmas hacia arriba",
			"Codos pegados al cuerpo y doblados a 90 grados, como a mitad de un curl",
			"Jala hacia arriba lo más fuerte que puedas sin mover los codos y aguanta respirando"
		],
		mistakes: ["Jalar con la espalda o echarte para atrás", "Separar los codos del cuerpo"]
	},
	{
		id: "neck-curl",
		name: "Curl de cuello (flexión)",
		slot: "cuello_flex",
		level: 1,
		mode: "reps",
		range: [10, 20],
		muscles: { cuello: 1 },
		equipment: ["nada"],
		source: J004,
		cues: [
			"Boca arriba en la cama con la cabeza fuera del borde",
			"Deja caer la cabeza atrás hasta donde tu cuello dé y sube la barbilla al pecho",
			"Primero solo con tu peso; cuando pases de 20, pon libros con una toalla en la frente"
		],
		mistakes: [
			"Ayudarte con los brazos",
			"Hacer un abdominal en vez de mover solo el cuello",
			"Dejar caer el peso"
		],
		caution: "Calienta 1 a 2 minutos con rotaciones suaves. Bajada controlada siempre. Nunca puentes de cuello."
	},
	{
		id: "neck-extension",
		name: "Extensión de cuello boca abajo",
		slot: "cuello_ext",
		level: 1,
		mode: "reps",
		range: [10, 20],
		muscles: { cuello: 1 },
		equipment: ["nada"],
		source: J004,
		cues: [
			"Boca abajo en la cama con la cabeza fuera del borde",
			"Baja la cabeza lo más que puedas y súbela lo más que puedas",
			"Con peso: libros o mochila sobre la nuca con una toalla"
		],
		mistakes: ["Ayudarte con la espalda", "Bajar de golpe"],
		caution: "Las manos solo sostienen el peso, no empujan."
	},
	{
		id: "squat",
		name: "Sentadilla",
		slot: "pierna",
		level: 1,
		mode: "reps",
		range: [12, 20],
		muscles: {
			cuadriceps: 1,
			gluteos: 1
		},
		equipment: ["nada"],
		cues: [
			"Pies al ancho de hombros, puntas un poco afuera",
			"Rodillas siguen la dirección de los pies",
			"Baja hasta que el muslo pase la paralela si tu cuerpo lo permite"
		],
		mistakes: ["Rodillas hacia adentro", "Talones despegados"]
	},
	{
		id: "squat-backpack",
		name: "Sentadilla con mochila",
		slot: "pierna",
		level: 2,
		mode: "reps",
		range: [10, 15],
		muscles: {
			cuadriceps: 1,
			gluteos: 1
		},
		equipment: ["mochila"],
		cues: ["Mochila al frente abrazada contra el pecho (sentadilla copa)", "Torso alto, baja controlado"],
		mistakes: ["Inclinarte de más"]
	},
	{
		id: "lunge",
		name: "Zancada hacia atrás",
		slot: "pierna",
		level: 3,
		mode: "reps",
		range: [8, 12],
		muscles: {
			cuadriceps: 1,
			gluteos: 1,
			isquios: .5
		},
		equipment: ["nada"],
		cues: [
			"Da un paso largo atrás y baja la rodilla casi al piso",
			"Peso en el talón de adelante",
			"Repeticiones por pierna"
		],
		mistakes: ["Rodilla de adelante que se cae hacia adentro"]
	},
	{
		id: "split-squat",
		name: "Sentadilla búlgara",
		slot: "pierna",
		level: 4,
		mode: "reps",
		range: [8, 12],
		muscles: {
			cuadriceps: 1,
			gluteos: 1
		},
		equipment: ["silla"],
		cues: [
			"Empeine de atrás sobre la silla",
			"Baja recto, la rodilla de atrás hacia el piso",
			"Repeticiones por pierna"
		],
		mistakes: ["Pie de adelante muy cerca de la silla"]
	},
	{
		id: "split-squat-backpack",
		name: "Búlgara con mochila",
		slot: "pierna",
		level: 5,
		mode: "reps",
		range: [8, 12],
		muscles: {
			cuadriceps: 1,
			gluteos: 1
		},
		equipment: ["silla", "mochila"],
		cues: ["Igual que la búlgara con la mochila en la espalda o al frente"],
		mistakes: []
	},
	{
		id: "glute-bridge",
		name: "Puente de glúteo",
		slot: "bisagra",
		level: 1,
		mode: "reps",
		range: [12, 20],
		muscles: {
			gluteos: 1,
			isquios: .5
		},
		equipment: ["nada"],
		cues: ["Boca arriba, rodillas dobladas, talones cerca", "Sube la cadera apretando glúteos 1 segundo arriba"],
		mistakes: ["Arquear la espalda baja en vez de usar glúteo"]
	},
	{
		id: "single-bridge",
		name: "Puente a una pierna",
		slot: "bisagra",
		level: 2,
		mode: "reps",
		range: [8, 15],
		muscles: {
			gluteos: 1,
			isquios: .5
		},
		equipment: ["nada"],
		cues: ["Una pierna estirada al aire", "Cadera pareja, no se gira"],
		mistakes: []
	},
	{
		id: "rdl-backpack",
		name: "Peso muerto rumano con mochila",
		slot: "bisagra",
		level: 3,
		mode: "reps",
		range: [10, 15],
		muscles: {
			isquios: 1,
			gluteos: 1,
			espalda: .5
		},
		equipment: ["mochila"],
		cues: [
			"Rodillas apenas dobladas, cadera hacia atrás",
			"Espalda recta, mochila pegada a las piernas",
			"Baja hasta sentir el estiramiento atrás del muslo"
		],
		mistakes: ["Espalda redonda", "Convertirlo en sentadilla"]
	},
	{
		id: "calf-raise",
		name: "Elevación de talones",
		slot: "pantorrilla",
		level: 1,
		mode: "reps",
		range: [12, 25],
		muscles: { pantorrillas: 1 },
		equipment: ["nada"],
		cues: ["En el borde de un escalón para bajar más", "Arriba aguanta 1 segundo, baja lento"],
		mistakes: ["Rebotar"]
	},
	{
		id: "calf-raise-single",
		name: "Talones a una pierna",
		slot: "pantorrilla",
		level: 2,
		mode: "reps",
		range: [10, 20],
		muscles: { pantorrillas: 1 },
		equipment: ["nada"],
		cues: ["Apóyate con una mano en la pared solo para el equilibrio"],
		mistakes: []
	},
	{
		id: "plank",
		name: "Plancha",
		slot: "core",
		level: 1,
		mode: "seconds",
		range: [20, 60],
		muscles: { core: 1 },
		equipment: ["nada"],
		cues: ["Antebrazos bajo hombros, cuerpo en línea", "Aprieta glúteos y mete costillas"],
		mistakes: ["Cadera caída", "Aguantar la respiración"]
	},
	{
		id: "dead-bug",
		name: "Dead bug",
		slot: "core",
		level: 2,
		mode: "reps",
		range: [8, 15],
		muscles: { core: 1 },
		equipment: ["nada"],
		cues: ["Espalda baja pegada al piso todo el tiempo", "Brazo y pierna contrarios bajan lento"],
		mistakes: ["Despegar la espalda"]
	},
	{
		id: "hollow",
		name: "Hollow hold",
		slot: "core",
		level: 3,
		mode: "seconds",
		range: [15, 45],
		muscles: { core: 1 },
		equipment: ["nada"],
		cues: [
			"Boca arriba, pega la espalda baja al piso: no debe caber tu mano debajo",
			"Despega hombros y cabeza, brazos estirados junto a las orejas (más fácil: brazos a los lados)",
			"Despega las piernas rectas y juntas, a un palmo del piso (más fácil: rodillas dobladas)",
			"Forma de plátano y aguanta respirando; si la espalda baja se despega, sube las piernas"
		],
		mistakes: ["Arquear la espalda baja", "Aguantar la respiración"]
	},
	{
		id: "tuck-lsit",
		name: "L-sit recogido en paralelas",
		slot: "core",
		level: 4,
		mode: "seconds",
		range: [10, 30],
		muscles: {
			core: 1,
			triceps: .5,
			hombros: .5
		},
		equipment: ["paralelas"],
		cues: [
			"Siéntate en el piso entre las mini paralelas y agárralas a la altura de la cadera",
			"Brazos completamente rectos: empuja hacia abajo y aleja los hombros de las orejas",
			"Sube las rodillas al pecho y despega la cadera y los pies del piso",
			"Aguanta. Si aún no despegas, empieza con un pie apoyado"
		],
		mistakes: ["Hombros encogidos", "Doblar los codos"]
	},
	{
		id: "wrist-curl",
		name: "Curl de muñeca con libros",
		slot: "antebrazo_flex",
		level: 1,
		mode: "reps",
		range: [12, 20],
		muscles: { antebrazo: 1 },
		equipment: ["libros", "mochila"],
		cues: [
			"Antebrazo apoyado en el muslo, palma arriba",
			"Solo se mueve la muñeca",
			"Mochila o libro sujeto con fuerza"
		],
		mistakes: ["Mover el codo"]
	},
	{
		id: "wrist-extension",
		name: "Extensión de muñeca",
		slot: "antebrazo_ext",
		level: 1,
		mode: "reps",
		range: [12, 20],
		muscles: { antebrazo: 1 },
		equipment: ["libros", "mochila"],
		cues: ["Igual pero palma abajo", "Usa menos peso que en el curl"],
		mistakes: []
	},
	{
		id: "backpack-hold",
		name: "Agarre sosteniendo la mochila",
		slot: "agarre",
		level: 1,
		mode: "seconds",
		range: [20, 45],
		muscles: { antebrazo: 1 },
		equipment: ["mochila"],
		cues: ["De pie, brazo estirado, aprieta el asa", "Camina por la casa si quieres"],
		mistakes: []
	},
	{
		id: "book-pinch",
		name: "Pinza de libros",
		slot: "agarre",
		level: 2,
		mode: "seconds",
		range: [15, 40],
		muscles: { antebrazo: 1 },
		equipment: ["libros"],
		cues: ["Sostén un libro grueso solo con la punta de los dedos y el pulgar"],
		mistakes: []
	},
	{
		id: "copenhagen",
		name: "Copenhagen corto (rodilla en banco)",
		slot: "aductor",
		level: 1,
		mode: "reps",
		range: [4, 12],
		muscles: {
			aductores: 1,
			core: .5
		},
		equipment: ["silla"],
		source: "HAROY",
		cues: [
			"De lado, antebrazo en el piso con el codo bajo el hombro",
			"La pierna de arriba apoyada en la silla desde la rodilla hasta el tobillo",
			"Sube la cadera hasta que el cuerpo quede recto y la pierna de abajo toque la silla por debajo",
			"Baja en 2 o 3 segundos. Las repeticiones son por lado"
		],
		mistakes: ["Dejar caer la cadera hacia atrás", "Rebotar abajo"],
		caution: "Si la ingle duele (no solo cansa), para y prueba otro día con menos repeticiones."
	},
	{
		id: "nordic",
		name: "Nórdico de isquios",
		slot: "nordico",
		level: 1,
		mode: "reps",
		range: [3, 8],
		muscles: {
			isquios: 1,
			gluteos: .5
		},
		equipment: ["nada"],
		source: "NORDIC",
		cues: [
			"De rodillas sobre un cojín, con los talones atorados bajo un sillón o que alguien te sostenga los tobillos",
			"Cuerpo recto de rodillas a cabeza, glúteos apretados",
			"Déjate caer hacia adelante lo más lento que puedas, frenando con los isquios",
			"Cuando ya no aguantes, frena con las manos y empújate de regreso arriba"
		],
		mistakes: ["Doblar la cadera (sentarte hacia atrás)", "Caer de golpe sin frenar"],
		caution: "Los primeros días dejan agujetas fuertes atrás del muslo: empieza con 3 repeticiones lentas. Si te dejan adolorido para jugar, hazlo después del partido en vez de antes."
	},
	{
		id: "wrist-roller",
		name: "Enrollador de muñeca casero",
		slot: "agarre",
		level: 3,
		mode: "reps",
		range: [3, 6],
		muscles: { antebrazo: 1 },
		equipment: ["palo"],
		cues: [
			"Palo de escoba con una cuerda y una botella de agua colgando",
			"Enrolla la cuerda girando las muñecas hasta subir la botella y bájala lento",
			"Cada subida y bajada cuenta como una repetición"
		],
		mistakes: []
	}
];
/** Las dos sesiones del método de Juanma (torso y pierna), adaptadas a casa. */
var TEMPLATES = [{
	id: "torso",
	name: "Torso",
	slots: [
		"empuje",
		"jalon",
		"hombro",
		"jalon_ancho",
		"biceps",
		"aduccion",
		"cuello_flex",
		"cuello_ext"
	]
}, {
	id: "pierna",
	name: "Pierna y core",
	slots: [
		"pierna",
		"bisagra",
		"pantorrilla",
		"core",
		"antebrazo_flex",
		"agarre"
	]
}];
/** Blindaje de futbolista: dos ejercicios con ensayos que bajan lesiones de ingle e isquio. Va en días de fútbol. */
var SHIELD_SLOTS = ["aductor", "nordico"];
var BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
function exercise(id) {
	return BY_ID.get(id);
}
function ladder(slot) {
	return EXERCISES.filter((e) => e.slot === slot).sort((a, b) => a.level - b.level);
}
function nextInLadder(id) {
	const e = exercise(id);
	if (!e) return void 0;
	const up = ladder(e.slot).filter((x) => x.level > e.level);
	return up.find((x) => x.mode === e.mode) ?? up[0];
}
/** El escalón de abajo, para cuando todavía no sale con buena técnica. */
function prevInLadder(id, equipment) {
	const e = exercise(id);
	if (!e) return void 0;
	return ladder(e.slot).filter((x) => x.level < e.level && (!equipment || x.equipment.every((q) => q === "nada" || equipment.includes(q)))).pop();
}
// src/lib/coach.ts
/**
* El coach de entrenamiento. Funciones puras: reciben tus datos y la hora, devuelven qué
* toca. Nada aquí adivina: cada recomendación sale de lo que registraste y de una regla
* escrita (casi todas del método de Juanma, ver juanma.ts).
*/
var HOUR = 36e5;
var DAY = 24 * HOUR;
function shift(day, n) {
	const d = /* @__PURE__ */ new Date(`${day}T12:00:00`);
	d.setDate(d.getDate() + n);
	return dateKey(d);
}
function weekday(day) {
	return (/* @__PURE__ */ new Date(`${day}T12:00:00`)).getDay();
}
function mondayOf(day) {
	return shift(day, -((weekday(day) + 6) % 7));
}
/** Una serie cuenta como dura si quedaron 3 o menos repeticiones en reserva (o no se anotó). */
function isHard(set) {
	return set.rir === void 0 || set.rir <= 3;
}
function setValue(set) {
	return set.reps ?? set.seconds ?? 0;
}
function footballEnd(day) {
	return (/* @__PURE__ */ new Date(`${day}T20:00:00`)).getTime();
}
function muscleStates(data, now = Date.now()) {
	const today = dateKey(new Date(now));
	const weekStart = shift(today, -6);
	const since = shift(today, -10);
	const recent = data.sets.filter((s) => s.day >= since && isHard(s));
	const sore = new Set(data.checkins.find((c) => c.day === today)?.soreness ?? []);
	const football = data.activities.filter((a) => a.kind === "football" && a.day >= shift(today, -3) && a.day <= today);
	return MUSCLES.map((m) => {
		let weekSets = 0;
		let lastAt = null;
		const perDay = /* @__PURE__ */ new Map();
		for (const set of recent) {
			const weight = exercise(set.exercise)?.muscles[m.id] ?? 0;
			if (!weight) continue;
			if (set.day >= weekStart) weekSets += weight;
			if (weight === 1) {
				const entry = perDay.get(set.day) ?? {
					sets: 0,
					failures: 0,
					last: 0
				};
				entry.sets++;
				if (set.rir === 0) entry.failures++;
				entry.last = Math.max(entry.last, set.at);
				perDay.set(set.day, entry);
				lastAt = Math.max(lastAt ?? 0, set.at);
			}
		}
		let readyAt = null;
		let reason = "Sin entrenar en los últimos días.";
		for (const [, entry] of perDay) {
			if (entry.sets < 2) continue;
			const extra = entry.sets >= 6 || entry.failures >= 3 ? 24 : 0;
			const at = entry.last + (m.recoveryHours + extra) * HOUR;
			if (!readyAt || at > readyAt) {
				readyAt = at;
				reason = extra ? "Sesión fuerte: necesita un día más." : "Entrenado hace poco.";
			}
		}
		if (m.group === "pierna") for (const game of football) {
			const at = footballEnd(game.day) + 36 * HOUR;
			if (!readyAt || at > readyAt) {
				readyAt = at;
				reason = "El fútbol ya cargó tus piernas.";
			}
		}
		if (sore.has(m.id)) {
			const at = (/* @__PURE__ */ new Date(`${shift(today, 1)}T08:00:00`)).getTime();
			if (!readyAt || at > readyAt) {
				readyAt = at;
				reason = "Reportaste agujetas hoy.";
			}
		}
		const recovering = readyAt !== null && readyAt > now;
		const idle = !recovering && (lastAt === null || now - lastAt > 5 * DAY);
		return {
			id: m.id,
			label: m.label,
			group: m.group,
			target: m.weekly,
			weekSets: Math.round(weekSets * 10) / 10,
			lastAt,
			readyAt: recovering ? readyAt : null,
			status: recovering ? "recuperando" : idle ? "pendiente" : "listo",
			reason: recovering ? reason : idle ? lastAt ? "Más de 5 días sin estímulo: es prioridad." : "Aún sin registros." : "Recuperado."
		};
	});
}
function readyLabel(at, now = Date.now()) {
	const d = new Date(at);
	const today = dateKey(new Date(now));
	const day = dateKey(d);
	const part = d.getHours() < 12 ? "en la mañana" : d.getHours() < 19 ? "en la tarde" : "en la noche";
	if (day === today) return `hoy ${part}`;
	if (day === shift(today, 1)) return `mañana ${part}`;
	return `el ${new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(d)} ${part}`;
}
/** Las sesiones de un ejercicio, de la más nueva a la más vieja. */
function sessionsOf(data, exerciseId) {
	const byDay = /* @__PURE__ */ new Map();
	data.sets.filter((s) => s.exercise === exerciseId).forEach((s) => byDay.set(s.day, [...byDay.get(s.day) ?? [], s]));
	return [...byDay.entries()].map(([day, sets]) => ({
		day,
		sets: sets.sort((a, b) => a.at - b.at)
	})).sort((a, b) => b.day.localeCompare(a.day));
}
var DEFAULT_START = {
	empuje: "pushup",
	hombro: "pike",
	jalon: "row-backpack",
	jalon_ancho: "row-backpack-1arm",
	aduccion: "floor-towel-pull",
	biceps: "curl-backpack",
	cuello_flex: "neck-curl",
	cuello_ext: "neck-extension",
	pierna: "squat",
	bisagra: "glute-bridge",
	pantorrilla: "calf-raise",
	core: "plank",
	antebrazo_flex: "wrist-curl",
	antebrazo_ext: "wrist-extension",
	agarre: "backpack-hold",
	aductor: "copenhagen",
	nordico: "nordic"
};
function available(ex, equipment) {
	return ex.equipment.every((e) => e === "nada" || equipment.includes(e));
}
/** El escalón en el que estás en un patrón: el último que registraste, o el de arranque. */
function currentForSlot(data, slot) {
	const options = ladder(slot);
	const ids = new Set(options.map((e) => e.id));
	const last = [...data.sets].filter((s) => ids.has(s.exercise)).sort((a, b) => b.at - a.at)[0];
	const elegido = data.settings.escalones?.[slot];
	const ex = elegido && ids.has(elegido.id) ? exercise(elegido.id) : void 0;
	if (ex && (!last || elegido.at > last.at)) return ex;
	if (last) return exercise(last.exercise) ?? options[0];
	const level = data.settings.trainingLevel;
	if (level && LEVELED.includes(slot)) {
		const usable = options.filter((e) => available(e, data.settings.equipment));
		if (usable.length) return usable[Math.round((level - 1) / 3 * (usable.length - 1))];
	}
	return exercise(DEFAULT_START[slot]) ?? options[0];
}
/** Patrones grandes donde el nivel de arranque cambia el ejercicio. Cuello, agarre y antebrazo arrancan siempre en lo más seguro. */
var LEVELED = [
	"empuje",
	"hombro",
	"pierna",
	"bisagra",
	"core",
	"jalon"
];
/** Doble progresión: si todas tus series tocaron el tope del rango, sube; si no, una repetición más. */
function progression(data, ex, plannedSets = 2, today = dateKey()) {
	const sessions = sessionsOf(data, ex.id).filter((s) => s.day < today);
	const [lo, hi] = ex.range;
	const unit = ex.mode === "seconds" ? "s" : "";
	if (!sessions.length) return {
		verdict: "nuevo",
		last: [],
		target: Array(plannedSets).fill(lo),
		message: `Primera vez: busca ${lo} a ${hi}${unit} con buena técnica y anota cuántas salieron.`
	};
	const last = sessions[0].sets.map(setValue);
	const prevTotal = sessions[1]?.sets.map(setValue).reduce((a, b) => a + b, 0);
	const lastTotal = last.reduce((a, b) => a + b, 0);
	const working = last.slice(0, plannedSets);
	const allTop = working.length >= Math.min(plannedSets, 2) && working.every((v) => v >= hi);
	const loaded = sessions[0].sets.some((s) => (s.loadKg ?? 0) > 0);
	if (allTop) {
		const next = nextInLadder(ex.id);
		return {
			verdict: "subir",
			last,
			target: Array(plannedSets).fill(lo),
			next,
			message: next ? `Llegaste al tope (${hi}${unit}) en todas tus series. Sube a ${next.name} y vuelve a ${lo}.` : loaded ? `Tope alcanzado con peso. Súbele 1 o 2 kg a la mochila y vuelve a ${lo}.` : `Tope alcanzado. Métele peso con la mochila o libros y vuelve a ${lo}.`
		};
	}
	const prev = prevInLadder(ex.id, data.settings.equipment);
	if (prev && working.length && Math.max(...working) < Math.ceil(lo / 2)) return {
		verdict: "bajar",
		last,
		target: Array(plannedSets).fill(prev.range[0]),
		prev,
		message: `La vez pasada no llegaste ni a ${Math.ceil(lo / 2)}${unit}. Primero domina ${prev.name}: cuando hagas ${prev.range[1]}${prev.mode === "seconds" ? "s" : ""} en tus series, regresas aquí más fuerte.`
	};
	if (prevTotal && lastTotal < prevTotal * .8) return {
		verdict: "fatiga",
		last,
		target: last.slice(0, plannedSets),
		message: "La última vez saliste 20% abajo de la anterior. Repite esa meta; revisa sueño y comida."
	};
	const target = Array.from({ length: plannedSets }, (_, i) => Math.min(hi, (working[i] ?? working[working.length - 1] ?? lo) + (ex.mode === "seconds" ? 5 : 1)));
	return {
		verdict: "progresando",
		last,
		target,
		message: `Última vez ${last.join(" · ")}${unit}. Hoy busca ${target.join(" · ")}${unit}.`
	};
}
function dayLoad(data, day) {
	return data.sets.filter((s) => s.day === day && isHard(s)).length >= 4 || data.activities.some((a) => a.day === day && a.kind === "football");
}
function sessionKind(sets) {
	const counts = {
		torso: 0,
		pierna: 0
	};
	sets.forEach((s) => {
		const slot = exercise(s.exercise)?.slot;
		if (!slot) return;
		if (TEMPLATES[0].slots.includes(slot)) counts.torso++;
		if (TEMPLATES[1].slots.includes(slot)) counts.pierna++;
	});
	if (!counts.torso && !counts.pierna) return null;
	return counts.torso >= counts.pierna ? "torso" : "pierna";
}
function weekSessions(data, today = dateKey()) {
	const start = mondayOf(today);
	const days = Array.from({ length: 7 }, (_, i) => shift(start, i));
	let torso = 0, pierna = 0;
	days.forEach((day) => {
		const kind = sessionKind(data.sets.filter((s) => s.day === day));
		if (kind === "torso") torso++;
		if (kind === "pierna") pierna++;
	});
	const football = new Set(data.activities.filter((a) => a.kind === "football" && days.includes(a.day)).map((a) => a.day)).size;
	return {
		torso,
		pierna,
		football,
		days
	};
}
function itemsFor(data, template, today) {
	const slots = template === "blindaje" ? SHIELD_SLOTS : TEMPLATES.find((t) => t.id === template).slots;
	const sets = template === "blindaje" ? 1 : 2;
	return slots.map((slot) => {
		let ex = currentForSlot(data, slot);
		if (!available(ex, data.settings.equipment)) ex = ladder(slot).filter((e) => available(e, data.settings.equipment)).pop() ?? ex;
		const n = template === "blindaje" ? sets : ex.sets ?? sets;
		return {
			slot,
			exercise: ex,
			sets: n,
			progression: progression(data, ex, n),
			doneToday: data.sets.filter((s) => s.day === today && s.exercise === ex.id).length
		};
	});
}
function todayPlan(data, now = Date.now()) {
	const today = dateKey(new Date(now));
	const checkin = data.checkins.find((c) => c.day === today) ?? (data.checkins.find((c) => c.day === shift(today, -1))?.pain === "pecho" ? data.checkins.find((c) => c.day === shift(today, -1)) : void 0);
	if (checkin?.pain === "pecho") return {
		kind: "dolor",
		urgent: true,
		title: "Hoy no entrenes.",
		items: [],
		summary: "Reportaste dolor en el pecho. Avísale hoy a tu mamá, papá o un adulto. Si te falta el aire, te mareas o el dolor es fuerte, es urgencia: pide ayuda ya.",
		reasons: [{ text: "El dolor de pecho no es agujeta. Un adulto y un médico deciden cuándo vuelves." }]
	};
	const states = muscleStates(data, now);
	const ready = (group) => states.filter((s) => s.group === group).every((s) => s.status !== "recuperando");
	const week = weekSessions(data, today);
	const footballToday = data.settings.footballDays.includes(weekday(today)) || data.activities.some((a) => a.day === today && a.kind === "football");
	const legTarget = data.settings.footballDays.length >= 3 ? 1 : 2;
	const reasons = [];
	const trainedToday = sessionKind(data.sets.filter((s) => s.day === today));
	if (checkin?.pain) reasons.push({ text: `Reportaste dolor en ${checkin.pain}: salta cualquier ejercicio que lo provoque.` });
	if (trainedToday) return {
		kind: trainedToday,
		title: trainedToday === "torso" ? "Hoy ya entrenaste torso." : "Hoy ya entrenaste pierna.",
		summary: "Termina tus series pendientes o descansa. La recuperación también construye.",
		reasons,
		items: itemsFor(data, trainedToday, today)
	};
	if (footballToday) return {
		kind: "futbol",
		title: "Hoy toca fútbol.",
		items: itemsFor(data, "blindaje", today),
		summary: "El partido es tu sesión de pierna. En tu calentamiento, 5 minutos de blindaje: una serie de Copenhagen por lado y una de nórdico.",
		reasons: [
			...reasons,
			{ text: `Tus piernas ya trabajan en el fútbol. Tu plan incluye ${legTarget === 1 ? "una sesión" : "dos sesiones"} de pierna a la semana.` },
			{
				text: "El Copenhagen bajó 41% los problemas de ingle en futbolistas y el nórdico baja a la mitad las lesiones de isquio.",
				source: "HAROY"
			}
		]
	};
	if ([
		1,
		2,
		3,
		4,
		5
	].every((n) => dayLoad(data, shift(today, -n)))) return {
		kind: "descanso",
		title: "Hoy descansa.",
		items: [],
		summary: `Llevas cinco días seguidos con carga. Camina, estírate y cuida tu meta de ${data.settings.sleepTarget} horas de sueño: el músculo crece cuando descansas.`,
		reasons: [...reasons, {
			text: "Juanma se recupera bien porque hace pocas series y duerme 9 horas.",
			source: "J009"
		}]
	};
	const torsoBehind = 3 - week.torso;
	const legBehind = legTarget - week.pierna;
	const nextFootball = [1, 2].some((n) => data.settings.footballDays.includes(weekday(shift(today, n))));
	const canLegs = ready("pierna") && legBehind > 0 && !data.settings.footballDays.includes(weekday(shift(today, 1)));
	const canTorso = ready("torso") && torsoBehind > 0;
	let kind = null;
	if (canLegs && (!canTorso || legBehind >= torsoBehind)) kind = "pierna";
	else if (canTorso) kind = "torso";
	else if (ready("torso") && torsoBehind <= 0 && legBehind <= 0) kind = null;
	if (!kind) {
		const pending = states.filter((s) => s.status === "recuperando");
		return {
			kind: "descanso",
			title: "Hoy descanso activo.",
			items: [],
			summary: torsoBehind <= 0 && legBehind <= 0 ? "Ya cumpliste las sesiones de la semana. Camina y estírate." : `Tus músculos siguen recuperando${pending[0]?.readyAt ? `: ${pending[0].label.toLowerCase()} listo ${readyLabel(pending[0].readyAt, now)}` : ""}.`,
			reasons: [...reasons, { text: "Entrenar un músculo que no se ha recuperado no lo hace crecer más rápido." }]
		};
	}
	reasons.push({
		text: kind === "torso" ? `Llevas ${week.torso} de 3 sesiones de torso esta semana.` : `Llevas ${week.pierna} de ${legTarget} de pierna esta semana.`,
		source: "J009"
	});
	if (kind === "pierna" && nextFootball) reasons.push({ text: "Hay fútbol pronto: haz las series limpias, sin llegar al fallo en pierna." });
	if (kind === "torso") reasons.push({
		text: "El cuello va con torso: dos series de 10 a 20 en flexión y extensión.",
		source: "J004"
	});
	return {
		kind,
		title: kind === "torso" ? "Hoy toca torso." : "Hoy toca pierna y core.",
		items: itemsFor(data, kind, today),
		reasons,
		summary: "Dos series por ejercicio. La primera a 1 o 2 del fallo; la última hasta que la técnica se rompa."
	};
}
function avg(values) {
	return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
function massPlan(data, today = dateKey()) {
	const weights = data.body.filter((b) => b.weightKg).sort((a, b) => a.day.localeCompare(b.day));
	const inRange = (from, to) => weights.filter((b) => b.day > shift(today, -from) && b.day <= shift(today, -to)).map((b) => b.weightKg);
	const weekAvg = avg(inRange(7, 0));
	const prevAvg = avg(inRange(14, 7));
	const monthAgo = avg(inRange(35, 28));
	const weight = weights[weights.length - 1]?.weightKg ?? null;
	const monthPct = weekAvg && monthAgo ? Math.round((weekAvg / monthAgo - 1) * 1e3) / 10 : null;
	const proteinGrams = weight ? Math.round(weight * 1.6) : null;
	const last7 = data.checkins.filter((c) => c.day > shift(today, -7));
	const mealsAvg = avg([.../* @__PURE__ */ new Set([...last7.map((c) => c.day), ...data.meals.filter((m) => m.day > shift(today, -7) && m.day <= today).map((m) => m.day)])].flatMap((d) => {
		const n = proteinMealsOn(data, d);
		return n === void 0 ? [] : [n];
	}));
	const sleepAvg = avg(last7.flatMap((c) => c.sleepHours === void 0 ? [] : [c.sleepHours]));
	const lastPhotos = [...data.body].filter((b) => b.photos).sort((a, b) => b.day.localeCompare(a.day))[0]?.day ?? null;
	const photosDue = !lastPhotos || lastPhotos <= shift(today, -30);
	let status = "sin-datos";
	let message = "Pésate 3 a 5 mañanas por semana, en ayunas y después del baño. Con dos semanas de datos el coach te dice si vas bien.";
	if (monthPct !== null) {
		if (monthPct < .5) {
			status = "lento";
			message = "Tu promedio casi no se mueve. Agrega una comida o un snack de comida real al día (plátano con crema de cacahuate, vaso de leche, huevos, frijoles con tortilla) y revisa en dos semanas.";
		} else if (monthPct > 2) {
			status = "rapido";
			message = "Subes rápido. Quita primero ultraprocesados y bebidas dulces; la comida real se queda.";
		} else {
			status = "bien";
			message = "Vas al ritmo de un volumen limpio. Sigue igual y entrena duro.";
		}
	} else if (weekAvg && prevAvg) message = `Promedio de esta semana ${weekAvg.toFixed(1)} kg contra ${prevAvg.toFixed(1)} kg la anterior. Con un mes de datos ya hay tendencia.`;
	return {
		weight,
		weekAvg,
		prevAvg,
		monthPct,
		proteinGrams,
		proteinPerMeal: proteinGrams ? Math.round(proteinGrams / 4) : null,
		mealsAvg,
		sleepAvg,
		status,
		message,
		photosDue,
		lastPhotos
	};
}
/**
* La semana de lunes a domingo. Lo pasado dice lo que de verdad pasó; hoy, lo que dice el
* coach; lo que viene es una proyección con las mismas reglas que todayPlan: fútbol en sus
* días, 2 días entre sesiones del mismo grupo y nada de pierna la víspera del partido.
* La proyección cambia en cuanto registras algo: es un mapa, no un contrato.
*/
function weekPlan(data, now = Date.now()) {
	const today = dateKey(new Date(now));
	const start = mondayOf(today);
	const football = (day) => data.settings.footballDays.includes(weekday(day)) || data.activities.some((a) => a.day === day && a.kind === "football");
	const doneOn = (day) => {
		const out = [];
		const kind = sessionKind(data.sets.filter((s) => s.day === day));
		if (kind) out.push(kind);
		if (data.activities.some((a) => a.day === day && a.kind === "football")) out.push("futbol");
		if (!out.length && data.activities.some((a) => a.day === day && a.kind === "rest")) out.push("descanso");
		return out;
	};
	const week = weekSessions(data, today);
	const legTarget = data.settings.footballDays.length >= 3 ? 1 : 2;
	let torsoLeft = 3 - week.torso, legLeft = legTarget - week.pierna;
	let lastTorso = "", lastLeg = "";
	for (let n = 1; n <= 3; n++) {
		const d = shift(today, -n), done = doneOn(d);
		if (!lastTorso && done.includes("torso")) lastTorso = d;
		if (!lastLeg && (done.includes("pierna") || done.includes("futbol"))) lastLeg = d;
	}
	const gap = (from, to) => from ? Math.round(((/* @__PURE__ */ new Date(`${to}T12:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${from}T12:00:00`)).getTime()) / DAY) : 99;
	return Array.from({ length: 7 }, (_, i) => {
		const day = shift(start, i);
		const done = day <= today ? doneOn(day) : [];
		if (day < today) return {
			day,
			past: true,
			isToday: false,
			plan: null,
			done
		};
		let plan;
		if (day === today) {
			plan = todayPlan(data, now).kind;
			if (done.includes("torso")) lastTorso = day;
			else if (plan === "torso") {
				torsoLeft--;
				lastTorso = day;
			}
			if (done.includes("pierna") || plan === "futbol") lastLeg = day;
			else if (plan === "pierna") {
				legLeft--;
				lastLeg = day;
			}
		} else if (football(day)) {
			plan = "futbol";
			lastLeg = day;
		} else {
			const legOk = legLeft > 0 && gap(lastLeg, day) >= 2 && !football(shift(day, 1));
			const torsoOk = torsoLeft > 0 && gap(lastTorso, day) >= 2;
			if (legOk && (!torsoOk || legLeft >= torsoLeft)) {
				plan = "pierna";
				legLeft--;
				lastLeg = day;
			} else if (torsoOk) {
				plan = "torso";
				torsoLeft--;
				lastTorso = day;
			} else plan = "descanso";
		}
		return {
			day,
			past: false,
			isToday: day === today,
			plan,
			done
		};
	});
}
// src/lib/musculoNombre.ts
var GUESS = [
	[/handstand|pike|hombro|parado de cabeza|planche/, "Hombros"],
	[/lagartij|push|fondo|pecho/, "Pecho"],
	[/domin|chin|pull|remo|australian|lever|muscle up|espalda|toalla/, "Espalda"],
	[/sentadill|squat|desplante|zancada|talon|gluteo|wall sit|puente|pierna|nordic/, "Piernas"],
	[/abs|abdom|plancha|hollow|russian|crunch|l sit|dragon|v-up|toes/, "Abdomen"],
	[/bicep|tricep|curl|brazo|antebrazo|colgar/, "Brazos"]
];
var sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function musculoDeNombre(name) {
	const n = sinAcentos(name);
	return GUESS.find(([re]) => re.test(n))?.[1] ?? null;
}
// src/lib/deportes.ts
var TODO = [
	"Pecho",
	"Espalda",
	"Hombros",
	"Brazos",
	"Abdomen",
	"Piernas"
];
var DEPORTES = [
	{
		id: "futbol",
		name: "Fútbol",
		musculos: ["Piernas"]
	},
	{
		id: "basquet",
		name: "Básquet",
		musculos: ["Piernas", "Hombros"]
	},
	{
		id: "voleibol",
		name: "Vóleibol",
		musculos: ["Piernas", "Hombros"]
	},
	{
		id: "americano",
		name: "Fútbol americano",
		musculos: [
			"Piernas",
			"Pecho",
			"Hombros"
		]
	},
	{
		id: "beisbol",
		name: "Béisbol",
		musculos: ["Hombros", "Brazos"]
	},
	{
		id: "rugby",
		name: "Rugby",
		musculos: [
			"Piernas",
			"Pecho",
			"Hombros"
		]
	},
	{
		id: "hockey",
		name: "Hockey",
		musculos: ["Piernas"]
	},
	{
		id: "handball",
		name: "Handball",
		musculos: ["Piernas", "Hombros"]
	},
	{
		id: "escalar",
		name: "Escalar",
		musculos: [
			"Espalda",
			"Brazos",
			"Abdomen"
		]
	},
	{
		id: "nadar",
		name: "Nadar",
		musculos: [
			"Espalda",
			"Hombros",
			"Pecho"
		]
	},
	{
		id: "box",
		name: "Box",
		musculos: [
			"Hombros",
			"Brazos",
			"Abdomen"
		]
	},
	{
		id: "artes",
		name: "Artes marciales",
		musculos: [
			"Piernas",
			"Abdomen",
			"Hombros"
		]
	},
	{
		id: "lucha",
		name: "Lucha o jiu-jitsu",
		musculos: [
			"Espalda",
			"Brazos",
			"Abdomen"
		]
	},
	{
		id: "correr",
		name: "Correr",
		musculos: ["Piernas"]
	},
	{
		id: "bici",
		name: "Bici",
		musculos: ["Piernas"]
	},
	{
		id: "caminar",
		name: "Caminar",
		musculos: ["Piernas"]
	},
	{
		id: "senderismo",
		name: "Senderismo",
		musculos: ["Piernas"]
	},
	{
		id: "tenis",
		name: "Tenis",
		musculos: [
			"Hombros",
			"Brazos",
			"Piernas"
		]
	},
	{
		id: "padel",
		name: "Pádel",
		musculos: [
			"Hombros",
			"Brazos",
			"Piernas"
		]
	},
	{
		id: "frontenis",
		name: "Frontenis",
		musculos: [
			"Hombros",
			"Brazos",
			"Piernas"
		]
	},
	{
		id: "pingpong",
		name: "Ping pong",
		musculos: ["Brazos"]
	},
	{
		id: "badminton",
		name: "Bádminton",
		musculos: ["Hombros", "Piernas"]
	},
	{
		id: "remo",
		name: "Remo",
		musculos: [
			"Espalda",
			"Brazos",
			"Piernas"
		]
	},
	{
		id: "surf",
		name: "Surf",
		musculos: ["Espalda", "Hombros"]
	},
	{
		id: "patinar",
		name: "Patinar o skate",
		musculos: ["Piernas"]
	},
	{
		id: "baile",
		name: "Baile",
		musculos: ["Piernas"]
	},
	{
		id: "yoga",
		name: "Yoga",
		musculos: []
	},
	{
		id: "pilates",
		name: "Pilates",
		musculos: ["Abdomen"]
	},
	{
		id: "crossfit",
		name: "CrossFit",
		musculos: TODO
	},
	{
		id: "pesas",
		name: "Gimnasio con pesas",
		musculos: TODO
	},
	{
		id: "golf",
		name: "Golf",
		musculos: []
	}
];
function deportePorId(id) {
	return DEPORTES.find((d) => d.id === id) ?? null;
}
function carga(minutos, intensidad) {
	return minutos * (intensidad >= 3 ? 2 : intensidad === 2 ? 1.5 : 1);
}
function nivelDe(c) {
	return c >= 120 ? "descanso" : c >= 45 ? "rebaja" : "nada";
}
function nombreDeporte(a) {
	return deportePorId(a.deporte)?.name ?? ((a.note ?? "").replace("Deporte:", "").trim() || "Otro deporte");
}
function deportesOn(data, day) {
	return data.activities.filter((a) => a.day === day && !!a.deporte);
}
function resumen(list) {
	if (!list.length) return null;
	const minutos = list.reduce((m, a) => m + (a.minutes ?? 0), 0);
	const c = list.reduce((m, a) => m + carga(a.minutes ?? 0, a.intensity ?? 2), 0);
	const musculos = [...new Set(list.flatMap((a) => deportePorId(a.deporte)?.musculos ?? []))];
	return {
		nivel: nivelDe(c),
		musculos,
		nombres: list.map(nombreDeporte),
		minutos
	};
}
function ajusteDe(data, day) {
	return resumen(deportesOn(data, day).filter((a) => !a.sinAjuste));
}
function ajustar(rt, aj) {
	if (!aj || aj.nivel === "nada") return rt;
	if (aj.nivel === "descanso") return null;
	const usado = (name) => {
		const m = musculoDeNombre(name);
		return !!m && aj.musculos.includes(m);
	};
	const items = rt.items.filter((i) => i.when || !usado(i.name)).map((i) => !i.when && i.rounds ? {
		...i,
		rounds: Math.min(i.rounds, 2)
	} : i);
	if (!items.some((i) => !i.when)) return null;
	return {
		...rt,
		rounds: Math.min(rt.rounds, 2),
		items
	};
}
// src/lib/rutina.ts
var r = (n, t) => [
	n,
	"reps",
	t
];
var s = (n, t) => [
	n,
	"seconds",
	t
];
function routine(day, title, seeds) {
	return {
		title,
		rounds: 3,
		items: seeds.map(([name, kind, target, extra], i) => ({
			id: `d${day}-${i}`,
			name,
			kind,
			target,
			...extra ?? {}
		}))
	};
}
/** Rutina de inicio (v9): 3 días no seguidos, cuerpo completo, 2 rondas, sin candado. Así entra alguien que nunca ha entrenado. */
var START_A = [
	r("Lagartijas inclinadas", 10),
	r("Sentadillas", 12),
	r("Dominadas australianas", 8),
	r("Puente de glúteo", 12),
	s("Plancha", 30)
];
var START_B = [
	r("Lagartijas en rodillas", 12),
	r("Desplantes", 10),
	r("Dominadas australianas", 8),
	r("Elevaciones de talones", 15),
	s("Plancha lateral", 20),
	r("Jumping jacks", 30)
];
function seedWeek() {
	const start = (day, title, seeds) => ({
		...routine(day, title, seeds),
		rounds: 2
	});
	return {
		deadline: "19:00",
		lock: false,
		restSeconds: 60,
		week: [
			start(0, "Cuerpo completo A", START_A),
			null,
			start(2, "Cuerpo completo B", START_B),
			null,
			start(4, "Cuerpo completo A", START_A),
			null,
			null
		]
	};
}
function weekIndex(day) {
	return ((/* @__PURE__ */ new Date(`${day}T12:00:00`)).getDay() + 6) % 7;
}
function planOf(data) {
	return data.settings.train ?? seedWeek();
}
function routineFor(data, day) {
	if (usesCoach(data)) return coachRoutine(data, day);
	const rt = planOf(data).week[weekIndex(day)];
	return rt && rt.items.length ? ajustar(rt, ajusteDe(data, day)) : null;
}
/**
* Sin rutina propia, el día lo decide el coach original (torso y pierna según tus días de fútbol,
* método de Juanma). Se traduce a una Routine para que Hoy, los anillos, la XP y el widget lo lean igual.
* Cada item se llama con el id del ejercicio porque así guarda las series el coach.
*/
function usesCoach(data) {
	return !data.settings.train;
}
var COACH_TITLE = {
	torso: "Torso",
	pierna: "Pierna"
};
/** Marca de un día futuro del coach: el plan exacto se decide ese día con tus datos. */
var COACH_FUTURE = "plan del coach";
function coachRoutine(data, day, now = Date.now()) {
	const today = dateKey(new Date(now));
	if (day === today) {
		const plan = todayPlan(data, now);
		if (plan.kind !== "torso" && plan.kind !== "pierna") return null;
		return {
			title: COACH_TITLE[plan.kind],
			rounds: 1,
			items: plan.items.map((it, i) => ({
				id: `c${i}`,
				name: it.exercise.id,
				kind: it.exercise.mode,
				target: it.exercise.range[0],
				rounds: it.sets,
				when: "before"
			}))
		};
	}
	if (day < today) return null;
	const kind = weekPlan(data, now).find((w) => w.day === day)?.plan;
	return kind && COACH_TITLE[kind] ? {
		title: COACH_TITLE[kind],
		rounds: 1,
		items: [{
			id: "f0",
			name: COACH_FUTURE,
			kind: "reps",
			target: 0,
			rounds: 1,
			when: "before"
		}]
	} : null;
}
function trainedOn(data, day) {
	return data.sets.some((x) => x.day === day);
}
function minutes(hhmm) {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
}
function lockActive(data, day, clock) {
	const plan = planOf(data);
	if (!plan.lock || !routineFor(data, day) || trainedOn(data, day)) return false;
	return minutes(clock) >= minutes(plan.deadline);
}
function clockOf(now) {
	const d = new Date(now);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// src/lib/text.ts
/** "1 serie", "2 series". Todo conteo visible pasa por aquí: un "1 hábitos" se nota y resta confianza. */
function plural(n, one, many) {
	return `${n} ${n === 1 ? one : many}`;
}
// src/lib/jardin.ts
var WAKE_PREFIX = "Despertar:";
// src/lib/despertador.ts
var DESP_PREFIX = "Despertador:";
var DESP_REPS = [
	5,
	10,
	15,
	20
];
var DESP_DEFAULT = {
	on: false,
	reps: 10
};
function despertadorDe(data) {
	const d = data.settings.despertador;
	const reps = DESP_REPS.find((r) => r === d?.reps) ?? DESP_DEFAULT.reps;
	return {
		on: d?.on === true,
		reps
	};
}
var despertoHoy = (data, day) => data.activities.some((a) => a.day === day && a.kind === "other" && !!a.note?.startsWith("Despertador:"));
/** Guarda que te levantaste con tus lagartijas. También deja tu hora de despertar si no había. */
function logDespertar(data, day, reps, clock) {
	if (despertoHoy(data, day) || !(reps > 0)) return data;
	const n = Math.min(Math.round(reps), 300);
	const woke = data.activities.some((a) => a.day === day && a.kind === "other" && a.note?.startsWith("Despertar:"));
	return {
		...data,
		activities: [
			...data.activities,
			{
				id: `despertador:${day}`,
				day,
				kind: "other",
				note: `${DESP_PREFIX} ${n} lagartijas a las ${clock}`
			},
			...woke ? [] : [{
				id: `wake:${day}`,
				day,
				kind: "other",
				note: `${WAKE_PREFIX} ${clock}`
			}]
		]
	};
}
var mins = (hhmm) => {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
};
/**
* ¿Toca insistir ahora? Devuelve la ranura de 5 min (para que cada aviso tenga su llave) o null.
* Solo dentro de la hora siguiente a tu hora de despertar y si aún no las hiciste.
*/
function ranuraInsistir(data, day, clock) {
	if (!despertadorDe(data).on || despertoHoy(data, day)) return null;
	const desde = mins(clock) - mins(data.settings.reminders.wake);
	if (desde < 0 || desde >= 60) return null;
	return Math.floor(desde / 5);
}
function minutesOf$1(hhmm) {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
}
function hhmm(minutes) {
	const m = (Math.round(minutes) % 1440 + 1440) % 1440;
	return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
/** Hora de acostarse: las horas de sueño meta antes de levantarse (regla de Juanma: 9 h). */
function bedtime(r, sleepTarget) {
	return hhmm(minutesOf$1(r.wake) - sleepTarget * 60);
}
/** El horario del día: a qué minuto suena cada aviso. Los vacíos están apagados. */
function schedule(r, sleepTarget) {
	const out = [];
	if (r.checkin) out.push({
		kind: "checkin",
		at: minutesOf$1(r.checkin)
	});
	if (r.photos) out.push({
		kind: "photos",
		at: minutesOf$1(r.wake)
	});
	if (r.train) out.push({
		kind: "train",
		at: minutesOf$1(r.train)
	});
	if (r.read) out.push({
		kind: "read",
		at: minutesOf$1(r.read)
	});
	out.push({
		kind: "sleep",
		at: minutesOf$1(bedtime(r, sleepTarget)) - 30
	});
	return out.map((x) => ({
		...x,
		at: (x.at % 1440 + 1440) % 1440
	})).sort((a, b) => a.at - b.at);
}
/** Avisos cuya hora ya pasó y siguen dentro de la gracia. */
function dueKinds(r, sleepTarget, now) {
	if (!r.on) return [];
	const d = new Date(now);
	const minute = d.getHours() * 60 + d.getMinutes();
	return schedule(r, sleepTarget).filter((x) => minute >= x.at && minute < x.at + 90).map((x) => x.kind);
}
/** La llave que impide mandar el mismo aviso dos veces: una por día (fotos, una por mes). */
function noteKey(kind, now) {
	const day = dateKey(new Date(now));
	return kind === "photos" ? `photos:${day.slice(0, 7)}` : `${kind}:${day}`;
}
/** El texto del aviso, o null si ya no hace falta (ya lo hiciste o hoy no toca). */
function reminderNote(kind, data, now) {
	const today = dateKey(new Date(now));
	const key = noteKey(kind, now);
	const r = cleanReminders(data.settings.reminders);
	const modules = modulesOf(data.settings);
	if (kind === "read" && !modules.reading) return null;
	if ((kind === "train" || kind === "photos") && !modules.training) return null;
	if (kind === "checkin") {
		if (data.checkins.some((c) => c.day === today)) return null;
		return {
			kind,
			key,
			url: "/?ir=hoy",
			title: "Buenos días, ¿cómo dormiste?",
			body: "Check-in de 20 segundos: sueño, energía y dolor. Con eso el coach arma tu día."
		};
	}
	if (kind === "read") {
		const s = streak(data.reading.filter(realReading).map((x) => x.day), today);
		if (s.todayDone) return null;
		return {
			kind,
			key,
			url: "/?ir=lectura",
			title: s.current ? `Llevas ${plural(s.current, "día", "días")} leyendo` : "Hoy toca leer",
			body: s.current ? "Cinco minutos cuentan. Sigue a tu ritmo." : "Cinco minutos y arrancas racha nueva."
		};
	}
	if (kind === "train" || kind === "trainLate") {
		const rt = routineFor(data, today);
		if (!rt || trainedOn(data, today)) return null;
		const plan = planOf(data);
		if (kind === "trainLate") return plan.lock ? {
			kind,
			key,
			url: "/?ir=entrenar",
			title: "Tus redes ya están bloqueadas",
			body: "Pasó tu hora límite. Toca el piso y haz tu rutina para liberarlas."
		} : null;
		return {
			kind,
			key,
			url: "/?ir=entrenar",
			title: `Hoy toca ${rt.title}`,
			body: plan.lock ? `Toca el piso antes de las ${plan.deadline} o tus redes se bloquean.` : "Toca la etiqueta del piso y arranca."
		};
	}
	if (kind === "sleep") return {
		kind,
		key,
		url: "/?ir=hoy",
		title: "En 30 minutos, a la cama",
		body: `Te levantas a las ${r.wake}. Tu meta es dormir ${data.settings.sleepTarget} horas para descansar.`
	};
	if (!massPlan(data, today).photosDue) return null;
	return {
		kind,
		key,
		url: "/?ir=entrenar",
		title: "Toca foto de progreso",
		body: "Frente, lado y espalda, antes de desayunar. Se quedan en tu teléfono; en Bambú solo marcas que ya."
	};
}
/** Todo lo que toca mandar ahora, ya filtrado por lo que hiciste. */
/**
* Aviso al acabar tu pase de redes (idea de Ricardo, 27-nov, portada de Firebase al cron de Supabase).
* El cron corre cada 5 min, así que llega entre 0 y 5 min después de la hora. `real` es la hora real
* (epoch), no la del reloj de pared del usuario. Si cerraste con Ya terminé, `hasta` ya no existe.
*/
var PASE_VENTANA_MS = 36e4;
function paseNote(data, real) {
	const hasta = data.settings.candado?.hasta;
	if (!hasta || real < hasta || real >= hasta + 36e4) return null;
	return {
		kind: "pase",
		key: `pase:${hasta}`,
		url: "/?candado=redes",
		title: "Se acabó tu tiempo de redes",
		body: "Cierra la app y vuelve a lo tuyo. Si necesitas más, gánalo con la cámara."
	};
}
function dueNotes(data, now, real = now) {
	const r = cleanReminders(data.settings.reminders);
	const kinds = dueKinds(r, data.settings.sleepTarget, now);
	if (r.on) {
		const d = new Date(now), minute = d.getHours() * 60 + d.getMinutes(), at = minutesOf$1(planOf(data).deadline);
		if (minute >= at && minute < at + 90) kinds.push("trainLate");
	}
	const notes = kinds.flatMap((kind) => {
		const note = reminderNote(kind, data, now);
		return note ? [note] : [];
	});
	const d = new Date(now), clock = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	const today = dateKey(d), slot = ranuraInsistir(data, today, clock);
	if (slot !== null) {
		const reps = despertadorDe(data).reps;
		notes.unshift({
			kind: "alarm",
			key: `alarm:${today}:${slot}`,
			url: "/?nfc=despertar",
			title: slot === 0 ? "¡Arriba! Tus lagartijas te esperan" : `Sigues sin tus ${reps} lagartijas`,
			body: slot === 0 ? `Haz ${reps} frente a la cámara y se apaga.` : `Te vuelvo a avisar en 5 minutos. ${reps} lagartijas y se acaba.`
		});
	}
	const pase = paseNote(data, real);
	if (pase) notes.unshift(pase);
	return notes;
}
function testNote() {
	return {
		kind: "checkin",
		key: "test",
		url: "/?ir=ajustes",
		title: "Bambú ya te puede avisar",
		body: "Así se ven tus recordatorios. Puedes cambiar las horas en Ajustes."
	};
}
// src/lib/pause.ts
/**
* Pausa antes de las apps (estilo Opal, sin app nativa).
*
* Cómo funciona: una automatización de Atajos de iOS ("Al abrir Instagram") abre este enlace en
* Safari con tu llave, igual que una etiqueta NFC. Bambú te para unos segundos, te pregunta a qué
* venías y anota el resultado en tu cuenta. Si eliges entrar, el botón corre el atajo "Bambú Pase",
* que guarda la hora de vencimiento y abre la app: mientras el pase sigue vivo, la automatización
* no vuelve a frenarte (así no hay ciclo infinito).
*
* Se guarda como actividad 'other' con nota "Pausa: ...", igual que el rescate: no cambia la forma
* de ningún registro.
*/
var PAUSE_PREFIX = "Pausa:";
var PAUSE_APPS = [
	{
		id: "youtube",
		name: "YouTube",
		scheme: "youtube://"
	},
	{
		id: "instagram",
		name: "Instagram",
		scheme: "instagram://"
	},
	{
		id: "tiktok",
		name: "TikTok",
		scheme: "snssdk1233://"
	},
	{
		id: "x",
		name: "X",
		scheme: "twitter://"
	},
	{
		id: "whatsapp",
		name: "WhatsApp",
		scheme: "whatsapp://"
	},
	{
		id: "snapchat",
		name: "Snapchat",
		scheme: "snapchat://"
	},
	{
		id: "juegos",
		name: "tus juegos",
		scheme: ""
	}
];
var PASS_MINUTES = [
	5,
	10,
	15
];
function pauseApp(id) {
	return PAUSE_APPS.find((a) => a.id === id) ?? {
		id: "otra",
		name: "esa app",
		scheme: ""
	};
}
/** `o=r` resististe, `o=p10` pase de 10 minutos. Cualquier otra cosa no anota nada. */
function parseOutcome(o) {
	if (o === "r") return { kind: "resistida" };
	const m = /^p(\d{1,2})$/.exec(o ?? "");
	const minutes = m ? Number(m[1]) : 0;
	return PASS_MINUTES.includes(minutes) ? {
		kind: "pase",
		minutes
	} : void 0;
}
function pauseNote(app, outcome) {
	return `${PAUSE_PREFIX} ${app.id} · ${outcome.kind === "resistida" ? "resistida" : `pase ${outcome.minutes} min`}`;
}
function pauseActivity(day, app, outcome) {
	return {
		id: `pause:${makeId()}`,
		day,
		kind: "other",
		note: pauseNote(app, outcome)
	};
}
function pauseStats(data, day) {
	const rows = data.activities.filter((a) => a.day === day && a.kind === "other" && a.note?.startsWith("Pausa:"));
	return {
		total: rows.length,
		resisted: rows.filter((a) => a.note?.endsWith("resistida")).length
	};
}
// src/lib/nfc.ts
/**
* Etiquetas NFC. Cada etiqueta guarda solo un enlace (sin cuenta ni contraseña). Al
* acercar el teléfono, el sistema abre el enlace y Bambú decide qué hacer según tu estado:
* si no hay sesión la empieza, si hay una abierta la cierra. Así una sola etiqueta sirve
* para el inicio y el final.
*/
function parseNfc(search) {
	const params = new URLSearchParams(search);
	if (params.get("quick") === "read") return { tag: "reading" };
	const tag = params.get("nfc");
	if (tag === "pause") {
		const app = (params.get("app") ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
		const outcome = parseOutcome(params.get("o"));
		return {
			tag: "pause",
			app: app || "otra",
			...outcome ? { outcome } : {}
		};
	}
	if (tag === "habit") {
		const habit = (params.get("h") ?? "").slice(0, 40);
		return habit ? {
			tag: "habit",
			habit
		} : null;
	}
	return tag && [
		"reading",
		"training",
		"focus",
		"checkin",
		"weigh",
		"night",
		"cama",
		"estirar",
		"despertar"
	].includes(tag) ? { tag } : null;
}
function gave(capacity, given) {
	return given >= capacity - 5;
}
function verdict(capacity, given) {
	if (given > capacity + 10) return {
		kind: "mas",
		text: "Diste más de lo que traías. Cuidaste mucho el día: mañana protege tu descanso."
	};
	if (gave(capacity, given)) return {
		kind: "todo",
		text: capacity <= 40 ? `Traías ${capacity}% y lo diste. Eso vale tanto como un día de cien.` : "Diste lo que traías. Duerme tranquilo."
	};
	return {
		kind: "parte",
		text: `Diste ${given}% de los ${capacity}% que traías. Sin culpa: mañana se mide con la medida de mañana.`
	};
}
// src/lib/stretch.ts
/**
* Estiramiento diario: al despertar (movilidad suave, unos 5 min) y antes de dormir (posturas
* sostenidas). Dosis conservadora adaptada de ACSM: 20 s, dos vueltas, sin dolor.
* La movilidad previa no sustituye el calentamiento completo del equipo.
*
* Se guarda como actividad 'other' con la nota "Estiramiento: noche" (igual que el rescate), así
* que no cambia la forma de ningún registro y los teléfonos viejos y el servidor lo conservan.
*/
var STRETCH_PREFIX = "Estiramiento";
var WHEN_NOTE = {
	manana: "mañana",
	noche: "noche"
};
function stretchRow(when, seconds, day = dateKey()) {
	return {
		id: makeId(),
		day,
		kind: "other",
		minutes: Math.max(1, Math.round(seconds / 60)),
		note: `${STRETCH_PREFIX}: ${WHEN_NOTE[when]}`
	};
}
/** Guarda un estiramiento y tacha el hábito Estiramiento si lo tienes. Lo usan la app y la etiqueta. */
function logStretch(data, when, seconds, day = dateKey(), row = stretchRow(when, seconds, day)) {
	const habit = activeHabits(data.settings).find((h) => h.id === "stretch");
	const marked = (data.habits[day] ?? []).includes("stretch");
	return {
		...data,
		activities: [...data.activities, row],
		habits: habit && !marked ? {
			...data.habits,
			[day]: [...data.habits[day] ?? [], "stretch"]
		} : data.habits
	};
}
// src/lib/nfcActions.ts
/**
* Lo que hace una etiqueta NFC cuando NO hay sesión en el navegador.
*
* Por qué existe: en iPhone una etiqueta solo puede abrir Safari, nunca la app instalada, y
* Safari tiene su propia sesión (en modo privado, ninguna). Así que la etiqueta lleva una llave
* tuya y el servidor hace la acción directo en tu cuenta; la app instalada la ve al sincronizar.
*
* Analogía: el control de la cochera. No necesitas entrar a la casa para abrir el portón: el
* control ya trae su código. Si lo pierdes, cambias el código (rotar la llave en Ajustes).
*
* Función pura: recibe tus datos y devuelve los datos nuevos y el mensaje. La usa la función
* bambu-nfc (empaquetada en core.js) y las pruebas.
*/
var BED_HABIT = {
	id: "cama",
	label: "Tender la cama",
	mark: "T"
};
function minutesOf(hhmm) {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
}
function bedAction(data, day, clock) {
	const habits = data.settings.habits;
	const existing = habits.find((h) => !h.archived && (h.id === BED_HABIT.id || /cama/i.test(h.label)));
	const habit = existing ?? BED_HABIT;
	const settings = existing ? data.settings : {
		...data.settings,
		habits: [BED_HABIT, ...habits.filter((h) => h.id !== BED_HABIT.id)]
	};
	const marked = (data.habits[day] ?? []).includes(habit.id);
	const woke = data.activities.some((a) => a.day === day && a.kind === "other" && a.note?.startsWith("Despertar:"));
	if (marked && woke) return {
		next: data,
		title: "Tu cama ya estaba",
		text: "Ya la habías tachado hoy."
	};
	const next = {
		...data,
		settings,
		habits: marked ? data.habits : {
			...data.habits,
			[day]: [...data.habits[day] ?? [], habit.id]
		},
		activities: woke ? data.activities : [...data.activities, {
			id: `wake:${day}`,
			day,
			kind: "other",
			note: `${WAKE_PREFIX} ${clock}`
		}]
	};
	const goal = data.settings.reminders.wake;
	const diff = minutesOf(clock) - minutesOf(goal);
	const late = diff >= 60 ? `${Math.floor(diff / 60)} h${diff % 60 ? ` ${diff % 60} min` : ""}` : `${diff} min`;
	const text = diff <= 0 ? `A tiempo. Tu meta era ${goal}.` : `${late} después de tu meta de ${goal}.`;
	return {
		next,
		title: `Cama tendida a las ${clock}`,
		text
	};
}
function trainingAction(data, now, day) {
	const w = data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : null;
	if (w && now - w.startedAt < SAME_TOUCH) return {
		next: data,
		title: "Tu rutina ya empezó",
		text: "Vuelve a tocar el piso al terminar."
	};
	if (w) {
		const sets = data.sets.filter((s) => s.day === day).length;
		const min = Math.round((now - w.startedAt) / 6e4);
		if (!sets) return {
			next: {
				...data,
				activeWorkout: null
			},
			title: "Cerrada sin series",
			text: "No registraste ninguna serie, así que hoy no cuenta como entreno."
		};
		return {
			next: {
				...data,
				activeWorkout: null
			},
			title: `Rutina cerrada: ${sets} ${sets === 1 ? "serie" : "series"}`,
			text: `${min} min. Buen trabajo.`
		};
	}
	const rt = routineFor(data, day);
	return {
		next: {
			...data,
			activeWorkout: { startedAt: now }
		},
		open: true,
		title: rt ? `Hoy: ${rt.title}` : "Rutina iniciada",
		text: "Abre Bambú desde el ícono y registra cada serie."
	};
}
/** iPhone a veces lee la etiqueta dos veces seguidas: lo de menos de 8 s se toma como el mismo toque. */
var SAME_TOUCH = 8e3;
function nfcServerAction(data, action, now, day, clock = clockOf(now)) {
	if (action.tag === "cama") return bedAction(data, day, clock);
	if (action.tag === "despertar") {
		if (despertoHoy(data, day)) return {
			next: data,
			title: "Ya te levantaste",
			text: "Tus lagartijas de hoy ya estaban."
		};
		const meta = despertadorDe(data).reps, hechas = Math.round(action.wake?.reps ?? 0);
		if (hechas < meta) return {
			next: data,
			title: "Todavía no",
			text: `Te faltan ${meta - Math.max(0, hechas)} lagartijas para apagarla.`
		};
		return {
			next: logDespertar(data, day, hechas, clock),
			title: `¡Arriba! ${hechas} lagartijas`,
			text: `A las ${clock}. Ya ganaste tu primer round del día.`
		};
	}
	if (action.tag === "estirar") {
		const s = action.stretch;
		if (!s || !(s.seconds >= 60)) return {
			next: data,
			title: "Estiramiento sin guardar",
			text: "Para que cuente, estira al menos un minuto."
		};
		const min = Math.round(Math.min(s.seconds, 1800) / 60);
		return {
			next: logStretch(data, s.when, Math.min(s.seconds, 1800), day),
			title: "Estiramiento guardado",
			text: `${min} min. Tu cuerpo te lo agradece.`
		};
	}
	if (action.tag === "reading") {
		const s = data.activeReading;
		if (s && s.endedAt) return {
			next: data,
			open: true,
			title: "Tu lectura está detenida",
			text: "Abre Bambú desde el ícono para completar los detalles de tu lectura."
		};
		if (s) {
			if (now - s.startedAt < SAME_TOUCH) return {
				next: data,
				title: "Tu lectura ya empezó",
				text: "Vuelve a tocar la etiqueta cuando termines."
			};
			const done = finishReading(s, now);
			const min = Math.max(1, Math.round(readingSeconds(done, now) / 60));
			return {
				next: {
					...data,
					activeReading: done,
					reading: data.reading.some((r) => r.id === done.id) ? data.reading : [...data.reading, {
						id: done.id,
						day: done.day,
						minutes: Math.floor(readingSeconds(done, now) / 60),
						seconds: readingSeconds(done, now),
						title: done.title || "Lectura",
						note: done.note || "",
						captureMode: "timer",
						source: "bambu"
					}]
				},
				open: true,
				title: `Lectura guardada: ${min} min`,
				text: "Tu tiempo ya está registrado. Abre Bambú para añadir los capítulos y tu idea."
			};
		}
		return {
			next: {
				...data,
				activeReading: {
					id: `reading:${makeId()}`,
					day,
					startedAt: now,
					title: "",
					location: ""
				}
			},
			title: "Lectura iniciada",
			text: "El cronómetro ya corre. Toca otra vez la etiqueta al terminar."
		};
	}
	if (action.tag === "training") return trainingAction(data, now, day);
	if (action.tag === "night") {
		const n = action.night;
		if (!n) return {
			next: data,
			open: true,
			title: "Tu reflexión de la noche",
			text: "Ábrela desde el ícono de Bambú, en Más, Noche."
		};
		const capacity = Math.max(0, Math.min(100, Math.round(n.capacity))), given = Math.max(0, Math.min(100, Math.round(n.given)));
		const row = data.checkins.find((c) => c.day === day) ?? {
			id: day,
			day
		};
		const reflection = n.reflection?.trim().slice(0, 600) || void 0;
		return {
			next: {
				...data,
				checkins: [...data.checkins.filter((c) => c.day !== day), {
					...row,
					id: day,
					day,
					capacity,
					given,
					...reflection ? { reflection } : {}
				}]
			},
			title: `Noche registrada: ${given}% de ${capacity}%`,
			text: verdict(capacity, given).text
		};
	}
	if (action.tag === "pause") {
		const app = pauseApp(action.app), outcome = action.outcome;
		if (!outcome) return {
			next: data,
			title: "Pausa",
			text: `Antes de ${app.name}, respira.`,
			locked: lockActive(data, day, clock)
		};
		if (outcome.kind === "pase" && lockActive(data, day, clock)) return {
			next: data,
			locked: true,
			title: "Primero entrena",
			text: `Ya pasó tu hora límite y no has tocado el piso. Haz tu rutina y ${app.name} se abre solo.`
		};
		const next = {
			...data,
			activities: [...data.activities, pauseActivity(day, app, outcome)]
		};
		const s = pauseStats(next, day);
		const tally = `Hoy: ${s.resisted} de ${s.total} ${s.total === 1 ? "vez" : "veces"} elegiste otra cosa.`;
		return outcome.kind === "resistida" ? {
			next,
			title: "Elegiste tu vida real",
			text: `${tally} Tu yo de la noche te lo agradece.`
		} : {
			next,
			title: `Pase de ${outcome.minutes} min`,
			text: `${tally} Entra con intención y sal cuando acabes.`
		};
	}
	if (action.tag === "habit") {
		const habit = activeHabits(data.settings).find((h) => h.id === action.habit);
		if (!habit) return {
			next: data,
			title: "Hábito no encontrado",
			text: "Esa etiqueta apunta a un hábito que ya no existe. Grábala de nuevo desde Ajustes."
		};
		if ((data.habits[day] ?? []).includes(habit.id)) return {
			next: data,
			title: `${habit.label}: ya estaba`,
			text: "Ya lo habías marcado hoy."
		};
		return {
			next: {
				...data,
				habits: {
					...data.habits,
					[day]: [...data.habits[day] ?? [], habit.id]
				}
			},
			title: `Hecho: ${habit.label}`,
			text: "Marcado en tu día."
		};
	}
	return {
		next: data,
		open: true,
		title: "Abre Bambú desde el ícono",
		text: `Para ${action.tag === "focus" ? "preparar tu bloque" : action.tag === "checkin" ? "tu check-in de la mañana" : "registrar tu peso"} necesitas la app.`
	};
}
export { EMPTY_DATA, PASE_VENTANA_MS, applyRecords, cleanSettings, diffRecords, dueKinds, dueNotes, nfcServerAction, parseNfc, testNote };
