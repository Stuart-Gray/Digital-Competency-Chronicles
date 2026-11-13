// The teacher's class lists. Kept in this browser only (localStorage), like the game's saves:
// no account, nothing sent anywhere. A backup file moves a class to another device.
//
// {
//   v: 1, lang, current: classId,
//   classes: [{ id, name, sample, students: [{ id, sid, name, initial, tier,
//       snapshots: [{ date: 'YYYY-MM-DD' (last played), added: ISO time, code, data: summary }] }] }]
// }

const KEY = 'dcc.teacher.v1';
const memory = { raw: null };

function read() {
  try { return JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { return memory.raw ? JSON.parse(memory.raw) : null; }
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function load() {
  const data = read();
  if (data && data.v === 1 && Array.isArray(data.classes)) return data;
  return { v: 1, lang: null, current: null, classes: [] };
}

/** Returns false when the browser would not keep it (private window, storage blocked). */
export function persist(data) {
  const raw = JSON.stringify(data);
  memory.raw = raw;
  try { window.localStorage.setItem(KEY, raw); return true; } catch (e) { return false; }
}

export function addClass(data, name, extra = {}) {
  const c = { id: uid(), name, students: [], ...extra };
  data.classes.push(c);
  data.current = c.id;
  return c;
}

export function currentClass(data) {
  return data.classes.find((c) => c.id === data.current) || data.classes[0] || null;
}

export function removeClass(data, id) {
  data.classes = data.classes.filter((c) => c.id !== id);
  if (data.current === id) data.current = data.classes[0] ? data.classes[0].id : null;
}

/** The newest snapshot of a student (snapshots are kept oldest first). */
export const latest = (student) => student.snapshots[student.snapshots.length - 1];

export function displayName(student, fallback) {
  const base = student.name || fallback;
  return student.initial ? `${base} ${student.initial}.` : base;
}

/**
 * Adds one decoded code (a summary from progress.decode, with its code) to a class.
 * Returns { status: 'new' | 'updated' | 'same', student }.
 * The same save shared again later becomes a new snapshot, so growth over time shows.
 */
export function addSnapshot(cls, summary, code, now = new Date().toISOString()) {
  let student = summary.sid ? cls.students.find((s) => s.sid === summary.sid && s.name === summary.name) : null;
  // Saves made before progress codes existed have no id: match on first name and cycle.
  if (!student && !summary.sid) student = cls.students.find((s) => !s.sid && s.name === summary.name && s.tier === summary.tier);
  const snap = { date: summary.date, added: now, code, data: summary };
  if (!student) {
    student = { id: uid(), sid: summary.sid || 0, name: summary.name, initial: '', tier: summary.tier, snapshots: [snap] };
    cls.students.push(student);
    return { status: 'new', student };
  }
  if (student.snapshots.some((s) => s.code === code)) return { status: 'same', student };
  // One snapshot per day played: a second code from the same day replaces the first.
  student.snapshots = student.snapshots.filter((s) => s.date !== summary.date);
  student.snapshots.push(snap);
  student.snapshots.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.added < b.added ? -1 : 1));
  student.tier = latest(student).data.tier;
  return { status: 'updated', student };
}

export function removeStudent(cls, id) {
  cls.students = cls.students.filter((s) => s.id !== id);
}

/** Letters only, one or two, shown as "Sam B." Typed by the teacher; never stored in the game. */
export function cleanInitial(raw) {
  return (raw || '').normalize('NFC').replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase();
}
