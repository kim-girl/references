import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, mkdtemp, cp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
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
