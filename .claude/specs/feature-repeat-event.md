# 기능 명세서: 반복 일정 선택 기능

**작성일**: 2025-10-29
**버전**: 1.0
**담당 영역**: 일정 관리 시스템 - 반복 일정 생성

---

## 1. 개요

### 1.1 배경
현재 일정 관리 시스템에는 반복 일정 UI가 준비되어 있으나 (App.tsx 446-483라인 주석 처리됨) 실제 동작 로직이 구현되지 않은 상태입니다. 사용자는 반복 일정 체크박스를 선택할 수 있지만(417-427라인), 반복 유형 선택과 실제 반복 일정 생성 기능이 없습니다.

### 1.2 목적
사용자가 일정 생성 시 반복 유형(매일/매주/매월/매년)을 선택하면, 시스템이 자동으로 지정된 범위 내에서 반복 일정을 생성하여 캘린더에 표시합니다.

### 1.3 사용 사례

**AS A** 일정 관리 시스템 사용자
**I WANT** 일정 생성 시 반복 유형과 간격을 선택하고
**SO THAT** 매주 팀 미팅, 매월 보고서 작성 등 규칙적인 일정을 한 번에 생성할 수 있습니다

---

## 2. 범위 (Scope)

### 2.1 IN SCOPE

#### 포함 항목:
1. **UI 활성화**: 반복 유형 선택 드롭다운, 반복 간격 입력, 반복 종료일 선택 (App.tsx 446-483라인)
2. **반복 날짜 생성 로직**: 매일/매주/매월/매년 유형별 날짜 계산
3. **특수 날짜 처리**: 31일 매월 반복, 윤년 2월 29일 처리
4. **반복 일정 저장**: 서버 API `/api/events-list` POST 호출
5. **반복 정보 표시**: 일정 목록에 반복 정보 표시 (이미 구현됨, 563-573라인)
6. **겹침 체크 제외**: 반복 일정은 겹침 경고 스킵

#### 제외 항목 (OUT OF SCOPE):
1. **반복 일정 개별 수정**: 반복 일정 중 특정 일정만 수정하는 기능 (향후 구현)
2. **반복 일정 개별 삭제**: 반복 일정 중 특정 일정만 삭제하는 기능 (향후 구현)
3. **반복 일정 일괄 수정/삭제**: 반복 시리즈 전체 수정/삭제 UI (서버는 준비됨)
4. **커스텀 반복 패턴**: 특정 요일 선택 (예: 월/수/금만) 등 고급 반복 옵션
5. **반복 횟수 제한**: 종료일 대신 "10회 반복" 같은 옵션

---

## 3. 상세 요구사항

### 3.1 데이터 구조

#### 3.1.1 기존 데이터 (변경 없음)
```typescript
// src/types.ts (라인 1-24)
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatInfo {
  type: RepeatType;
  interval: number;
  endDate?: string;
}

export interface Event extends EventForm {
  id: string;
  repeat: RepeatInfo;
}
```

#### 3.1.2 서버 응답 데이터 구조 (server.js 확인)
```typescript
// POST /api/events-list 응답 (라인 76-99)
{
  "events": Event[]  // 생성된 반복 일정 배열
}

// 각 Event는 repeat.id 필드 추가됨
interface Event {
  id: string;
  repeat: {
    type: RepeatType;
    interval: number;
    endDate?: string;
    id?: string;  // 서버가 자동 생성 (같은 시리즈는 동일 ID)
  }
}
```

#### 3.1.3 데이터 변경 사항
**없음** - 기존 타입 정의가 완전히 구현되어 있음

---

### 3.2 API 변경

#### 3.2.1 기존 API (변경 없음)
- `GET /api/events`: 전체 일정 조회
- `POST /api/events`: 단일 일정 생성
- `PUT /api/events/:id`: 단일 일정 수정
- `DELETE /api/events/:id`: 단일 일정 삭제

