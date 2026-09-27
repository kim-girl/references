# Open Code Review delegate 검토

2026-09-27. 하위 에이전트가 `ocr delegate preview --format json` 및 `ocr delegate rule --format json`으로 파일·규칙을 선정하고 직접 검토했다. OCR LLM 호출은 사용하지 않았다. 최초 구현의 workspace 전체를 대상으로 하고, 검토 중 추가된 Pages workflow도 포함했다.

## 커버리지

- preview total_files: 33; reviewable_files: 13; excluded_files: 20.
- 추가 검토: `.github/workflows/pages.yml` 1개 및 해당 OCR 규칙.
- total_files(실제 코드 검토 대상): 14; reviewed_files: 14; skipped_files: 0; coverage_rate: 100%.
- OCR 제외: Markdown 8개는 요구사항·운영 문서로 별도 참고했고, WebP 12개는 binary 제외다. 이 검토에서는 픽셀을 재검수하지 않았다.

| path | status | 결과 |
|---|---|---|
| .gitignore | added | reviewed |
| content/categories.json | added | reviewed |
| content/tags.json | added | reviewed |
| content/videos/cats.json | added | reviewed |
| content/videos/higgsfield.json | added | reviewed |
| content/videos/steelcut.json | added | reviewed |
| package.json | added | reviewed |
| scripts/build.mjs | added | reviewed |
| scripts/serve.mjs | added | reviewed |
| site/app.mjs | added | reviewed |
| site/search.mjs | added | reviewed |
| site/style.css | added | reviewed |
| test/search.test.mjs | added | reviewed |
| .github/workflows/pages.yml | added (추가) | reviewed |

## 발견 사항 (수정 전 기준)

1. **high / security** — `scripts/build.mjs`, start_line: 40. 상세 페이지의 `durationSeconds`를 HTML에 그대로 삽입한다. 숫자 타입 검증도 없어 문자열 `<img src=x onerror=alert(1)>`가 들어오면 실행 가능한 HTML이 생성된다. 유한한 음이 아닌 숫자로 검증하고 출력도 escape한다.
2. **medium / bug** — `site/search.mjs`, start_line: 12. 빈 문자열을 제거한 `normalized[1]`을 태그로 간주한다. 태그가 없으면 요약 또는 카테고리가 태그 가중치 6점을 받아 실제 태그 일치보다 먼저 표시될 수 있다. 제목·태그는 고정 필드에서 별도로 점수를 계산한다. 재현: 요약 일치/태그 없음 항목과 태그 일치 항목 모두 score 6이 나온다.
3. **medium / bug** — `scripts/build.mjs`, start_line: 28 및 `site/search.mjs`, start_line: 15. 시간대가 있는 ISO 시각을 문자열 비교로 정렬한다. `2026-09-27T09:00:00+09:00`이 실제로 더 늦은 `2026-09-27T01:00:00Z`보다 먼저 나온다. 두 정렬 모두 타임스탬프를 비교한다.
4. **medium / test** — `test/search.test.mjs`, start_line: 26, 35, 38. 전체 콘텐츠 테스트가 HTML 네 개, 모든 상세의 대본 없음, 모든 영상의 장면 네 개를 강제한다. 정상적인 네 번째 영상이나 검수 대본을 추가해도 출판이 실패한다. 전체 산출물 검사는 콘텐츠에 맞춰 일반화하고 세 샘플 검사는 샘플 ID에만 적용한다.
5. **medium / bug** — `scripts/build.mjs`, start_line: 14. 카테고리 유효성을 일반 객체의 값 조회로 검사해 `toString` 등 상속 속성이 존재하는 카테고리로 통과한다. 실제 카테고리 목록에 있는 ID인지 own-property/Set/Map으로 검사한다.

## 확인 범위

검색 점수와 시간대 정렬 오류는 Node.js에서 재현했다. HTML escape, 미디어 경로, 원본 링크 프로토콜, YouTube ID 검증, 로컬 서버 경로 경계, 필터 OR/AND, noindex 생성, 상대 경로, workflow의 build → test → artifact → deploy 의존성과 권한을 확인했다. 외부 플랫폼 재생 가능 여부·AI 설명 사실성·대규모 검색 성능은 이 코드 검토의 검증 대상이 아니다. 수정과 회귀 검증은 주 에이전트가 수행한다.
# 수정 결과

- 영상 길이를 유한한 0 이상의 숫자로 검증해 HTML 삽입을 차단했다.
- 카테고리는 객체 자신의 키만 허용하도록 변경했다.
- 검색 점수는 빈 항목 제거와 무관하게 제목·태그 자체에서 계산한다.
- 수집일 정렬은 문자열 대신 실제 시각으로 비교한다.
- 전체 콘텐츠 검증은 새 영상과 선택 대본을 허용하고 세 샘플 검사는 명시된 샘플에만 적용한다.
- 회귀 테스트에 잘못된 길이·상속 키 거부와 검색 순위·시간대 정렬을 추가했다.
