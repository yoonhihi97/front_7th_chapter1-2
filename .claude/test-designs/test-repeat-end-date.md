# 테스트 설계 문서: 반복 종료 조건 지정 기능

**작성일**: 2025-10-29
**대상 기능**: 반복 종료일 검증 및 적용
**테스트 파일**: 
- `src/__tests__/unit/easy.repeatEndDate.spec.ts` (유틸 함수 테스트)
- 기존 통합 테스트 확장 (필요 시)
**총 테스트 수**: 15개

---

## 1. 기존 코드 구조 분석 ✅

### 1.1 실제 UI 구현 확인
- `App.tsx` 478-486라인: 반복 종료일 입력 UI 이미 구현됨
- `useEventForm.ts` 23라인: `repeatEndDate` 상태 관리 구현됨
- 데이터 타입: `RepeatInfo.endDate?: string` 이미 정의됨

### 1.2 기존 테스트 패턴 확인
- **유틸 함수 테스트**: `easy.*.spec.ts` 파일들
- 테스트 구조: `describe` → `it` with Given-When-Then
- 예시: `easy.dateUtils.spec.ts`, `easy.eventUtils.spec.ts`

### 1.3 구현할 함수 (명세서 기반)
1. `validateRepeatEndDate(startDate, endDate)`: 종료일 검증
2. `getDefaultEndDate(startDate)`: 기본 종료일 계산 (1년 후, 최대 2025-12-31)
3. `generateRepeatDates(baseEvent)`: 반복 날짜 배열 생성 (종료일 적용)

---

## 2. 테스트 전략

### 2.1 테스트 분류

| 카테고리 | 개수 | 목적 |
|---------|------|------|
| 종료일 검증 | 4개 | validateRepeatEndDate 함수 |
| 기본 종료일 계산 | 3개 | getDefaultEndDate 함수 |
| 날짜 생성 (종료일 적용) | 8개 | generateRepeatDates 함수 |

### 2.2 위험 영역

1. **종료일 미지정**: 기본값(1년 후) 제대로 적용되는가?
2. **2025-12-31 제한**: 1년 후가 2026년이면 2025-12-31로 제한되는가?
3. **종료일 = 시작일**: 1개만 생성되는가?
4. **100개 제한**: 종료일이 멀어도 100개에서 중단되는가?

---

## 3. 테스트 케이스

### 3.1 validateRepeatEndDate (4개)

#### VED-1: 종료일 빈 값 → null 반환
```typescript
Given: startDate = '2025-11-01', endDate = ''
When: validateRepeatEndDate(startDate, endDate)
Then: null 반환 (검증 통과)
```

#### VED-2: 종료일 = 시작일 → null 반환
```typescript
Given: startDate = '2025-11-01', endDate = '2025-11-01'
When: validateRepeatEndDate(startDate, endDate)
Then: null 반환 (허용)
```

#### VED-3: 종료일 > 시작일 → null 반환
```typescript
Given: startDate = '2025-11-01', endDate = '2025-12-31'
When: validateRepeatEndDate(startDate, endDate)
Then: null 반환 (정상)
```

#### VED-4: 종료일 < 시작일 → 에러 메시지 반환
```typescript
Given: startDate = '2025-11-01', endDate = '2025-10-31'
When: validateRepeatEndDate(startDate, endDate)
Then: '반복 종료일은 시작일 이후여야 합니다' 반환
```

---

### 3.2 getDefaultEndDate (3개)

#### GED-1: 1년 후 < 2025-12-31 → 1년 후 반환
```typescript
Given: startDate = '2024-11-01'
When: getDefaultEndDate(startDate)
Then: '2025-11-01' 반환
```

#### GED-2: 1년 후 > 2025-12-31 → 2025-12-31 반환
```typescript
Given: startDate = '2025-06-01'
When: getDefaultEndDate(startDate)
Then: '2025-12-31' 반환 (2026-06-01 대신)
```

#### GED-3: 1년 후 = 2025-12-31 → 2025-12-31 반환
```typescript
Given: startDate = '2024-12-31'
When: getDefaultEndDate(startDate)
Then: '2025-12-31' 반환
```

---

### 3.3 generateRepeatDates - 종료일 적용 (8개)

#### GRD-1: 종료일까지만 생성 (매일)
```typescript
Given: 
  - date = '2025-11-01'
  - repeat = { type: 'daily', interval: 1, endDate: '2025-11-05' }
When: generateRepeatDates(eventForm)
Then: ['2025-11-01', '2025-11-02', '2025-11-03', '2025-11-04', '2025-11-05'] (5개)
```

