# VERDANT

**Beyond the noise. — 시장의 소음 너머, 움직임의 이유까지.**

공시에서 시작하는 국내 주식 리서치 대시보드입니다. 딥 포레스트·라임 디자인, 움직이는 와이어프레임, 버튼으로 시작하는 공시 조회와 종목 리서치를 제공합니다.

[웹 버전](https://verdant-market-taeo.rlaxodh5.chatgpt.site) · 소유자 전용 접근

## 화면

### 데스크톱

![VERDANT 데스크톱](docs/images/verdant-desktop.jpg)

### 모바일 · 실제 DART 조회 후

<img src="docs/images/verdant-mobile.jpg" alt="390px 모바일에서 삼성전자 DART 공시 15건 조회" width="390">

[실제 조회 결과의 추가 화면](docs/images/verdant-actual-dart.jpg)

## 현재 기능

- 실제 DART 기업 목록으로 기업명·종목코드·고유번호 연결
- 기업별 최근 7·30·90일 공시와 코스피·코스닥 최근 공시 조회
- 접수번호·원문 링크·접수일·수집 시각, 정정공시 및 제목 유형 표시
- 실제 서버 작업 단계 표시, 취소·오류·빈 결과·부분 수집 처리
- 최근 5개 표시 리포트의 브라우저 저장, 당시 결과 재열기, JSON 내보내기
- 시장·업종 / 기업 공시 / 뉴스 시점으로 나누는 주가 움직임 분석 화면
- 단타·장기 후보, 업종 필터, 관심종목, 상세 리포트의 **가상 데모**
- 데스크톱·모바일 레이아웃과 `prefers-reduced-motion` 지원

## 실제 데이터와 데모의 구분

| 항목 | 상태 |
| --- | --- |
| DART 공시 조회 | PC 실행에서 실제 동작 |
| 공시 본문·재무 수치 분석 | 후속 개발 필요 |
| KRX 가격·거래량 | 코스피·코스닥 일별매매정보 실제 연결 완료 · 최근 최대 5거래일 |
| 뉴스 | 공급원 선정·연결 예정 |
| 후보 카드·지수·가격·기사·점수 | 가상 데모 |
| 실제 상승 후보 선정·가격 변동 원인 판단 | 가격·뉴스 연결 및 검증 필요 |

현재 Cloudflare 실행 환경에서는 DART 도메인 요청이 네트워크 오류로 실패합니다. PC에서는 실제 공시와 KRX 가격을 함께 조회할 수 있습니다. 클라우드 연결 문제 해결 전에는 PC 실행 버전을 이용합니다. KRX는 전일까지의 자료에서 최근 최대 5거래일을 조회하며 비수정 종가·전일 대비 등락률·거래량·거래대금·기준일을 제공합니다. 실시간 현재가나 전체 30·90일 수익률을 의미하지 않습니다. 뉴스·업종 비교가 없어 가격 변동 원인은 확정하지 않습니다.

## PC 실행

Node.js가 필요합니다. 기존 Codex PC 환경에서는 **`VERDANT 실행.cmd`를 더블클릭**하면 됩니다. 실행 파일은 현재 사용자 폴더의 Codex Node 런타임을 사용합니다.

다른 Node.js 환경에서는 저장소 폴더에서 다음과 같이 실행합니다. 이 로컬 서버는 별도의 패키지 설치 없이 Node 기본 모듈을 사용합니다.

```powershell
node scripts/local-dashboard.mjs
```

브라우저에서 [http://127.0.0.1:5177](http://127.0.0.1:5177)을 엽니다. 현재 로컬 서버는 **저장소의 상위 폴더에 있는 `DART API.txt`**를 읽습니다. 발급받은 40자리 키만 넣고, 키 파일을 Git에 올리지 마세요. 서버는 PC 내부 주소에만 바인딩하며, 키를 브라우저로 전달하지 않습니다.

## 웹 서버 개발

Node.js 22.13 이상에서 실행합니다.

```powershell
npm run install:ci
npm run dev
```

PC 실행은 상위 폴더의 `KRX API.txt`(또는 `KPX API.txt`)를 추가로 읽습니다. KRX 키는 요청 헤더 `AUTH_KEY`로만 전달합니다. 인증키 발급 외에 ‘유가증권 일별매매정보’와 ‘코스닥 일별매매정보’의 각각의 이용 승인이 필요합니다.

로컬 웹 개발에서는 `.dev.vars`에 `DART_API_KEY`, `KRX_API_KEY`를 설정하고 운영 환경에서는 같은 이름의 서버 secret을 사용합니다. `.openai/hosting.json`은 기존 Sites 배포 식별자를 보존합니다. 키와 로컬 환경 파일, 의존성, 빌드 결과는 저장소에서 제외됩니다.

## 검증

```powershell
node --test tests/research.test.mjs tests/krx.test.mjs
npm run build
```

- 단위 테스트 10개 통과: DART 6개 + KRX 숫자 정규화·권한 오류·과거 날짜 순회·통신 오류 4개
- 프로덕션 빌드 통과
- PC 실제 API 검사: 삼성전자 최근 30일 15건, SK하이닉스 4건 (2026-10-25 기준)
- 데스크톱·390px 모바일 브라우저에서 삼성전자 실제 조회 확인
- 2026-10-26: 두 KRX API 실제 HTTP 200, 삼성전자·SK하이닉스·JYP Ent.의 최근 5거래일 자료 확인. KRX 화면 변경 후의 브라우저 시각 검사는 접근 정책 때문에 수행하지 못했습니다.

### KRX API 승인 기록

![코스피·코스닥 일별매매정보 승인](docs/images/krx-approval-2026-10-26.png)

## 주요 파일

| 경로 | 용도 |
| --- | --- |
| `web/index.html` | 기존 목업을 바탕으로 한 화면 |
| `public/refined.css`, `public/refined.js` | 디자인·모션·실제 조회·기록 |
| `lib/market-research.mjs` | DART 수집·기업 매핑·공시 유형 분류 |
| `scripts/local-dashboard.mjs` | PC용 로컬 서버 |
| `app/api/` | 웹 서버의 연결 상태·공시 조회 API |
| `docs/images/` | 데스크톱·모바일·조회 화면 이미지 |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | 현재 구현과 제약 |
| [docs/RESEARCH.md](docs/RESEARCH.md) | 초기 조사와 공식 출처 |
| [CODEX_HANDOFF.md](CODEX_HANDOFF.md) | 원본 목업 인수인계 기록 |

PC 버전과 웹 버전의 브라우저 저장 기록은 자동 동기화되지 않습니다.

## 종합 리서치와 뉴스 연결

핵심 결론 → 단타(1–5거래일) / 장기(6–12개월) → 핵심 공시 → 원문 목록 순서로 제공합니다. 단타는 최대 5개 종가와 거래량, 장기는 DART 전년 동기 실적·현금흐름에 근거한 규칙 기반 관찰입니다. 공시 정리는 제목의 유형과 확인 항목이며 본문 전체 분석이 아닙니다.

뉴스는 https://guide.ncloud-docs.com/docs/apihub-application 에서 NAVER 검색의 뉴스 상품을 신청하고 이용 한도를 설정합니다. Client ID와 Client Secret은 채팅에 보내지 말고 실행 바로가기와 같은 위치의 NEWS API.json에 저장합니다. 서버 재시작 시 읽습니다. 해당 파일은 Git에서 제외합니다.

```json
{"clientId":"발급한 Client ID","clientSecret":"발급한 Client Secret"}
```

배포 환경변수: NAVER_NEWS_CLIENT_ID, NAVER_NEWS_CLIENT_SECRET. 제목·검색 요약·원문 링크만 수집하며 기사 본문 검증이나 가격과의 인과 분석은 수행하지 않습니다. 검증: node --test tests/research.test.mjs tests/krx.test.mjs tests/brief.test.mjs (15개 통과).

## 후보 탐색 중심 흐름 (2026-10-26)

첫 화면의 `단타·장기 후보 찾기`는 KRX 코스피·코스닥 최근 일별 자료에서 거래대금 100억원 이상 상위 24개를 심사합니다. 단타는 종가 상승·거래량, 장기는 전년 동기 매출·영업이익 성장과 영업현금흐름으로 각각 순위를 매겨 최대 4개씩 표시합니다. 두 목록은 중복 제외하며 자금조달·소송 등 제목 위험 공시는 제외합니다. 시장 공시 수집이 부분적이면 위험 검토에도 누락이 있을 수 있습니다.

카드를 클릭하면 선택한 전략의 기업 상세 분석, 뉴스·공시, 실제 종가·고가·저가·거래량과 관측 위험이 열립니다. 이전의 평균 수익률 연장·이익 성장률 환산 및 대칭 상하 시나리오는 제거했습니다. 현재 최대 5거래일 자료로는 예측 성능을 입증할 수 없어 카드의 예상 수익성은 산출 보류입니다. API의 scenarios도 status=withheld, returns=null, paths={}를 반환합니다. 뉴스는 상세 진입 시 조회하고 순위에는 미반영입니다. [가격 분석 수정·예측 검증 계획](docs/price-evidence.md)을 참고하세요.

테스트 19개: `node --test tests/research.test.mjs tests/krx.test.mjs tests/brief.test.mjs tests/selection.test.mjs`. 실제 2,764개 시세에서 24개 재무 검토 및 후보 생성 요청이 완료됐습니다.

## 외국인·기관 수급 (screen-v2-flow)

한국투자증권 공식 `inquire-investor`의 KRX시장(J), `FHKST01010900` 조회를 연결했습니다. 순매수 수량(frgn_ntby_qty, orgn_ntby_qty) 기준으로 사용하며 거래대금 단위를 추측하지 않습니다. 계좌번호·비밀번호는 필요하지 않습니다.

로컬: 실행 바로가기와 같은 폴더의 `KIS API.json`에 아래 값을 저장하고 서버를 재시작합니다. 해당 파일은 Git에서 제외됩니다. 배포 환경변수는 KIS_APP_KEY / KIS_APP_SECRET입니다. 키는 채팅이나 저장소에 올리지 마세요.

```json
{"appKey":"발급한 앱키","appSecret":"발급한 앱시크릿"}
```

단타는 5거래일, 장기는 20거래일 누적 외국인·기관 순매수 모두 양수 + 동반 순매수일 40% 이상을 필터로 사용합니다. 확인된 후보끼리는 동반 매수 비율과 거래량 대비 순매수 강도를 가점으로 비교합니다. 현재 강도는 순매수 수량 / 동일 기간 거래량입니다. 연속 매수일도 카드·상세에 표시합니다. 20일 전체 거래량이 없으면 강도 비율은 산출하지 않습니다.

최신 KRX 종가 기준일에 맞춰 당일·미래 자료를 제외하고, 중복 제거·누락값·기간 부족·오래된 기준일을 검증합니다. 일부 종목만 확인되면 미확인 종목으로 빈자리를 채우지 않습니다. 전략별 수급 확인이 전무하면 기존 가격·실적 순위는 `수급 미확인 · 예비 후보`로 표시합니다. 예상 수익률에는 수급 가점을 더하지 않습니다. 60일 추이, 기관 세부 주체, 장중 수급, 수급 규칙의 백테스트는 미완료입니다.

공식 근거: https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_investor 및 https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd

검증: 자동 테스트 27개 통과. 실제 한국투자증권 인증·조회는 앱키 미제공으로 미검증입니다.

### Design audit (2026-10-31)

Ran Impeccable detect and Hallmark sloplint against the page and stylesheet. Removed repeated heading kickers in static/dynamic screens, enlarged small text, improved contrast and removed decorative glow. Reports, exact tool revisions and remaining findings: [design audit](docs/design-audit/README.md). Research behavior is unchanged.

### Research desk visual refinement

The updated UI adds a WebGL liquid-metal V brand mark, two strategy columns with actual historical sparklines, clearer candidate hierarchy, a company search shortcut, and a legible light scenario chart. See [DESIGN.md](DESIGN.md) for design tokens, source-guideline choices and data semantics. Investor API credentials and research scoring are unchanged.

Current WebGL visual implementation and verified screenshots: [liquid visual notes](docs/liquid-visual.md).

### News status correction

NAVER credentials are configured separately for local and hosted runtimes. The hosted Site now has NAVER_NEWS_CLIENT_ID and NAVER_NEWS_CLIENT_SECRET stored as secrets. `/api/status` probes NAVER independently of DART and returns newsConfigured plus a sanitized newsHealth status. Healthy probes are cached for five minutes, failures for 30 seconds; concurrent refreshes share the same request. No credential values are included in responses.

The sources modal and company coverage now use actual news status instead of a hardcoded disconnected label. A market-wide lookup with no company is `company_required` when credentials are present, not `not_connected`. Tests: 32 pass, including cache, concurrency, zero valid results, missing keys and authentication errors.

### 조건 시뮬레이션과 뉴스 근거

실제 가격 그래프 아래에서 반등·횡보·조정 가정 및 종점 등락 슬라이더로 미래 5거래일 경로를 확인합니다. 경로는 사용자 조건의 보간이며 검증된 예측이 아닙니다. 뉴스는 기업명·실적·주가별 검색을 병행해 기업 관련성·유사 제목·날짜를 확인하고, 상승 검토/하락 위험/판단 보류로 선별합니다. 각 기사에 분류 이유·추가 확인 조건·출처·원문·기준 종가와의 날짜 관계를 표시하며 반대 근거도 함께 제공합니다. 뉴스는 현재 경로 가격의 계산 입력이 아닙니다. 검증과 한계는 [가격 분석 문서](docs/price-evidence.md)에 기록합니다.
