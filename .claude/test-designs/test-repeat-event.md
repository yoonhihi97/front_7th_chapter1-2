# 테스트 설계 문서: 반복 일정 선택 기능

**파일 위치**: `.claude/test-designs/test-repeat-event.md`
**대상 기능**: 반복 일정 자동 생성 (generateRepeatDates, validateRepeatEndDate)
**작성일**: 2025-10-29

---

## 1. 분석 결과

### 1.1 기존 코드 구조

#### 타입 정의 (src/types.ts)
```typescript
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatInfo {
  type: RepeatType;
  interval: number;
  endDate?: string;
}

export interface EventForm {
  title: string;
  date: string;  // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;
  description: string;
  location: string;
  category: string;
  repeat: RepeatInfo;
  notificationTime: number;
}
```

### 1.2 구현할 기능

**미구현 함수**:
1. `generateRepeatDates(event: EventForm): string[]`
   - 반복 날짜 배열 생성

2. `validateRepeatEndDate(startDate: string, endDate: string): string | null`
   - 종료일 검증

---

## 2. 테스트 전략

### 2.1 충족성 기준

**테스트 분류**:
- Happy Path: 정상 동작 (8개)
- Boundary Cases: 경계 조건 (8개)
- Special Cases: 특수 날짜 (6개)
- Error Cases: 오류 처리 (3개)
- **총 25개 테스트 케이스**

---

## 3. 테스트 시나리오

### 3.1 Happy Path - 정상 동작

#### HP-1: 매일 반복 (간격 1)
```
Given: 2025-10-29 시작, daily, 간격 1, 종료일 2025-11-02
When: generateRepeatDates 호출
Then: 5개 날짜 반환 (10/29, 10/30, 10/31, 11/01, 11/02)
```

#### HP-2: 매일 반복 (간격 2)
```
Given: 2025-10-29 시작, daily, 간격 2, 종료일 2025-11-04
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (10/29, 10/31, 11/02, 11/04)
```

#### HP-3: 매주 반복 (간격 1)
```
Given: 2025-10-29(수) 시작, weekly, 간격 1, 종료일 2025-11-19
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (10/29, 11/05, 11/12, 11/19) - 모두 수요일
```

#### HP-4: 매주 반복 (간격 2)
```
Given: 2025-10-29 시작, weekly, 간격 2, 종료일 2025-11-26
When: generateRepeatDates 호출
Then: 3개 날짜 반환 (10/29, 11/12, 11/26)
```

#### HP-5: 매월 반복 (간격 1)
```
Given: 2025-10-15 시작, monthly, 간격 1, 종료일 2026-01-15
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (10/15, 11/15, 12/15, 01/15) - 모두 15일
```

#### HP-6: 매월 반복 (간격 3)
```
Given: 2025-10-15 시작, monthly, 간격 3, 종료일 2026-04-15
When: generateRepeatDates 호출
Then: 3개 날짜 반환 (10/15, 01/15, 04/15)
```

#### HP-7: 매년 반복 (간격 1)
```
Given: 2025-03-20 시작, yearly, 간격 1, 종료일 2028-03-20
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (2025/03/20, 2026/03/20, 2027/03/20, 2028/03/20)
```

#### HP-8: 매년 반복 (간격 2)
```
Given: 2025-06-10 시작, yearly, 간격 2, 종료일 2029-06-10
When: generateRepeatDates 호출
Then: 3개 날짜 반환 (2025/06/10, 2027/06/10, 2029/06/10)
```

### 3.2 Boundary Cases - 경계 조건

#### BC-1: 종료일 미지정 - daily 최대 개수
```
Given: 2025-01-01 시작, daily, 간격 1, 종료일 없음
When: generateRepeatDates 호출
Then: 최대 100개 반환 OR 1년(2026-01-01) 이전까지
```

#### BC-2: 종료일 미지정 - yearly
```
Given: 2025-10-29 시작, yearly, 간격 1, 종료일 없음
When: generateRepeatDates 호출
Then: 1개 반환 (1년 이내 같은 날짜 없음)
```

#### BC-3: 종료일 = 시작일
```
Given: 2025-10-29 시작, daily, 간격 1, 종료일 2025-10-29
When: generateRepeatDates 호출
Then: 1개 반환 (시작일만)
```

#### BC-4: 매월 반복 - 월초 (1일)
```
Given: 2025-10-01 시작, monthly, 간격 1, 종료일 2025-12-01
When: generateRepeatDates 호출
Then: 3개 날짜 반환 (10/01, 11/01, 12/01)
```

#### BC-5: 매월 반복 - 월말 (31일)
```
Given: 2025-10-31 시작, monthly, 간격 1, 종료일 2025-12-31
When: generateRepeatDates 호출
Then: 2개 날짜 반환 (10/31, 12/31) - 11월 31일 없음, 건너뜀
```

#### BC-6: 매월 반복 - 30일
```
Given: 2025-10-30 시작, monthly, 간격 1, 종료일 2026-03-30
When: generateRepeatDates 호출
Then: 5개 날짜 반환 (10/30, 11/30, 12/30, 01/30, 03/30) - 2월 건너뜀
```

