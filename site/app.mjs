import {search} from './search.mjs';
const data = JSON.parse(document.querySelector('#catalog-data').textContent);
const input = document.querySelector('#search');
const cards = [...document.querySelectorAll('.card')];
const selected = {category: new Set(), tag: new Set()};
let searchTimer;
function update() {
  const results = search(data.videos, data.categories, input.value, [...selected.category], [...selected.tag]);
  const matches = new Map(results.map(r => [r.video.id, r]));
  cards.forEach(card => {
    const result = matches.get(card.dataset.id);
    card.hidden = !result;
    card.querySelector('.match').textContent = result?.match ? `일치한 내용 · ${result.match}` : '';
  });
  results.forEach(r => document.querySelector('#cards').append(cards.find(c => c.dataset.id === r.video.id)));
  document.querySelector('#result-count').textContent = `${results.length}개의 레퍼런스`;
  document.querySelector('#empty').hidden = results.length !== 0;
  document.querySelector('#reset').hidden = !input.value && !selected.category.size && !selected.tag.size;
}
input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(update, 200);
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  clearTimeout(searchTimer);
  const set = selected[button.dataset.filter];
  const value = button.dataset.value;
  set.has(value) ? set.delete(value) : set.add(value);
  button.setAttribute('aria-pressed', String(set.has(value)));
  update();
}));
document.querySelector('#reset').addEventListener('click', () => {
  clearTimeout(searchTimer);
  input.value = '';
  Object.values(selected).forEach(set => set.clear());
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  update(); input.focus();
});
update();