#### GRD-2: 종료일까지만 생성 (매주)
```typescript
Given: 
  - date = '2025-11-01' (토요일)
  - repeat = { type: 'weekly', interval: 1, endDate: '2025-11-30' }
When: generateRepeatDates(eventForm)
Then: ['2025-11-01', '2025-11-08', '2025-11-15', '2025-11-22', '2025-11-29'] (5개)
```

#### GRD-3: 종료일 = 시작일 → 1개만 생성
```typescript
Given: 
  - date = '2025-11-01'
  - repeat = { type: 'daily', interval: 1, endDate: '2025-11-01' }
When: generateRepeatDates(eventForm)
Then: ['2025-11-01'] (1개)
```

#### GRD-4: 종료일 미지정 → 1년 후까지 생성
```typescript
Given: 
  - date = '2024-11-01'
  - repeat = { type: 'monthly', interval: 1, endDate: '' }
When: generateRepeatDates(eventForm)
Then: 13개 생성 (2024-11-01부터 2025-11-01까지)
```

#### GRD-5: 1년 후 > 2025-12-31 → 2025-12-31까지만 생성
```typescript
Given: 
  - date = '2025-06-01'
  - repeat = { type: 'monthly', interval: 1, endDate: '' }
When: generateRepeatDates(eventForm)
Then: 7개 생성 (2025-06-01부터 2025-12-01까지, 2025-12-31 내)
```

#### GRD-6: 100개 제한 - 종료일보다 우선
```typescript
Given: 
  - date = '2024-01-01'
  - repeat = { type: 'daily', interval: 1, endDate: '2025-12-31' }
When: generateRepeatDates(eventForm)
Then: 100개만 생성 (총 730일이지만 100개 제한)
```

#### GRD-7: 2025-12-31 제한 - 종료일보다 우선
```typescript
Given: 
  - date = '2025-11-01'
  - repeat = { type: 'daily', interval: 1, endDate: '2026-12-31' }
When: generateRepeatDates(eventForm)
Then: 2025-12-31까지만 생성 (61개)
```

#### GRD-8: 특수 날짜 처리 + 종료일
```typescript
Given: 
  - date = '2025-01-31'
  - repeat = { type: 'monthly', interval: 1, endDate: '2025-06-30' }
When: generateRepeatDates(eventForm)
Then: ['2025-01-31', '2025-03-31', '2025-05-31'] (3개)
  (2025-02-31 없음 → 건너뛰기, 2025-04-31 없음 → 건너뛰기)
```

---

## 4. 테스트 파일 구조

```typescript
// src/__tests__/unit/easy.repeatEndDate.spec.ts

describe('validateRepeatEndDate', () => {
  it('VED-1: 종료일 빈 값 → null 반환', () => { });
  it('VED-2: 종료일 = 시작일 → null 반환', () => { });
  it('VED-3: 종료일 > 시작일 → null 반환', () => { });
  it('VED-4: 종료일 < 시작일 → 에러 메시지 반환', () => { });
});

describe('getDefaultEndDate', () => {
  it('GED-1: 1년 후 < 2025-12-31 → 1년 후 반환', () => { });
  it('GED-2: 1년 후 > 2025-12-31 → 2025-12-31 반환', () => { });
  it('GED-3: 1년 후 = 2025-12-31 → 2025-12-31 반환', () => { });
});

describe('generateRepeatDates - 종료일 적용', () => {
  it('GRD-1: 종료일까지만 생성 (매일)', () => { });
  it('GRD-2: 종료일까지만 생성 (매주)', () => { });
  it('GRD-3: 종료일 = 시작일 → 1개만 생성', () => { });
  it('GRD-4: 종료일 미지정 → 1년 후까지 생성', () => { });
  it('GRD-5: 1년 후 > 2025-12-31 → 2025-12-31까지만 생성', () => { });
  it('GRD-6: 100개 제한 - 종료일보다 우선', () => { });
  it('GRD-7: 2025-12-31 제한 - 종료일보다 우선', () => { });
  it('GRD-8: 특수 날짜 처리 + 종료일', () => { });
});
```

---

## 5. 테스트 데이터

### 샘플 EventForm
```typescript
const baseEventForm: EventForm = {
  title: '테스트 일정',
  date: '2025-11-01',
  startTime: '10:00',
  endTime: '11:00',
  description: '설명',
  location: '위치',
  category: '업무',
  repeat: {
    type: 'daily',
    interval: 1,
    endDate: '2025-11-05'
  },
  notificationTime: 10
};
```

---

## 6. 다음 단계

**test-code-writer 에이전트**에서 실제 테스트 코드 작성:
- 파일: `src/__tests__/unit/easy.repeatEndDate.spec.ts`
- 15개 테스트 케이스 구현
- RED 단계 확인 (테스트 실패)

