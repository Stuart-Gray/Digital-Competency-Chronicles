// The names of the content files in /content (without ".json").
// Kept apart from content.js so the teacher dashboard can read the list without loading the game.

/** Loaded by the game. */
export const CONTENT_FILES = ['ui', 'hub', 'area2', 'music', 'avatar', 'teacher', 'progress', 'framework'];

/** Loaded by the teacher dashboard (teacher.html): everything except the music and the avatar parts. */
export const DASHBOARD_FILES = CONTENT_FILES.filter((n) => n !== 'music' && n !== 'avatar');
