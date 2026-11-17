# 다른 컴퓨터에서 개발 이어가기

최종 구현 확인: 2026-11-17. 사무실 구현 기준 커밋: `8bc38bb`. 이 문서는 그 이후 추가한 인수인계 문서입니다.

## 저장소와 실행 화면

- 개발 저장소: https://github.com/gittaeo/VERDANT-Agent-Desk
- 개발 브랜치: `main`
- 독립 사무실: https://verdant-market-taeo.rlaxodh5.chatgpt.site/office
- 리서치 데스크: https://verdant-market-taeo.rlaxodh5.chatgpt.site/agents
- GitHub Pages는 README 문서 페이지입니다. 서버 API가 필요한 앱 실행 환경과 구분하세요.

## 새 컴퓨터에서 시작

Node.js 22.13 이상과 Git을 준비합니다. 아래 로컬 서버는 Node 기본 모듈을 사용하므로 npm 설치 없이 실행할 수 있습니다.

```powershell
git clone https://github.com/gittaeo/VERDANT-Agent-Desk.git
cd VERDANT-Agent-Desk
git switch main
node scripts/local-dashboard.mjs
```

브라우저에서 http://127.0.0.1:5177/office 를 엽니다. `/agents`는 리서치·관제·사무실 탭, `/`는 기존 VERDANT 첫 화면입니다. Windows의 `Agent-Desk.cmd`도 사용할 수 있습니다.

이미 복제한 컴퓨터라면 작업 내용을 먼저 확인하고 `git pull --ff-only origin main`으로 갱신합니다. 기존 작업이 있으면 보존한 뒤 병합하세요.

## 사용자 의도와 유지할 결정

- 별도 책상 카드를 나열하는 화면이 아니라, 부서·회의실·휴게실이 이어진 **하나의 공간**이 핵심입니다.
- 일곱 캐릭터가 문·복도를 따라 이동하고 업무·결과 전달·휴식을 표현합니다. 캐릭터 선택 시 현재 작업, 통과/탈락 조건과 원자료 ID가 바로 보여야 합니다.
- 실제 서버 작업은 즉시 표시합니다. 캐릭터의 걷기·휴식은 공간 연출이며, 오래 분석하는 것처럼 보이도록 실제 완료 상태를 늦추지 않습니다.
- 동선 미리보기는 별도 표시하며 API 조회, 분석 이벤트, 원장을 변경하지 않습니다.
- 기존 첫 화면과 국내 주식 리서치는 유지합니다. 실제 주문·지갑·거래소 연결은 없습니다.
- 로컬 Ollama와 외부 호환 API를 모두 선택할 수 있게 구현했습니다. **사용자가 모델 다운로드를 보류했습니다. 모델 설치·학습을 자동으로 시작하지 마세요.**
- 사용자 입력이 필요한 경우 선택지를 함께 제시하되 독립적으로 가능한 작업은 계속 진행합니다.

## 중요한 소스

| 파일 | 역할 |
| --- | --- |
| `web/agents.html` | 공통 에이전트 화면·사무실 컨트롤 |
| `app/office/route.ts` | 호스팅의 독립 사무실 진입점 |
| `public/office-world.mjs` | SVG 사무실, 캐릭터, 동선 미리보기, 현재 업무·원자료 창, 집중 보기 |
| `public/office-state.mjs` | 인물·부서 좌표, 문/복도 그래프, 경로, 상태→목적지 연결 |
| `public/office-world.css` | 평면도·사람·걷기·모바일 스타일 |
| `public/agent-views.js` | 리서치 상태와 사무실 사이 이벤트 연결 |
| `public/agents.js` | 분석 요청·스트림 수신·결과·원장·기록 UI |
| `lib/agent-desk.mjs` | 일곱 역할의 실제 검사와 선택형 LLM 검토 |
| `lib/model-config.mjs` | 서버에 설정한 모델 프로필 선택 |
| `scripts/local-dashboard.mjs` | 로컬 라우트와 파일 제공 |
| `scripts/agent-runtime.mjs` | 분석 저장, 원장, 로컬 위험 감시 |
| `docs/agent-desk.md` | 설계·실행 경계·미구현 항목 |

