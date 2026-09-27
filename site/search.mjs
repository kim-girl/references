export function search(videos, categories, query = '', selectedCategories = [], selectedTags = []) {
  const names = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return videos.flatMap(video => {
    if (selectedCategories.length && !video.categories.some(c => selectedCategories.includes(c))) return [];
    if (selectedTags.length && !video.tags.some(t => selectedTags.includes(t))) return [];
    const fields = [video.title, video.tags.join(' '), video.summary, video.description,
      video.categories.map(c => names[c]).join(' '), video.transcript?.text,
      ...(video.scenes || []).map(s => s.description), video.note].filter(Boolean);
    const normalized = fields.map(f => f.normalize('NFKC').toLocaleLowerCase());
    if (!words.every(w => normalized.some(f => f.includes(w)))) return [];
    const title = video.title.normalize('NFKC').toLocaleLowerCase();
    const tags = video.tags.join(' ').normalize('NFKC').toLocaleLowerCase();
    const score = words.reduce((sum, w) => sum + (title.includes(w) ? 10 : 0) + (tags.includes(w) ? 6 : 0), 0);
    const match = words.length ? fields.find((f, i) => normalized[i].includes(words[0])) : '';
    return [{video, score, match}];
  }).sort((a,b) => b.score - a.score || Date.parse(b.video.addedAt) - Date.parse(a.video.addedAt));
}
