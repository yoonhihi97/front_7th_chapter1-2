# 테스트 설계 문서: 반복 유형 선택 기능 (Phase 1)

**파일 위치**: `.claude/test-designs/test-repeat-event.md`
**대상 기능**: 반복 유형 선택 UI 및 상태 관리
**작성일**: 2025-10-29
**버전**: 1.1 (Phase 1 - 반복 유형 선택만 집중)

---

## 1. 분석 결과

### 1.1 Phase 1 목표
**반복 유형 선택 기능만 구현**
- 반복 여부 선택 (체크박스) ← 이미 활성화됨
- 반복 유형 선택 (드롭다운): daily, weekly, monthly, yearly
- 반복 간격 입력 (숫자): 1 이상
- 반복 종료일 선택 (선택사항): 날짜 입력

### 1.2 구현 범위

**구현할 것**:
1. **App.tsx 주석 해제**
   - 라인 85-89: `setRepeatType`, `setRepeatInterval`, `setRepeatEndDate` setter 활성화
   - 라인 446-483: 반복 UI 컴포넌트 주석 해제
   - 라인 43-44: import 수정 (RepeatType 추가)

2. **UI 동작**
   - 반복 체크박스 ON → 반복 옵션 표시
   - 드롭다운에서 유형 선택 가능
   - 숫자 입력에서 간격 입력 가능 (min=1)
   - 선택사항: 종료일 입력

3. **상태 관리**
   - `useEventForm` 훅에서 상태 유지
   - `repeatType`, `repeatInterval`, `repeatEndDate` 값 저장
   - RepeatInfo 객체 생성

### 1.3 제외되는 기능 (Phase 2~5에서 구현)
- 반복 날짜 배열 생성 (Phase 2)
- 반복 일정 서버 저장 (Phase 2)
- 반복 일정 표시 (Phase 2)
- 반복 일정 수정 (Phase 4)
- 반복 일정 삭제 (Phase 5)

---

## 2. 테스트 전략

### 2.1 테스트 범위

**테스트 대상**:
- UI 컴포넌트 렌더링 (조건부 표시)
- 입력 값 상태 관리
- 드롭다운 값 선택
- 숫자 입력 검증 (min=1)
- 종료일 선택 (선택사항)

**테스트하지 않는 것**:
- 날짜 계산 로직 (Phase 2)
- API 호출 (Phase 2)
- 반복 일정 저장 (Phase 2)

### 2.2 테스트 케이스

**총 13개 테스트 케이스**:
- UI 렌더링: 4개
- 반복 유형 선택: 4개
- 반복 간격 입력: 3개
- 반복 종료일 선택: 2개

---

## 3. 상세 테스트 시나리오

### 3.1 UI 렌더링 (4개)

#### RT-1: 반복 체크박스 OFF 시 반복 옵션 숨김
```
Given: 반복 체크박스가 선택되지 않음 (isRepeating = false)
When: 컴포넌트 렌더링
Then: 반복 유형, 간격, 종료일 입력 필드가 숨겨짐
```

#### RT-2: 반복 체크박스 ON 시 반복 옵션 표시
```
Given: 반복 체크박스가 선택됨 (isRepeating = true)
When: 컴포넌트 렌더링
Then: 반복 유형 드롭다운, 간격 입력, 종료일 입력이 표시됨
```

#### RT-3: 반복 유형 드롭다운에 4개 옵션 표시
```
Given: 반복 체크박스 ON
When: 반복 유형 드롭다운 열기
Then: 4개 옵션 표시 (매일, 매주, 매월, 매년)
```

#### RT-4: 반복 간격 입력에 min=1 제한
```
Given: 반복 체크박스 ON
When: 반복 간격 입력 필드 확인
Then: HTML min="1" 속성 있음
```

### 3.2 반복 유형 선택 (4개)

#### RS-1: 매일(daily) 선택 → 상태 업데이트
```
Given: 반복 체크박스 ON
When: 드롭다운에서 "매일" 선택
Then: repeatType = 'daily' 저장됨
```

#### RS-2: 매주(weekly) 선택 → 상태 업데이트
```
Given: 반복 체크박스 ON
When: 드롭다운에서 "매주" 선택
Then: repeatType = 'weekly' 저장됨
```

#### RS-3: 매월(monthly) 선택 → 상태 업데이트
```
Given: 반복 체크박스 ON
When: 드롭다운에서 "매월" 선택
Then: repeatType = 'monthly' 저장됨
```

