# 영감 서랍

개인 영상 레퍼런스를 모아 보는 정적 사이트. Node.js 22 이상만 필요하며 외부 패키지를 사용하지 않는다.

## 로컬 확인

```sh
npm run dev
```

http://localhost:4173 에서 확인한다. 콘텐츠를 수정한 뒤 `npm run build`를 실행하고 브라우저를 새로고침한다. 자동 재빌드는 제공하지 않는다.

```sh
npm run build
npm test
```

`dist/` 전체가 출판할 정적 파일이다. 하위 경로에서도 동작하도록 내부 링크는 상대 경로를 사용한다. 모든 HTML에 `noindex`를 넣는다. `master`에 푸시하면 `.github/workflows/pages.yml`이 빌드·테스트 성공 후 GitHub Pages에 자동 배포한다. 검증 실패 시 배포하지 않는다.

## 콘텐츠 추가

[콘텐츠 규칙](docs/content-format.md)을 따른다. 영상마다 `content/videos/`에 JSON 파일 하나를 추가한다. 카테고리와 태그 목록은 각각 `content/categories.json`, `content/tags.json`에서 관리한다.

현재 세 샘플은 [TEST HANDOFF](<docs/TEST HANDOFF.md>)의 요약을 사용하며 원본에서 추출한 실제 캡처를 영상당 네 장씩 제공한다. 대본 전문은 아직 없다. YouTube 임베드는 포함하지만 외부 플랫폼의 재생 허용 상태에 따라 재생되지 않을 수 있다. 원본 링크는 항상 남는다.