#### 3.2.2 사용할 기존 API
```
POST /api/events-list
Request Body: {
  "events": [
    {
      "title": "반복 회의",
      "date": "2025-11-01",
      "startTime": "10:00",
      "endTime": "11:00",
      "description": "",
      "location": "",
      "category": "업무",
      "repeat": {
        "type": "weekly",
        "interval": 1,
        "endDate": "2025-12-31"
      },
      "notificationTime": 10
    },
    // ... 생성된 반복 일정들
  ]
}

Response (201): {
  "events": [
    {
      "id": "uuid1",
      "repeat": {
        "type": "weekly",
        "interval": 1,
        "endDate": "2025-12-31",
        "id": "repeat-uuid"  // 서버가 자동 생성
      },
      // ... 기타 필드
    },
    // ...
  ]
}
```

#### 3.2.3 API 변경 사항
**없음** - 서버는 이미 `/api/events-list` 엔드포인트를 제공함 (server.js 76-99라인)

---

### 3.3 UI 변경

#### 3.3.1 활성화할 UI 컴포넌트

**위치**: `src/App.tsx`

**변경 사항**:
1. **라인 85-89**: 주석 제거
   ```typescript
   // 변경 전
   // setRepeatType,
   // setRepeatInterval,
   // setRepeatEndDate,

   // 변경 후
   setRepeatType,
   setRepeatInterval,
   setRepeatEndDate,
   ```

2. **라인 446-483**: 주석 제거 및 import 추가
   ```typescript
   // 라인 43-44 변경
   // 변경 전
   // import { Event, EventForm, RepeatType } from './types';
   import { Event, EventForm } from './types';

   // 변경 후
   import { Event, EventForm, RepeatType } from './types';
   ```

#### 3.3.2 UI 컴포넌트 명세

**반복 유형 선택 섹션** (446-483라인):
- **조건부 렌더링**: `isRepeating === true`일 때만 표시
- **반복 유형 드롭다운**:
  - 옵션: daily(매일), weekly(매주), monthly(매월), yearly(매년)
  - 기본값: 'daily'
- **반복 간격 입력**:
  - 타입: number
  - 최소값: 1
  - 기본값: 1
- **반복 종료일 입력**:
  - 타입: date
  - 선택 사항 (optional)
  - 미입력 시: 시스템 기본값 사용 (1년 후 또는 최대 100개)

#### 3.3.3 UI 동작 명세

**입력 검증**:
1. 반복 간격 < 1 → 입력 필드에서 min=1로 제한 (이미 구현됨, 469라인)
2. 반복 종료일 < 시작 날짜 → 에러 스낵바 표시
3. 반복 종료일 미입력 → 자동 제한 적용

**사용자 피드백**:
- 반복 일정 생성 성공 → "일정이 추가되었습니다" 스낵바
- 반복 일정 생성 실패 → "일정 저장 실패" 스낵바 (이미 구현됨, useEventOperations.ts 52라인)

---

### 3.4 Hook 변경

#### 3.4.1 useEventForm.ts
**위치**: `src/hooks/useEventForm.ts`

**현재 상태**:
- setRepeatType, setRepeatInterval, setRepeatEndDate가 이미 구현됨 (라인 17-19, 90-94)
- 모든 상태 관리 로직 완료

**변경 사항**: **없음**

---

#### 3.4.2 useEventOperations.ts
**위치**: `src/hooks/useEventOperations.ts`

**현재 상태**:
- `saveEvent` 함수가 단일 일정만 저장함 (라인 24-54)

**필요 변경 사항**:
1. **saveEvent 함수 수정** 또는 **새 함수 추가**
   - 반복 일정 여부 확인
   - 반복 일정이면 날짜 배열 생성 후 `/api/events-list` 호출
   - 단일 일정이면 기존 로직 유지