#### RS-4: 매년(yearly) 선택 → 상태 업데이트
```
Given: 반복 체크박스 ON
When: 드롭다운에서 "매년" 선택
Then: repeatType = 'yearly' 저장됨
```

### 3.3 반복 간격 입력 (3개)

#### RI-1: 간격 1 입력
```
Given: 반복 체크박스 ON
When: 간격 입력에 "1" 입력
Then: repeatInterval = 1 저장됨
```

#### RI-2: 간격 2 입력
```
Given: 반복 체크박스 ON
When: 간격 입력에 "2" 입력
Then: repeatInterval = 2 저장됨
```

#### RI-3: 간격 0 입력 불가 (UI 제한)
```
Given: 반복 체크박스 ON
When: 간격 입력에 "0" 입력 시도
Then: 입력 필드에서 min=1로 인해 제한됨
```

### 3.4 반복 종료일 선택 (2개)

#### RE-1: 종료일 미입력 (선택사항)
```
Given: 반복 체크박스 ON
When: 종료일 입력 필드 비워둠
Then: repeatEndDate = '' (empty string) 저장됨
```

#### RE-2: 종료일 입력 예시
```
Given: 반복 체크박스 ON
When: 종료일 입력에 "2025-12-31" 입력
Then: repeatEndDate = '2025-12-31' 저장됨
```

---

## 4. 테스트 케이스 요약

| ID | 케이스 | 예상 결과 |
|----|--------|---------|
| RT-1 | 반복 체크박스 OFF | 반복 옵션 숨김 |
| RT-2 | 반복 체크박스 ON | 반복 옵션 표시 |
| RT-3 | 드롭다운 열기 | 4개 옵션 표시 |
| RT-4 | 간격 입력 필드 | min=1 제한 있음 |
| RS-1 | "매일" 선택 | repeatType='daily' |
| RS-2 | "매주" 선택 | repeatType='weekly' |
| RS-3 | "매월" 선택 | repeatType='monthly' |
| RS-4 | "매년" 선택 | repeatType='yearly' |
| RI-1 | 간격 "1" 입력 | repeatInterval=1 |
| RI-2 | 간격 "2" 입력 | repeatInterval=2 |
| RI-3 | 간격 "0" 입력 | 제한됨 (min=1) |
| RE-1 | 종료일 비워둠 | repeatEndDate='' |
| RE-2 | 종료일 입력 | repeatEndDate='2025-12-31' |

---

## 5. 테스트 파일 구조

```typescript
// src/__tests__/unit/easy.repeatEventUtils.spec.ts (Phase 1용)
describe('반복 유형 선택 기능', () => {
  describe('UI 렌더링', () => {
    it('RT-1: 반복 체크박스 OFF 시 반복 옵션 숨김', () => { });
    it('RT-2: 반복 체크박스 ON 시 반복 옵션 표시', () => { });
    it('RT-3: 반복 유형 드롭다운에 4개 옵션 표시', () => { });
    it('RT-4: 반복 간격 입력에 min=1 제한', () => { });
  });

  describe('반복 유형 선택', () => {
    it('RS-1: 매일(daily) 선택 → 상태 업데이트', () => { });
    it('RS-2: 매주(weekly) 선택 → 상태 업데이트', () => { });
    it('RS-3: 매월(monthly) 선택 → 상태 업데이트', () => { });
    it('RS-4: 매년(yearly) 선택 → 상태 업데이트', () => { });
  });

  describe('반복 간격 입력', () => {
    it('RI-1: 간격 1 입력', () => { });
    it('RI-2: 간격 2 입력', () => { });
    it('RI-3: 간격 0 입력 불가 (UI 제한)', () => { });
  });

  describe('반복 종료일 선택', () => {
    it('RE-1: 종료일 미입력 (선택사항)', () => { });
    it('RE-2: 종료일 입력 예시', () => { });
  });
});
```

---

## 6. 다음 단계

이 테스트 설계를 바탕으로 test-code-writer 에이전트가 실제 테스트 코드를 작성합니다.

**생성될 파일**: `src/__tests__/unit/easy.repeatEventUtils.spec.ts` (Phase 1용)
**총 테스트 수**: 13개

**주의**: Phase 2 이후에 `generateRepeatDates`, `validateRepeatEndDate` 함수 테스트는 별도 파일에서 작성될 예정입니다.
