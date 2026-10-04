import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, mkdtemp, cp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {search} from '../site/search.mjs';
const categories = [{id:'direction',name:'연출'},{id:'tools',name:'도구·기능 사용법'}];
const base = {categories:['direction'],tags:[],addedAt:'2026-09-27',summary:'',description:''};
const videos = [
  {...base,id:'a',title:'인터뷰',transcript:{text:'자막 애니메이션을 설명합니다'},scenes:[{description:'차분한 도입부'}]},
  {...base,id:'b',title:'자막',categories:['tools'],tags:['API'],note:'GPT 연결'},
];
test('빌드는 HTML을 삽입하는 영상 길이와 상속된 카테고리를 거부한다', async () => {
  const dir = await mkdtemp(join(tmpdir(),'reference-validation-'));
  try {
    for (const path of ['scripts','site','content']) await cp(path,join(dir,path),{recursive:true});
    const path = join(dir,'content/videos/cats.json');
    const original = JSON.parse(await readFile(path,'utf8'));
    for (const [change,message] of [
      [{durationSeconds:'<img src=x onerror=alert(1)>'},/invalid duration/],
      [{categories:['toString']},/invalid categories/],
      [{descriptionModel: 123},/invalid descriptionModel/],
    ]) {
      await writeFile(path,JSON.stringify({...original,...change}));
      await assert.rejects(promisify(execFile)(process.execPath,['scripts/build.mjs'],{cwd:dir}),message);
    }
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('빈 태그의 요약은 태그 점수를 받지 않으며 시간대 기준으로 정렬한다', () => {
  const items = [
    {...base,id:'summary',title:'영상',summary:'API',addedAt:'2026-09-27T09:00:00+09:00'},
    {...base,id:'tag',title:'영상',tags:['API'],addedAt:'2026-09-27T00:01:00Z'},
  ];
  const results = search(items,categories,'API');
  assert.deepEqual(results.map(r=>r.score),[6,0]);
  assert.deepEqual(search(items,categories).map(r=>r.video.id),['tag','summary']);
});
test('대본·장면·메모 검색과 제목 우선 순위', () => {
  assert.deepEqual(search(videos,categories,'자막').map(r=>r.video.id),['b','a']);
  assert.equal(search(videos,categories,'차분한 도입부')[0].video.id,'a');
  assert.equal(search(videos,categories,'gpt')[0].video.id,'b');
  assert.ok(search(videos,categories,'자막')[1].match.includes('애니메이션'));
});
test('같은 종류 OR, 다른 종류 AND 및 빈 결과', () => {
  assert.equal(search(videos,categories,'',['direction','tools'],['API']).length,1);
  assert.equal(search(videos,categories,'',['direction'],['API']).length,0);
  assert.equal(search(videos,categories,'없는검색어').length,0);
});
test('색감과 기획·아이디어를 분리한 주로 볼 점 여섯 개만 필터로 보인다', async () => {
  const html = await readFile('dist/index.html','utf8');
  const choices = JSON.parse(await readFile('content/categories.json','utf8'));
  assert.deepEqual(choices.map(c => c.name),['촬영·효과','현실 같은 비현실','인물+그림','색감','기획·아이디어','스토리텔링']);
  assert.ok(!choices.some(c => c.id === 'color-ideas'));
  assert.match(html,/<span>주로 볼 점<\/span>/);
  assert.doesNotMatch(html,/<span>태그<\/span>|data-filter="tag"|class="tags"/);
  for (const choice of choices) assert.ok(html.includes(`data-value="${choice.id}"`));
  const cats = JSON.parse(await readFile('content/videos/cats.json','utf8'));
  assert.deepEqual(cats.categories,['planning-ideas']);
  assert.match(html,/고양이 두 마리와 파도/);
  assert.equal(search([cats],choices,'동물',['planning-ideas']).length,1);
});
test('모든 HTML noindex 및 원본 링크, 누락된 대본 숨김', async () => {
  const content = await Promise.all((await readdir('content/videos')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(`content/videos/${f}`,'utf8'))));
  const files = ['dist/index.html',...(await readdir('dist/videos')).map(f=>`dist/videos/${f}`)];
  for (const file of files) {
    const html = await readFile(file,'utf8');
    assert.match(html,/<meta name="robots" content="noindex">/);
    if (file.includes('/videos/')) {
      assert.match(html,/원본 영상 보기/);
      assert.match(html,/수집 날짜/);
      const video = content.find(v=>file === `dist/videos/${v.id}.html`);
      assert.ok(video);
      if (video.creator) {
        const creator = video.creator.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        assert.ok(html.includes(creator));
        assert.ok((await readFile('dist/index.html','utf8')).includes(creator));
      }
      assert.equal(html.includes('대본 펼쳐 보기'),Boolean(video.transcript?.text));
    }
  }
  assert.match(await readFile('dist/videos/youtube-tRJIF5UHUm0.html','utf8'),/youtube-nocookie.com\/embed\/tRJIF5UHUm0/);
});
test('사운드 레퍼런스의 세 포인트를 굵은 부제목과 별도 문단으로 표시한다', async () => {
  const html = await readFile('dist/videos/instagram-DcGuZqxpigR.html','utf8');
  assert.match(html, /<p class="prose-point"><strong>색감<\/strong><br>[^<]+<\/p><p class="prose-point"><strong>색보정 포인트<\/strong><br>[^<]+<\/p><p class="prose-point"><strong>사운드<\/strong><br>[^<]+<\/p>/);
  assert.doesNotMatch(html, /<strong>실제 악기<\/strong>/);
});
test('설명 작성 모델이 있는 영상만 상세 페이지 맨 아래에 작게 표시한다', async () => {
  for (const file of await readdir('content/videos')) {
    if (!file.endsWith('.json')) continue;
    const video = JSON.parse(await readFile(`content/videos/${file}`,'utf8'));
    const html = await readFile(`dist/videos/${video.id}.html`,'utf8');
    if (video.descriptionModel) {
      assert.ok(html.includes(`<p class="model-note">설명 작성 모델 · ${video.descriptionModel}</p></article>`));
    } else {
      assert.doesNotMatch(html,/class="model-note"/);
    }
  }
});
test('남은 초기 샘플 모두 실제 캡처 네 장과 썸네일 포함', async () => {
  for (const file of ['cats.json','steelcut.json']) {
    const video = JSON.parse(await readFile(`content/videos/${file}`,'utf8'));
    assert.equal(video.scenes.length,4);
    assert.ok(video.scenes.some(s=>s.image === video.thumbnail));
    const html = await readFile(`dist/videos/${video.id}.html`,'utf8');
    for (const scene of video.scenes) {
      assert.ok((await readFile(`dist/${scene.image}`)).length > 0);
      assert.ok(html.includes(scene.image));
    }
  }
});
test('PWA 아이콘과 manifest를 제공하고 미디어 변경을 URL에 반영한다', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
  assert.equal(manifest.display,'standalone');
  const staticAssets = ['style.css','app.mjs','search.mjs','pwa.mjs','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
  const staticHash = createHash('sha256');
  for (const asset of staticAssets) staticHash.update(asset).update(await readFile(`site/${asset}`));
  const staticVersion = staticHash.digest('hex').slice(0,12);
  for (const icon of manifest.icons) {
    assert.ok(icon.src.endsWith(`?v=${staticVersion}`));
    const bytes = await readFile(`dist/${icon.src.split('?')[0]}`);
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(bytes.readUInt32BE(16),size);
    assert.equal(bytes.readUInt32BE(20),size);
  }
  const appleIcon = await readFile('dist/apple-touch-icon.png');
  assert.equal(appleIcon.readUInt32BE(16),180);
  assert.equal(appleIcon.readUInt32BE(20),180);
  const html = await readFile('dist/index.html','utf8');
  assert.match(html,/rel="manifest"/);
  assert.match(html,/rel="apple-touch-icon"/);
  assert.match(html,/pwa\.mjs/);
  for (const asset of ['manifest.webmanifest','icon-192.png','apple-touch-icon.png','style.css','pwa.mjs','app.mjs']) {
    assert.ok(html.includes(`${asset}?v=${staticVersion}`));
  }
  assert.ok((await readFile('dist/app.mjs','utf8')).includes(`search.mjs?v=${staticVersion}`));
  for (const file of await readdir('content/videos')) {
    if (!file.endsWith('.json')) continue;
    const video = JSON.parse(await readFile(`content/videos/${file}`,'utf8'));
    if (video.thumbnail) {
      const bytes = await readFile(`content/${video.thumbnail}`);
      const version = createHash('sha256').update(bytes).digest('hex').slice(0,12);
      assert.ok(html.includes(`${video.thumbnail}?v=${version}`));
    }
    const detail = await readFile(`dist/videos/${video.id}.html`,'utf8');
    for (const scene of video.scenes || []) {
      if (!scene.image) continue;
      const bytes = await readFile(`content/${scene.image}`);
      const version = createHash('sha256').update(bytes).digest('hex').slice(0,12);
      assert.ok(detail.includes(`${scene.image}?v=${version}`));
    }
  }
  assert.match(await readFile('dist/pwa.mjs','utf8'),/searchParams\.set\('refresh'/);
});