2. **구체적 요구사항**:
   ```typescript
   // saveEvent 함수 내부 로직 변경
   // 1. 반복 일정 확인
   if (eventData.repeat.type !== 'none') {
     // 2. 반복 날짜 배열 생성 (새 유틸 함수 호출)
     const repeatDates = generateRepeatDates(eventData);

     // 3. 각 날짜에 대한 Event 객체 배열 생성
     const events = repeatDates.map(date => ({
       ...eventData,
       date: date
     }));

     // 4. /api/events-list 호출
     response = await fetch('/api/events-list', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ events })
     });
   } else {
     // 기존 로직 유지
   }
   ```

**변경 사항**: **함수 로직 수정 필요**

---

### 3.5 유틸 변경

#### 3.5.1 신규 파일: utils/repeatEventUtils.ts

**생성 필요**: 반복 날짜 생성 로직

**필수 함수**:

1. **generateRepeatDates**
   ```typescript
   /**
    * 반복 일정의 모든 날짜를 생성
    * @param event - 일정 정보
    * @returns 생성된 날짜 문자열 배열 (YYYY-MM-DD 형식)
    */
   export function generateRepeatDates(event: EventForm): string[]
   ```
   - 입력: EventForm (title, date, repeat 등)
   - 출력: 날짜 문자열 배열 ['2025-11-01', '2025-11-08', ...]
   - 로직:
     1. 시작일, 반복 유형, 간격, 종료일 추출
     2. 반복 유형에 따라 적절한 함수 호출
     3. 종료 조건 확인 (종료일 또는 최대 개수)
     4. 날짜 배열 반환

2. **addDailyInterval**
   ```typescript
   /**
    * 매일 반복 날짜 계산
    */
   function addDailyInterval(startDate: Date, interval: number): Date
   ```
   - 로직: startDate + (interval * 일)

3. **addWeeklyInterval**
   ```typescript
   /**
    * 매주 반복 날짜 계산
    */
   function addWeeklyInterval(startDate: Date, interval: number): Date
   ```
   - 로직: startDate + (interval * 7일)

4. **addMonthlyInterval**
   ```typescript
   /**
    * 매월 반복 날짜 계산
    * 특수 처리: 31일이 없는 달은 건너뛰기
    */
   function addMonthlyInterval(startDate: Date, interval: number): Date | null
   ```
   - 로직:
     1. startDate의 일(day) 저장
     2. startDate + interval개월
     3. 결과 날짜의 일(day)이 원래 일과 다르면 null 반환
     4. 예: 1월 31일 + 1개월 = 2월 31일(존재 안 함) → null

5. **addYearlyInterval**
   ```typescript
   /**
    * 매년 반복 날짜 계산
    * 특수 처리: 윤년 2월 29일은 평년 건너뛰기
    */
   function addYearlyInterval(startDate: Date, interval: number): Date | null
   ```
   - 로직:
     1. startDate가 2월 29일인지 확인
     2. 결과 연도가 윤년인지 확인
     3. 평년이면 null 반환

6. **getDefaultEndDate**
   ```typescript
   /**
    * 종료일 미지정 시 기본 종료일 계산
    * @param startDate - 시작일
    * @returns 1년 후 날짜 문자열
    */
   function getDefaultEndDate(startDate: string): string
   ```
   - 로직: startDate + 1년

7. **validateRepeatEndDate**
   ```typescript
   /**
    * 반복 종료일 검증
    * @returns 검증 오류 메시지 또는 null
    */
   export function validateRepeatEndDate(
     startDate: string,
     endDate: string
   ): string | null
   ```
   - 로직:
     1. endDate < startDate → "반복 종료일은 시작일 이후여야 합니다"
     2. 정상 → null

---

### 3.6 제약사항

#### 3.6.1 비즈니스 제약사항
1. **최대 반복 개수**: 100개
   - 종료일 미지정 시 최대 100개 일정만 생성
   - 100개 초과 시 100개에서 중단