브라우저 이벤트 `verdant:office-update`가 실제 작업 상태를 전달합니다. 사무실의 분석 버튼은 `verdant:office-run`으로 기존 분석 폼을 실행·취소하고, 캐릭터 선택은 `verdant:office-select`를 사용합니다. 사무실이 판단·금액·검사 결과를 생성하지 않도록 이 경계를 유지하세요.

## 설정과 로컬 기록

```powershell
Copy-Item config.example.env .env.local
```

필요한 값만 `.env.local`에 넣고 서버를 재시작합니다. 코인 공개 시세의 규칙 검사는 별도 키 없이 사용할 수 있습니다. 주식 공급원별 승인·인증키와 모델 서버 설정은 별도로 필요합니다. 키 이름과 설정 방법은 README에 있습니다.

`.env.local`, API 키 파일, `data/`, `node_modules/`, `.sites-runtime/`, 빌드 출력은 Git에서 제외됩니다. 따라서 **다른 컴퓨터에 비밀키와 기존 관측 원장이 자동으로 복사되지 않습니다.** 필요한 키는 안전한 별도 경로로 준비하세요. Git이나 채팅에 올리지 않습니다. 호스팅의 secret도 로컬에 내려받지 않습니다.

로컬 관측 원장과 5분 위험 감시는 서버 실행 중에만 동작합니다. 클라우드 웹은 원장·상시 감시를 제공하지 않으며, 웹 분석 기록은 해당 브라우저에 저장합니다.

## 검증과 웹 빌드

2026-11-17 기준 자동 테스트 64개와 프로덕션 웹 빌드가 통과했습니다. 실제 공개 시세 분석, 캐릭터 이동, 즉시 업무/검사 표시, 모바일 지도 확대, Escape 집중 보기 종료도 확인했습니다. 실제 LLM 추론은 모델·키 미설정으로 검증하지 않았습니다.

```powershell
node --test tests/*.test.mjs
node --check public/office-world.mjs
node --check public/agent-views.js
```

웹 개발·빌드에는 npm 의존성이 필요합니다. 로컬 Node 기본 서버 실행과 구분하세요.

```powershell
npm run install:ci
npm run build
```

배포는 Sites 플러그인의 기존 프로젝트와 소스 저장소 흐름을 사용했습니다. `.openai/hosting.json`의 프로젝트 ID와 소유자 전용 접근을 보존합니다. 다른 컴퓨터의 `.sites-runtime` 경로나 임시 credential을 재사용하지 말고, 플러그인에서 새 소스 접근 정보를 받아 진행하세요.

## 이후 작업의 출발점

현재 요청한 연결형 사무실은 구현·배포되었습니다. 다음 변경은 사용자 우선순위를 확인한 후 진행합니다. 모델 연결 실검증, 클라우드 영속 저장·상시 실행, 추가 온체인 검사·전략 평가는 별도 작업입니다. 모델 추론이나 캐릭터 움직임만으로 투자 성과가 입증된 것처럼 표현하지 않습니다.

새 개발 대화에 전달할 요청 예시:

> 이 저장소의 DEVELOPMENT_HANDOFF.md와 README.md, docs/agent-desk.md를 읽고 현재 main의 구현을 확인한 뒤 이어서 개발해 주세요. 연결된 사무실과 실제 이벤트 연동을 유지하세요. 모델 다운로드는 보류된 상태입니다. 필요한 질문은 선택지와 함께 제시해 주세요.

## 2026-11-17 개인 Codex 연결 후속

현재 개발은 docs/codex-personal.md의 로컬 Codex 1회 통합 검토를 포함합니다. 모델 다운로드 보류 결정 유지. Codex 연결은 PC 전용이며 `.env.local`의 VERDANT_CODEX_ENABLED=1과 기존 CLI 로그인으로 사용합니다. 호스팅에 인증 파일을 복사하지 않습니다. 상세한 실측 토큰·호출·검증 한계는 해당 문서를 확인하세요. 자동 테스트 73개 통과.
