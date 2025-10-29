# 테스트 설계 문서: 캘린더 뷰 반복 일정 아이콘 표시

**작성일**: 2025-10-29
**대상 기능**: EventRepeat 아이콘 조건부 렌더링
**테스트 파일**: `src/__tests__/integration/repeat-icon-display.spec.tsx`
**총 테스트 수**: 19개

---

## 1. 테스트 전략

### 1.1 테스트 분류

| 카테고리 | 개수 | 목적 |
|---------|------|------|
| 아이콘 표시 정확성 | 8개 | 5가지 repeat.type 검증 + 뷰별 검증 |
| 복합 상태 | 4개 | 알림 + 반복 조합 검증 |
| UI/UX | 4개 | 스타일 및 레이아웃 검증 |
| 회귀 | 3개 | 기존 기능 영향 없음 검증 |

### 1.2 위험 영역

1. **조건부 렌더링 누락**: `event.repeat.type !== 'none'` 조건
2. **뷰별 불일치**: 월간 뷰에만 추가하고 주간 뷰 누락
3. **아이콘 순서 오류**: [반복] [알림] [제목]으로 잘못 배치
4. **스타일 불일치**: fontSize 또는 spacing 다르게 적용

---

## 2. 테스트 케이스

### 2.1 아이콘 표시 정확성 (8개)

#### IC-1: 단일 일정 - 반복 아이콘 표시 안 됨
- Given: `repeat.type = 'none'`
- When: 월간 뷰 렌더링
- Then: EventRepeat 아이콘 미표시

#### IC-2~IC-5: 반복 유형별 아이콘 표시
- IC-2: `repeat.type = 'daily'` → EventRepeat 표시
- IC-3: `repeat.type = 'weekly'` → EventRepeat 표시
- IC-4: `repeat.type = 'monthly'` → EventRepeat 표시
- IC-5: `repeat.type = 'yearly'` → EventRepeat 표시

#### IC-6: 월간 뷰에서 반복 아이콘 표시
- Given: `repeat.type = 'weekly'`
- When: 월간 뷰 렌더링
- Then: EventRepeat 아이콘 표시

#### IC-7: 주간 뷰에서 반복 아이콘 표시
- Given: `repeat.type = 'weekly'`
- When: 주간 뷰로 전환
- Then: EventRepeat 아이콘 표시

#### IC-8: 월간/주간 뷰 전환 일관성
- Given: 동일한 반복 일정
- When: 월간/주간 뷰 전환
- Then: 두 뷰 모두 아이콘 표시

### 2.2 복합 상태 테스트 (4개)

#### CS-1: 알림만 있는 일정
- Given: `isNotified=true, repeat.type='none'`
- Then: Notifications 아이콘만 표시

#### CS-2: 반복만 있는 일정
- Given: `isNotified=false, repeat.type='weekly'`
- Then: EventRepeat 아이콘만 표시

#### CS-3: 알림 + 반복 일정
- Given: `isNotified=true, repeat.type='weekly'`
- Then: 두 아이콘 모두 표시, 순서: [Notifications] [EventRepeat] [제목]

#### CS-4: 일반 일정
- Given: `isNotified=false, repeat.type='none'`
- Then: 아이콘 없이 제목만 표시

### 2.3 UI/UX 테스트 (4개)

#### UI-1: 아이콘 크기 일치
- Then: Notifications와 EventRepeat 모두 `fontSize="small"`

#### UI-2: 아이콘 정렬
- Then: `alignItems="center"` 유지

#### UI-3: 아이콘 간격
- Then: `spacing={1}` 유지

#### UI-4: 제목 말줄임표
- Given: 긴 제목 + 2개 아이콘
- Then: `noWrap` 유지

### 2.4 회귀 테스트 (3개)

#### RG-1: 기존 알림 기능 정상 동작
- Given: `isNotified=true, repeat.type='none'`
- Then: Notifications 아이콘 정상 표시

#### RG-2: 일정 클릭 기능 정상 동작
- When: 일정 제목 클릭
- Then: 수정 폼 열림

#### RG-3: 검색 필터링 정상 동작
- When: 검색어 입력
- Then: 필터링된 반복 일정에 아이콘 표시

---

## 3. 테스트 데이터

### 반복 일정 샘플
```typescript
{
  id: '1',
  title: '주간 팀 미팅',
  date: '2025-11-01',
  repeat: { type: 'weekly', interval: 1 }
}
```

### 복합 상태 샘플
```typescript
{
  id: '2',
  title: '중요 회의',
  date: '2025-11-01',
  repeat: { type: 'weekly', interval: 1 },
  notificationTime: 10
}
```

---

## 4. 테스트 파일 구조

```typescript
describe('캘린더 뷰 반복 일정 아이콘 표시', () => {
  describe('아이콘 표시 정확성', () => {
    it('IC-1: 단일 일정 - 반복 아이콘 표시 안 됨', () => { });
    // IC-2 ~ IC-8
  });

  describe('복합 상태 테스트', () => {
    // CS-1 ~ CS-4
  });

  describe('UI/UX 테스트', () => {
    // UI-1 ~ UI-4
  });

  describe('회귀 테스트', () => {
    // RG-1 ~ RG-3
  });
});
```

---

## 5. 다음 단계

**test-code-writer 에이전트**에서 실제 테스트 코드 작성