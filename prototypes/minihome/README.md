# Prototype: minihome (phyco world)

친구 미니홈피에 놀러 가서 방을 망가뜨리는 장난 미니홈피 프로토타입입니다 (v2).
설계는 [`design/game-brief.md`](../../design/game-brief.md)에 있습니다.

## Hypothesis

"예쁘게 꾸민 방을 친구 여러 명이 동시에 들어와 망가뜨리고, 그 흔적이 방명록에 남는다"는 루프만으로도
웃기고, 다시 꾸미고 복수하러 가고 싶어진다.

## How to run

- 혼자 보기: `dist/index.html`을 브라우저로 엽니다. 같은 브라우저에서 탭을 두 개 열면 두 사람처럼 서로 보입니다.
- 진짜 여러 명: claude.ai 아티팩트로 배포한 링크를 친구에게 공유합니다(아래 "여러 명이 동시에").
- 수정 후 다시 빌드:
  ```bash
  cd prototypes/minihome
  npm i --no-save --no-package-lock esbuild@0.25.10
  node build.mjs        # dist/index.html(단독 실행), dist/artifact.html(아티팩트용) 생성
  ```

## 화면 구성 (2000년대 미니홈피 구조)

| 자리 | 내용 |
|---|---|
| 맨 위 | TODAY / TOTAL 방문자 수, 연결 상태 |
| 왼쪽 페이지 | 주인 미니미, 오늘의 기분, 소개글, 지금 방 안에 있는 사람, 난장판 지수 |
| 가운데 | 다이어리 스프링 |
| 오른쪽 페이지 | 홈피 제목, BGM 바, 탭 내용 |
| 오른쪽 세로 탭 | 홈 / 미니룸 / 미니미 / 방명록 / 쥬크박스 |

구조만 빌려왔고 이름, 로고, 그림, 음악은 전부 새로 만들었습니다.

## 가구별 장난 (가구를 누르면 걸어가서 메뉴가 뜸, 가구 앞에서 E)

| 가구 | 장난 | 쓰는 pixelfx 이펙트 |
|---|---|---|
| 침대 | 방방 뛰다 부수기 / 불 지르기 / 발로 차기 | cartoon-pow, blunt-hit / fire-ring 뒤 campfire가 계속 탐 / blunt-hit |
| 소파 | 칼로 찢기 / 불 지르기 / 발로 차기 | double-slash / fire-ring, campfire / blunt-hit |
| TV | 번개 내리꽂기 / 발로 차기 | lightning-strike, zap-hit (화면 지지직) / blunt-hit |
| 스탠드 | 감전시키기 / 발로 차기 | spark-arc, zap-hit / blunt-hit |
| 기타 | 감전시키기 / 칼로 찢기 / 발로 차기 | spark-arc, zap-hit / double-slash / blunt-hit |
| 화분 | 꽁꽁 얼리기 / 독 뿌리기 / 발로 차기 | snowflake-burst / acid-splash (시듦) / blunt-hit |
| 어항 | 꽁꽁 얼리기 / 발로 차기 | snowflake-burst / blunt-hit |
| 책장 | 폭파하기 / 발로 차기 | small-explosion (책이 쏟아짐) / blunt-hit |
| 케이크 테이블 | 케이크 엎기 / 발로 차기 | splash, cartoon-pow / blunt-hit |
| 곰인형 | 유령 씌우기 / 칼로 찢기 / 발로 차기 | poof 뒤 ghost가 계속 떠다님 / double-slash / blunt-hit |
| 러그 | 물 쏟기 / 불 지르기 | splash 뒤 ripples 물웅덩이 / fire-ring, campfire |
| 액자, 포스터(벽) | 낙서하기 / 칼로 긋기 / 떨어뜨리기 | hit-spark / sword-slash / blunt-hit |
| 시계(벽) | 낙서하기 / 떨어뜨리기 | hit-spark / blunt-hit |
| 아무 데서나 (1~5) | 똥 싸기 / 방귀 / 모닥불 / 개구리 / 슬라임 | cartoon-pow / poison-cloud / fire-ring, campfire / poof, frog / poof, slime |

불은 시간이 지나면 주변 가구를 그을리고, 개구리·슬라임·유령은 방 안을 돌아다닙니다.

## 도망가기

손님은 첫 장난 뒤 10초 안에 오른쪽 문까지 직접 가야 합니다. 시간이 다 되거나, 주인으로 들어와 있는
사람이 몸으로 막으면 잡힙니다. 결과("…그리고 무사히 도망갔어요" / "…딱 걸렸어요")는 방명록에 "장난 기록"으로 남습니다.

## 방명록

No. 번호, 이름, 날짜, 쓴 사람 미니미 칸, 글. 비밀글(주인과 쓴 사람만 봄), 주인 답글(ㄴ 표시), 주인 삭제.

## 미니룸 꾸미기 (주인만)

가구 상점 14종, 벽지 4종, 바닥 4종. 끌어서 옮기기, 좌우 뒤집기, 창고로 빼기(Delete 키). 자동 저장.
"싹 치우기"로 장난 흔적을 한 번에 원상복구합니다.

## 미니미 꾸미기 (누구나 자기 것)

피부 4, 머리 모양 5, 머리 색 6, 표정 4, 상의 5, 상의 색 6, 하의 3, 하의 색 5, 신발 4, 소품 5. 랜덤 버튼.
저장하면 방명록, 미니룸, 이름표에 같은 미니미가 보입니다.

## 여러 명이 동시에

| 실행 방식 | 같이 보이는 범위 |
|---|---|
| `dist/index.html` 단독 | 같은 브라우저의 탭끼리만 (localStorage + BroadcastChannel) |
| claude.ai 아티팩트 | 링크를 연 사람 모두. `room`으로 위치·말풍선을 실시간 공유하고, `db`로 방·장난·방명록·미니미·방문을 저장 |

장난은 "추가만 하는 기록"으로 저장하고 화면은 기록을 순서대로 다시 계산해서 그리므로, 여러 명이 동시에 장난쳐도
서로 덮어쓰지 않습니다. 청소는 시각(`cleanedAt`)만 바꿔서 그 이전 장난을 숨깁니다.

친구가 장난치고 방명록을 쓰려면 주인이 아티팩트 공유 메뉴에서 친구를 **참여자(Contributor) 이상**으로 초대해야
합니다. 보기 권한만 있으면 구경만 됩니다.

## Status

in-progress

## Findings

(플레이해 보고 채울 것)

## 알려진 한계

- 홈피는 하나뿐입니다(아티팩트 하나 = 미니홈피 하나). 일촌, 파도타기, 사진첩, 도토리는 없습니다.
- "친구 2명 불러보기" 봇은 내 화면에만 보이는 체험용입니다.
- 아티팩트 밖으로 키우려면 서버가 필요합니다(예: API Gateway WebSocket + Lambda + DynamoDB).

## Credits

- 이펙트: [pixelfx](https://github.com/patch-gg/pixelfx) `a841596`, MIT. `vendor/pixelfx/`에 쓰는 파일만
  복사했고 원본 LICENSE와 NOTICE를 함께 두었습니다.
- 가구, 벽지, 바닥, 미니미, 똥·쓰레기 도트와 BGM 3곡은 이 프로토타입용으로 새로 만든 것입니다.
