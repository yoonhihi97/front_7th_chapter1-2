# 기능 명세서: 반복 종료 조건 지정 기능

**작성일**: 2025-10-29
**버전**: 1.0
**담당 영역**: 일정 관리 시스템 - 반복 일정 종료 조건

---

## 1. 개요

### 1.1 배경
현재 반복 일정 UI가 활성화되어 있고(App.tsx 478-486라인), `repeatEndDate` 상태 관리도 구현되어 있으나, **실제 반복 일정 생성 시 종료 조건을 적용하는 로직**이 구현되지 않았습니다.

### 1.2 목적
사용자가 반복 종료일을 지정하면, 시스템이 해당 날짜까지만 반복 일정을 생성합니다. 종료일 미지정 시에는 기본적으로 1년 후까지 생성하되, 최대 100개로 제한합니다.

### 1.3 사용 사례

**AS A** 일정 관리 시스템 사용자
**I WANT** 반복 일정의 종료 날짜를 지정하고
**SO THAT** 특정 기간 동안만 반복되는 일정을 생성할 수 있습니다

**예시**:
- 2025-11-01부터 2025-12-31까지 매주 목요일 회의
- 2025-11-01부터 1년간 매월 1일 리포트 제출

---

## 2. 범위 (Scope)

### 2.1 IN SCOPE

#### 포함 항목:
1. **반복 종료일 입력**: UI는 이미 구현됨 (App.tsx 478-486)
2. **종료일 검증**: 시작일 이후 날짜만 허용
3. **종료일까지만 생성**: 반복 일정 생성 시 종료일 적용
4. **기본 종료일**: 미지정 시 1년 후 (2025-12-31 최대)
5. **최대 100개 제한**: 종료일 관계없이 100개 제한

#### 제외 항목 (OUT OF SCOPE):
1. **반복 횟수 지정**: "10회 반복" 같은 옵션 (향후 구현)
2. **종료일 이후 수정**: 반복 시리즈의 종료일 변경 (향후 구현)
3. **무한 반복**: 종료일 없이 계속 반복 (최대 1년/100개로 제한)

---

## 3. 상세 요구사항

### 3.1 데이터 구조

#### 3.1.1 기존 데이터 (변경 없음)
```typescript
// src/types.ts
export interface RepeatInfo {
  type: RepeatType;
  interval: number;
  endDate?: string;  // 이미 정의됨
}
```

#### 3.1.2 데이터 변경 사항
**없음** - 기존 타입이 이미 완벽히 정의됨

---

### 3.2 UI 동작

#### 3.2.1 반복 종료일 입력 (이미 구현됨)

**위치**: App.tsx 478-486라인

```tsx
<FormControl fullWidth>
  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
  <TextField
    id="repeat-end-date"
    size="small"
    type="date"
    value={repeatEndDate}
    onChange={(e) => setRepeatEndDate(e.target.value)}
  />
</FormControl>
```

#### 3.2.2 검증 규칙

1. **빈 값 허용**: 종료일 미지정 시 → 기본 1년 후
2. **시작일 이후**: 종료일 < 시작일 → "반복 종료일은 시작일 이후여야 합니다" 에러
3. **최대 날짜**: 2025-12-31 넘으면 → 2025-12-31로 제한

---

### 3.3 유틸 함수 (신규 또는 수정)

#### 3.3.1 기존 함수 수정: generateRepeatDates

**위치**: `src/utils/repeatEventUtils.ts` (존재하지 않으면 생성)

```typescript
/**
 * 반복 일정 날짜 배열 생성
 * @param baseEvent - 기본 일정 정보
 * @returns 반복 날짜 배열 (최대 100개, 종료일까지)
 */
export function generateRepeatDates(baseEvent: EventForm): string[]
```

**주요 로직**:
1. `repeat.endDate`가 있으면 해당 날짜까지만 생성
2. `repeat.endDate`가 없으면 1년 후까지 생성
3. 2025-12-31을 초과하지 않도록 제한
4. 최대 100개까지만 생성
5. 특수 날짜 처리 (31일, 윤년 2월 29일)

#### 3.3.2 신규 함수: validateRepeatEndDate

**위치**: `src/utils/repeatEventUtils.ts`

```typescript
/**
 * 반복 종료일 검증
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @param endDate - 종료일 (YYYY-MM-DD)
 * @returns 검증 오류 메시지 또는 null
 */
export function validateRepeatEndDate(
  startDate: string,
  endDate: string
): string | null {
  if (!endDate) return null; // 빈 값 허용
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    return '반복 종료일은 시작일 이후여야 합니다';
  }
  
  return null;
}
```