#### BC-7: 매월 반복 - 29일 (윤년)
```
Given: 2024-01-29 시작, monthly, 간격 1, 종료일 2024-04-29
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (01/29, 02/29, 03/29, 04/29) - 2024년 윤년
```

#### BC-8: 최대 개수 제한 (100개)
```
Given: 2025-01-01 시작, daily, 간격 1, 종료일 2025-12-31 (365일)
When: generateRepeatDates 호출
Then: 정확히 100개 반환
```

### 3.3 Special Cases - 특수 날짜 처리

#### SC-1: 31일 + monthly → 2월 건너뛰기
```
Given: 2025-01-31 시작, monthly, 간격 1, 종료일 2025-03-31
When: generateRepeatDates 호출
Then: 2개 날짜 반환 (01/31, 03/31) - 2월 31일 없음
```

#### SC-2: 31일 + monthly → 30일 달 건너뛰기
```
Given: 2025-10-31 시작, monthly, 간격 1, 종료일 2025-12-31
When: generateRepeatDates 호출
Then: 2개 날짜 반환 (10/31, 12/31) - 11월 30일
```

#### SC-3: 29일 + monthly → 평년 2월 건너뛰기
```
Given: 2025-01-29 시작, monthly, 간격 1, 종료일 2025-03-29 (2025년은 평년)
When: generateRepeatDates 호출
Then: 2개 날짜 반환 (01/29, 03/29) - 평년 2월 28일
```

#### SC-4: 윤년 2월 29일 + yearly → 평년 건너뛰기
```
Given: 2024-02-29 시작, yearly, 간격 1, 종료일 2028-02-29
When: generateRepeatDates 호출
Then: 2개 날짜 반환 (2024/02/29, 2028/02/29) - 2025,2026,2027 건너뜀
```

#### SC-5: 윤년 2월 29일 + yearly - 간격 2
```
Given: 2024-02-29 시작, yearly, 간격 2, 종료일 2032-02-29
When: generateRepeatDates 호출
Then: 3개 날짜 반환 (2024/02/29, 2028/02/29, 2032/02/29) - 2026, 2030 건너뜀
```

#### SC-6: 윤년 2월 29일 + yearly - 간격 4 (모두 윤년)
```
Given: 2024-02-29 시작, yearly, 간격 4, 종료일 2036-02-29
When: generateRepeatDates 호출
Then: 4개 날짜 반환 (2024/02/29, 2028/02/29, 2032/02/29, 2036/02/29)
```

### 3.4 Error Cases - 오류 처리

#### EC-1: 반복 종료일 < 시작일
```
Given: startDate='2025-10-29', endDate='2025-10-28'
When: validateRepeatEndDate 호출
Then: "반복 종료일은 시작일 이후여야 합니다" 반환
```

#### EC-2: 종료일 = 시작일 (유효함)
```
Given: startDate='2025-10-29', endDate='2025-10-29'
When: validateRepeatEndDate 호출
Then: null 반환 (에러 없음)
```

#### EC-3: 종료일 > 시작일 (유효함)
```
Given: startDate='2025-10-29', endDate='2025-10-30'
When: validateRepeatEndDate 호출
Then: null 반환 (에러 없음)
```

---

## 4. 테스트 데이터셋

### 4.1 테스트용 고정 날짜
```typescript
const FIXED_DATES = {
  base: '2025-10-29',           // 기본 시작일 (수요일)
  leap: '2024-02-29',           // 윤년 2월 29일
  monthEnd31: '2025-10-31',     // 31일
  monthEnd30: '2025-10-30',     // 30일
  monthEnd29: '2024-01-29',     // 29일
  monthStart: '2025-10-01',     // 월초
};
```

### 4.2 헬퍼 함수
```typescript
const createEvent = (
  date: string,
  repeatType: RepeatType,
  interval: number,
  endDate?: string
): EventForm => ({
  title: 'Test Event',
  date,
  startTime: '09:00',
  endTime: '10:00',
  description: '',
  location: '',
  category: '업무',
  repeat: {
    type: repeatType,
    interval,
    endDate,
  },
  notificationTime: 10,
});
```

---

## 5. 실행 순서 제안

### Phase 1: 기본 기능 (P0)
1. **validateRepeatEndDate 구현 및 테스트** (EC-1, EC-2, EC-3)
2. **Happy Path - daily, weekly** (HP-1, HP-2, HP-3, HP-4)

### Phase 2: 월/년 반복 (P0)
3. **Happy Path - monthly, yearly** (HP-5, HP-6, HP-7, HP-8)

### Phase 3: 경계 조건 (P1)
4. **Boundary Cases - 기본** (BC-1, BC-2, BC-3, BC-4)
5. **Boundary Cases - 월말** (BC-5, BC-6, BC-7, BC-8)

### Phase 4: 특수 날짜 (P0)
6. **Special Cases** (SC-1 ~ SC-6)

---

## 6. 다음 단계

이 테스트 설계를 바탕으로 test-code-writer 에이전트가 실제 테스트 코드를 작성합니다.

**생성될 파일**: `src/__tests__/unit/easy.repeatEventUtils.spec.ts`
**총 테스트 수**: 25개 + 3개 공통 검증 = 28개
