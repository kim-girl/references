import {readFile, readdir, mkdir, writeFile, cp, rm, access} from 'node:fs/promises';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const categories = await read('content/categories.json');
const tags = await read('content/tags.json');
const files = (await readdir('content/videos')).filter(f => f.endsWith('.json'));
const videos = await Promise.all(files.map(f => read(`content/videos/${f}`)));
const names = Object.fromEntries(categories.map(c => [c.id,c.name]));
const ids = new Set(), urls = new Set();
for (const v of videos) {
  for (const field of ['id','url','title','summary','description','addedAt']) if (typeof v[field] !== 'string' || !v[field].trim()) throw Error(`${v.id}: ${field} is required`);
  if (!/^[a-zA-Z0-9_-]+$/.test(v.id)) throw Error('Invalid ID');
  if (!['https:', 'http:'].includes(new URL(v.url).protocol)) throw Error('Invalid URL');
  if (ids.has(v.id) || urls.has(v.url)) throw Error(`Duplicate video: ${v.id}`);
  ids.add(v.id); urls.add(v.url);
  if (!Array.isArray(v.categories) || !v.categories.length || v.categories.some(c => !Object.hasOwn(names,c))) throw Error(`${v.id}: invalid categories`);
  v.tags ??= [];
  if (!Array.isArray(v.tags) || v.tags.some(t => !tags.includes(t))) throw Error(`${v.id}: unknown tag`);
  if (!Number.isFinite(Date.parse(v.addedAt))) throw Error(`${v.id}: invalid date`);
  if (v.durationSeconds != null && (typeof v.durationSeconds !== 'number' || !Number.isFinite(v.durationSeconds) || v.durationSeconds < 0)) throw Error(`${v.id}: invalid duration`);
  if (v.embed && (v.embed.provider !== 'youtube' || !/^[\w-]{11}$/.test(v.embed.id))) throw Error(`${v.id}: unsupported embed`);
  for (const image of [v.thumbnail, ...(v.scenes || []).map(s => s.image)].filter(Boolean)) {
    if (!/^media\/[\w./-]+$/.test(image) || image.includes('..')) throw Error('Invalid media path');
    await access(`content/${image}`);
  }
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFormat = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
const pills = v => v.categories.map(c => `<span class="pill">${esc(names[c])}</span>`).join('') + `<span class="collected-date">수집 날짜 · <time datetime="${esc(v.addedAt)}">${dateFormat.format(new Date(v.addedAt))}</time></span>`;
const image = (v, prefix) => v.thumbnail ? `<img src="${prefix}${esc(v.thumbnail)}" alt="${esc(v.title)}" loading="lazy">` : `<div class="paper-preview" aria-hidden="true"><span>${v.platform === 'YouTube' ? '▷' : '✳'}</span><b>${esc(v.categories.map(c => names[c]).join(' · '))}</b><small>${esc(v.platform)} · 약 ${esc(v.durationSeconds ?? '?')}초</small></div>`;
const page = (title, body, prefix = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · 영감 서랍</title><link rel="stylesheet" href="${prefix}style.css"></head><body><header><a class="brand" href="${prefix}index.html"><span>✳</span> 영감 서랍</a><span class="header-note">다시 보고 싶은 순간들</span></header><main>${body}</main><footer>차곡차곡 모아 두는 영상 레퍼런스 <span>✿</span></footer></body></html>`;
videos.sort((a,b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
const filters = (list, type) => list.map(c => `<button type="button" data-filter="${type}" data-value="${esc(c.id ?? c)}" aria-pressed="false">${esc(c.name ?? c)}</button>`).join('');
const cards = videos.map(v => `<article class="card" data-id="${esc(v.id)}"><a class="card-link" href="videos/${esc(v.id)}.html">${image(v,'')}<div class="card-body"><div class="eyebrow">${esc(v.platform)}${v.creator ? ` · ${esc(v.creator)}` : ''}</div><h2>${esc(v.title)}</h2><p>${esc(v.summary)}</p><div class="pills">${pills(v)}</div><div class="tags">${v.tags.map(t => `#${esc(t)}`).join(' ')}</div><p class="match"></p></div></a></article>`).join('');
await rm('dist', {recursive:true,force:true});
await mkdir('dist/videos', {recursive:true});
await cp('site','dist',{recursive:true});
try { await cp('content/media','dist/media',{recursive:true}); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await writeFile('dist/index.html',page('모든 레퍼런스',`<section class="intro"><div><p class="eyebrow">나의 작은 레퍼런스 모음</p><h1>좋은 장면은<br>다시 꺼내 보기.</h1><p>연출의 힌트부터 궁금했던 기능까지, 여기 모아 두었어요.</p></div><div class="intro-stamp" aria-hidden="true">KEEP<br>THE<br>SPARK ✷</div></section><section class="browse" aria-label="레퍼런스 검색과 필터"><label for="search">어떤 영감을 찾고 있나요?</label><input id="search" type="search" placeholder="예: API, 설정 소개, 고양이" autocomplete="off"><div class="filter-row"><span>카테고리</span><div>${filters(categories,'category')}</div></div><div class="filter-row"><span>태그</span><div>${filters(tags,'tag')}</div></div></section><div class="list-heading"><h2>모아 둔 영상</h2><span id="result-count" role="status">${videos.length}개의 레퍼런스</span><button id="reset" hidden>검색·필터 지우기</button></div><section id="cards" class="cards">${cards}</section><p id="empty" class="empty" hidden>일치하는 영상이 없어요. 검색어를 바꾸거나 필터를 줄여 보세요.</p><script id="catalog-data" type="application/json">${JSON.stringify({videos,categories}).replace(/</g,'\\u003c')}</script><script type="module" src="app.mjs"></script>`));
for (const v of videos) {
  const scenes = (v.scenes || []).map(s => `<figure>${s.image ? `<img loading="lazy" src="../${esc(s.image)}" alt="${esc(s.description)}">` : ''}<figcaption>${s.seconds != null ? `<span>${Math.floor(s.seconds/60)}:${String(Math.floor(s.seconds%60)).padStart(2,'0')}</span> ` : ''}${esc(s.description)}</figcaption></figure>`).join('');
  await writeFile(`dist/videos/${v.id}.html`,page(v.title,`<a class="back" href="../index.html">← 서랍으로 돌아가기</a><article class="detail"><div class="eyebrow">${esc(v.platform)}${v.creator ? ` · ${esc(v.creator)}` : ''}${v.durationSeconds ? ` · 약 ${v.durationSeconds}초` : ''}</div><h1>${esc(v.title)}</h1><p class="lead">${esc(v.summary)}</p><div class="pills">${pills(v)}</div><div class="tags">${v.tags.map(t => `#${esc(t)}`).join(' ')}</div><a class="source-link" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">원본 영상 보기 ↗</a>${v.embed ? `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.embed.id)}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : ''}<section><h2>참고할 포인트</h2><p class="prose">${esc(v.description)}</p></section>${v.note ? `<section class="note"><h2>나의 메모</h2><p class="prose">${esc(v.note)}</p></section>` : ''}${scenes ? `<section><h2>주요 장면</h2><div class="scenes">${scenes}</div></section>` : ''}${v.transcript?.text ? `<details><summary>대본 펼쳐 보기</summary>${v.transcript.source ? `<p>${esc(v.transcript.source)}</p>` : ''}<p class="prose">${esc(v.transcript.text)}</p></details>` : ''}${v.caution ? `<aside class="caution"><h2>확인하고 볼 내용</h2><p>${esc(v.caution)}</p></aside>` : ''}${v.sourceNote ? `<p class="source-note">${esc(v.sourceNote)}</p>` : ''}</article>`,'../'));
}
console.log(`Built ${videos.length} references → dist/`);