#### 3.3.3 신규 함수: getDefaultEndDate

**위치**: `src/utils/repeatEventUtils.ts`

```typescript
/**
 * 기본 반복 종료일 계산
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @returns 1년 후 날짜 (최대 2025-12-31)
 */
export function getDefaultEndDate(startDate: string): string {
  const start = new Date(startDate);
  const oneYearLater = new Date(start);
  oneYearLater.setFullYear(start.getFullYear() + 1);
  
  const maxDate = new Date('2025-12-31');
  
  return oneYearLater > maxDate
    ? '2025-12-31'
    : oneYearLater.toISOString().split('T')[0];
}
```

---

### 3.4 Hook 변경

#### 3.4.1 useEventOperations.ts

**현재 상태**: `saveEvent` 함수가 단일 일정만 저장
**필요 변경**: 반복 일정 생성 시 `generateRepeatDates` 호출

```typescript
// saveEvent 함수 내부
if (eventData.repeat.type !== 'none') {
  // 종료일 검증
  if (eventData.repeat.endDate) {
    const error = validateRepeatEndDate(eventData.date, eventData.repeat.endDate);
    if (error) {
      enqueueSnackbar(error, { variant: 'error' });
      return;
    }
  }
  
  // 기본 종료일 설정
  const endDate = eventData.repeat.endDate || getDefaultEndDate(eventData.date);
  
  // 반복 날짜 생성
  const dates = generateRepeatDates({
    ...eventData,
    repeat: {
      ...eventData.repeat,
      endDate
    }
  });
  
  // 각 날짜에 대한 Event 객체 배열 생성
  const events = dates.map(date => ({
    ...eventData,
    date,
    repeat: {
      ...eventData.repeat,
      endDate
    }
  }));
  
  // /api/events-list 호출
  response = await fetch('/api/events-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });
} else {
  // 기존 단일 일정 로직
}
```

---

### 3.5 제약사항

#### 3.5.1 비즈니스 제약사항

1. **최대 반복 개수**: 100개
   - 종료일이 1년 후여도 100개 초과하면 100개에서 중단
   
2. **기본 종료일**: 1년 후
   - 종료일 미지정 시 시작일 + 1년
   
3. **최대 날짜**: 2025-12-31
   - 예제 특성상 2025년까지만 생성
   
4. **특수 날짜 처리**:
   - 31일 + 매월 반복 → 31일 없는 달 건너뛰기
   - 2월 29일 + 매년 반복 → 평년 건너뛰기

#### 3.5.2 검증 규칙

1. **종료일 < 시작일**: 에러 메시지 표시, 저장 중단
2. **빈 종료일**: 기본 1년 후로 설정
3. **종료일 = 시작일**: 1개만 생성 (허용)

---

## 4. 검증 체크리스트

### 4.1 기능 검증

#### 종료일 지정:
- [ ] 종료일까지만 일정 생성
- [ ] 종료일 = 시작일 → 1개만 생성
- [ ] 종료일 > 2025-12-31 → 2025-12-31까지만 생성

#### 종료일 미지정:
- [ ] 1년 후까지 생성
- [ ] 1년 후 > 2025-12-31 → 2025-12-31까지만 생성
- [ ] 최대 100개 제한 적용

#### 검증:
- [ ] 종료일 < 시작일 → 에러 스낵바 표시
- [ ] 종료일 빈 값 → 정상 동작 (기본값 적용)

### 4.2 오류 처리 검증

#### 입력 검증:
- [ ] 종료일 < 시작일 → "반복 종료일은 시작일 이후여야 합니다"
- [ ] 에러 메시지 스낵바 표시
- [ ] 일정 저장 중단

### 4.3 통합 검증

#### 기존 기능 영향:
- [ ] 단일 일정 생성 - 정상 동작
- [ ] 반복 아이콘 표시 - 정상 동작 (종료일 표시)
- [ ] 일정 검색 - 반복 일정 포함

---

## 5. 다음 단계

이 명세서를 바탕으로 **test-designer 에이전트**가 테스트 케이스를 설계합니다.

**핵심 테스트 영역**:
1. 종료일 지정 시 해당 날짜까지만 생성
2. 종료일 미지정 시 1년 후까지 생성
3. 종료일 검증 (시작일 이후)
4. 최대 100개 제한
5. 2025-12-31 제한