2. **기본 종료일**: 1년 후
   - 종료일 미지정 시 시작일 + 1년

3. **특수 날짜 처리**:
   - 31일 + 매월 반복 → 31일 없는 달 건너뛰기
   - 2월 29일 + 매년 반복 → 평년 건너뛰기
   - 건너뛴 날짜는 생성하지 않음 (오류 아님)

4. **반복 간격 범위**: 1 이상 정수
   - UI에서 min=1로 제한 (이미 구현됨)

#### 3.6.2 기술 제약사항
1. **날짜 형식**: YYYY-MM-DD (ISO 8601)
2. **시간대**: 로컬 시간 (타임존 고려 안 함)
3. **브라우저 호환성**: ES6+ Date API 사용
4. **서버 의존성**: `/api/events-list` 엔드포인트 필수

#### 3.6.3 성능 제약사항
1. **일괄 저장**: 반복 일정은 단일 API 호출로 저장 (N번 호출 금지)
2. **메모리 제한**: 최대 100개 일정 배열 메모리 사용

---

## 4. 검증 체크리스트

### 4.1 기능 검증

#### 반복 유형별 정상 동작:
- [ ] 매일 반복 - 시작일부터 종료일까지 매일 생성
- [ ] 매주 반복 - 같은 요일로 매주 생성
- [ ] 매월 반복 - 같은 날짜로 매월 생성
- [ ] 매년 반복 - 같은 월일로 매년 생성

#### 반복 간격:
- [ ] 간격 1 - 연속 생성
- [ ] 간격 2 - 하나씩 건너뛰며 생성
- [ ] 간격 7 (주간) - 7주마다 생성

#### 특수 날짜:
- [ ] 1월 31일 + 매월 1개월 → 2월 건너뛰기, 3월 31일 생성
- [ ] 2024년 2월 29일 + 매년 1년 → 2025년 건너뛰기, 2028년 2월 29일 생성

#### 종료 조건:
- [ ] 종료일 지정 - 해당 날짜까지만 생성
- [ ] 종료일 미지정 - 1년 후까지 생성
- [ ] 100개 제한 - 종료일 관계없이 100개에서 중단

#### UI 동작:
- [ ] 반복 체크박스 OFF → 반복 옵션 숨김
- [ ] 반복 체크박스 ON → 반복 옵션 표시
- [ ] 반복 간격 < 1 입력 불가
- [ ] 반복 일정 생성 시 겹침 경고 없음

#### API 연동:
- [ ] POST /api/events-list 호출 확인
- [ ] Request body에 events 배열 포함
- [ ] Response에 repeat.id 포함 확인
- [ ] 생성된 일정이 캘린더에 표시

---

### 4.2 오류 처리 검증

#### 입력 검증:
- [ ] 반복 종료일 < 시작일 → 에러 스낵바
- [ ] 제목 미입력 → 기존 검증 동작
- [ ] 시작시간 > 종료시간 → 기존 검증 동작

#### 엣지 케이스:
- [ ] 반복 종료일 = 시작일 → 1개만 생성
- [ ] 시작일이 과거 → 정상 생성 (검증 안 함)
- [ ] 종료일 100년 후 → 100개 제한 적용

---

### 4.3 통합 검증

#### 기존 기능 영향:
- [ ] 단일 일정 생성 - 정상 동작
- [ ] 일정 수정 - 정상 동작 (반복 일정은 개별 수정)
- [ ] 일정 삭제 - 정상 동작 (반복 일정은 개별 삭제)
- [ ] 일정 검색 - 반복 일정 포함
- [ ] 알림 - 반복 일정 각각 알림

#### 데이터 무결성:
- [ ] 반복 일정 모두 동일한 repeat.id
- [ ] 각 일정은 고유한 id
- [ ] date 필드만 다르고 나머지 동일

---

## 5. 다음 단계

이 명세서를 바탕으로 test-designer 에이전트가 테스트 케이스를 설계합니다.
