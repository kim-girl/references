---
name: video-reference-review
description: Analyze a user-provided Instagram Reel or YouTube Short as a video reference: verify metadata against actual frames/audio, provide 3–4 representative stills and a qualified transcript, and propose video-specific classification. Do not save to PARA or register this skill automatically.
---

# 영상 레퍼런스 분석 (독립 배포용 초안)

## 트리거
사용자가 Instagram Reel 또는 YouTube Shorts 링크를 주며 내용 이해, 주요 장면 캡처, 대본/말 받아쓰기, 영상 레퍼런스 분류를 요청할 때.

## 원칙
- **원본 영상·음성 우선**: 제목·설명·해시태그가 실제 영상과 어긋날 수 있다. 서로 대조해 불일치를 명시한다.
- **본 것과 추론을 구분**한다. 영상에 없는 사실·제작 방법·가격 우위를 사실로 확정하지 않는다.
- 원본 말 받아쓰기에 불확실한 대목이 있으면 `[불명확]`로 표시하고, 설명을 대사인 양 인용하지 않는다. 욕설 등도 필요할 때 원문을 정확히 전하되 임의로 보충하지 않는다.

## 절차
1. 링크를 원형 그대로 기록하고 `yt-dlp --write-info-json --no-playlist -o '작업폴더/%(id)s.%(ext)s' URL`로 다운로드한다. 접근 실패 시 로그인 쿠키 등 허용된 접근 경로를 확인하되, 확인 못한 영상을 추정해 설명하지 않는다.
2. `ffprobe`로 실제 길이·해상도·음성 스트림을 확인한다. 메타데이터에서 제목·게시자·설명·게시일을 따로 읽는다.
3. `ffmpeg`로 전 구간의 저해상도 접촉시트(contact sheet)를 만들고 장면 전환과 화면 자막을 살핀다. 이어서 핵심 장면 **최소 3~4개(길면 더)**를 원본 해상도 JPEG/PNG로 뽑고 각각 실제 이미지를 검수한다. HLS 등에서 앞쪽 입력 `-ss`가 시각을 어긋나게 만들 수 있으므로 `ffmpeg -i INPUT -ss N -frames:v 1 OUT.jpg`를 쓰고 화면·타임코드를 확인한다. GitHub Pages에 넣을 때는 WebP로 변환해 넣는다.
4. 대사가 있으면 공식 자막 또는 YouTube transcript를 먼저 확인한다. 없으면 오디오를 분리해 한국어 지원 STT로 초안을 만든 뒤, **화면 자막 및 음성과 대조**해 교정한다. STT 결과를 그대로 ‘정확한 녹취’라 부르지 않는다. 읽을 수 없는 고유명사·대사는 불명확하게 표시한다. 배경음악만 있으면 ‘말 대사 없음’을 분명히 한다.

## 품질 점검
- 처음부터 끝까지 영상/자막 흐름을 확인했는가?
- 캡처 3~4개가 서로 다른 핵심 순간이며 실제 파일이 존재하는가?
- 음성 받아쓰기에 STT 오인식이나 화면 자막과의 충돌이 없는가? 불확실한 문구를 임의로 매끈하게 만들지 않았는가?
- 미요청 저장·배포·업로드를 하지 않았는가?
