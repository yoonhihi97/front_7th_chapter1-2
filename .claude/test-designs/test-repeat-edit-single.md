# 반복 일정 단일 수정 기능 (1단계) - 테스트 설계 명세서

**작성일**: 2025-10-29
**버전**: 1.0
**단계**: 1/2
**상태**: 테스트 설계 완료

---

## 1. 개요

### 1.1 테스트 전략
- **테스트 파일**: `src/__tests__/integration/repeat-edit-single.spec.tsx`
- **테스트 유형**: 통합 테스트 (UI + Hook + API 모킹)
- **테스트 라이브러리**: Vitest + React Testing Library + MSW
- **총 테스트 수**: 13개 (Happy: 5개, Boundary: 3개, Error: 2개, State: 3개)

### 1.2 핵심 검증 포인트
1. **다이얼로그 조건**: `editingEvent && editingEvent.repeat.type !== 'none'`
2. **API 요청**: `repeat.type = 'none'` 포함
3. **반복 아이콘**: 자동 제거 (repeat.type !== 'none' 조건)
4. **폼 초기화**: resetForm 호출
5. **에러 처리**: 필수값 검증, API 실패 처리

---

## 2. 테스트 케이스 설계

### 2.1 Happy Path (정상 시나리오)

#### TC-1: 반복 일정 수정 시 다이얼로그 표시
```
Given: 반복 일정을 수정 중 (editingEvent.repeat.type = 'weekly')
When: "일정 수정" 버튼 클릭
Then: "해당 일정만 수정하시겠어요?" 다이얼로그 표시됨
```

**검증 포인트**:
- `isEditRepeatDialogOpen === true`
- 다이얼로그 텍스트 표시
- 버튼: "예", "아니오"

#### TC-2: "예" 버튼 클릭 시 단일 일정으로 변환
```
Given: 다이얼로그 표시 중 (repeat.type = 'weekly')
When: "예" 버튼 클릭
Then: repeat.type이 'none'으로 변경되어 API 호출
```

**검증 포인트**:
- API 요청: `PUT /api/events/:id`
- 요청 본문: `repeat: { type: 'none', interval: 1 }`
- 다이얼로그 닫힘: `isEditRepeatDialogOpen === false`

#### TC-3: "예" 후 반복 아이콘 제거
```
Given: 단일 수정 완료 (repeat.type = 'none')
When: 캘린더 목록 갱신
Then: 반복 아이콘(EventRepeat) 사라짐
```

**검증 포인트**:
- 반복 아이콘 요소 없음
- 일정 정보는 변경됨 (제목 등)

#### TC-4: "예" 후 폼 초기화
```
Given: 단일 수정 완료
When: saveEvent 호출 후
Then: 폼 초기화됨
```

**검증 포인트**:
- `editingEvent === null`
- 입력 필드 비워짐
- 제출 버튼 텍스트: "일정 추가"로 복원

#### TC-5: 스낵바 메시지 표시
```
Given: "예" 버튼 클릭, API 성공
When: fetchEvents() 완료
Then: 성공 스낵바 표시
```

**검증 포인트**:
- 스낵바 메시지: "일정이 수정되었습니다."
- variant: "success"

---

### 2.2 Boundary Cases (경계 케이스)

#### TC-6: 단일 일정 수정 시 다이얼로그 표시 안 함
```
Given: 단일 일정 수정 중 (repeat.type = 'none')
When: "일정 수정" 버튼 클릭
Then: 다이얼로그 표시 안 됨 (겹침 체크 진행)
```

**검증 포인트**:
- `isEditRepeatDialogOpen === false`
- 다이얼로그 요소 없음
- 겹침 체크 로직 진행

#### TC-7: 신규 반복 일정 생성 시 다이얼로그 표시 안 함
```
Given: 신규 반복 일정 생성 중 (editingEvent === null)
When: "일정 추가" 버튼 클릭
Then: 다이얼로그 표시 안 됨 (신규 생성 로직 진행)
```

**검증 포인트**:
- `editingEvent === null` → 다이얼로그 조건 미충족
- 신규 생성 로직 진행
- 반복 일정 생성 가능

#### TC-8: "아니오" 버튼 클릭 시 다이얼로그만 닫음
```
Given: 다이얼로그 표시 중
When: "아니오" 버튼 클릭
Then: 다이얼로그 닫힘, 폼 유지
```

**검증 포인트**:
- 다이얼로그 닫힘: `isEditRepeatDialogOpen === false`
- API 호출 없음
- 폼 데이터 유지: 입력값 그대로

---

### 2.3 Error Cases (오류 처리)

#### TC-9: API 호출 실패 시 에러 처리
```
Given: "예" 버튼 클릭
When: PUT /api/events/:id 실패 (500)
Then: 에러 스낵바 표시
```

**검증 포인트**:
- API 호출: `PUT /api/events/:id`
- 응답: 500 상태
- 에러 스낵바: "일정 저장 실패"
- 폼 유지: 다시 수정 가능

#### TC-10: 필수값 누락 시 다이얼로그 표시 전 검증
```
Given: 제목 비움 (필수값 누락)
When: "일정 수정" 버튼 클릭
Then: 검증 에러 표시, 다이얼로그 표시 안 함
```

**검증 포인트**:
- 검증 에러: "필수 정보를 모두 입력해주세요."
- 다이얼로그 표시 안 됨
- API 호출 없음

---

### 2.4 State Cases (상태 관리)

#### TC-11: 다이얼로그 상태 초기화
```
Given: 다이얼로그 표시 중 ("예" 클릭 or "아니오" 클릭)
When: 다이얼로그 배경 클릭 (onClose)
Then: 다이얼로그 닫힘, 상태 초기화
```

**검증 포인트**:
- `isEditRepeatDialogOpen === false`
- 폼 데이터 유지
- 다시 열 수 있음

#### TC-12: editingEvent 상태 변경
```
Given: 반복 일정 A 수정 중 (다이얼로그 표시)
When: 반복 일정 B 선택
Then: editingEvent 변경, 폼 갱신
```

**검증 포인트**:
- `editingEvent` 변경
- 다이얼로그 닫힘
- 폼에 새 일정 데이터 표시

#### TC-13: 같은 일정 재수정
```
Given: 단일 일정으로 변환됨 (repeat.type = 'none')
When: 같은 일정 재편집 → "일정 수정" 클릭
Then: 다이얼로그 표시 안 됨 (단일 일정이므로)
```

**검증 포인트**:
- 다이얼로그 표시 안 됨
- 단일 일정 수정 로직 진행
- 반복 정보 없음

---

## 3. Mock 데이터

### 3.1 반복 일정 (주간)
```typescript
const weeklyEvent: Event = {
  id: 'event-weekly-1',
  title: '팀 미팅',
  date: '2025-11-05',
  startTime: '10:00',
  endTime: '11:00',
  description: '팀 스탠드업',
  location: '회의실 A',
  category: '업무',
  repeat: {
    type: 'weekly',
    interval: 1,
    endDate: '2025-12-31',
    id: 'repeat-uuid-1'
  },
  notificationTime: 10
};
```

### 3.2 단일 일정
```typescript
const singleEvent: Event = {
  id: 'event-single-1',
  title: '일일 일정',
  date: '2025-11-10',
  startTime: '14:00',
  endTime: '15:00',
  description: '단일 일정',
  location: '사무실',
  category: '업무',
  repeat: {
    type: 'none',
    interval: 1
  },
  notificationTime: 5
};
```

### 3.3 API 응답 (성공)
```typescript
{
  id: 'event-weekly-1',
  title: '팀 미팅 (취소)',  // 수정됨
  date: '2025-11-05',
  repeat: {
    type: 'none',          // 변경됨
    interval: 1
  },
  // ... 기타 필드
}
```

---

## 4. 테스트 파일 구조

```
src/__tests__/integration/repeat-edit-single.spec.tsx
├── 1. 테스트 설정 (setup, Mock)
├── 2. Happy Path (TC-1 ~ TC-5)
├── 3. Boundary Cases (TC-6 ~ TC-8)
├── 4. Error Cases (TC-9 ~ TC-10)
└── 5. State Cases (TC-11 ~ TC-13)
```

---

## 5. 기존 테스트 패턴 참고

### 5.1 통합 테스트 패턴
**파일**: `src/__tests__/medium.integration.spec.tsx`
- `setup()` 헬퍼 함수
- `ThemeProvider + SnackbarProvider` 래퍼
- `userEvent` 시뮬레이션

### 5.2 Dialog 테스트 패턴
**파일**: `src/__tests__/medium.integration.spec.tsx`
- `getByRole('dialog')`
- `getByText()` 버튼 선택
- `userEvent.click()`

### 5.3 반복 아이콘 테스트 패턴
**파일**: `src/__tests__/integration/repeat-icon-display.spec.tsx`
- 반복 아이콘 렌더링 조건: `repeat.type !== 'none'`
- `getByTestId('repeat-icon')`

### 5.4 Mock 패턴
**파일**: `src/__mocks__/handlers.ts`
- MSW로 API 모킹
- `http.put('/api/events/:id', ...)`
- `HttpResponse.json()`

---

## 6. 검증 체크리스트

### 6.1 테스트 커버리지
- [ ] 다이얼로그 표시 조건 (2가지: 반복/단일)
- [ ] "예" 버튼 동작
- [ ] "아니오" 버튼 동작
- [ ] 배경 클릭 (닫기)
- [ ] API 호출 (성공/실패)
- [ ] 폼 초기화
- [ ] 반복 아이콘 제거
- [ ] 스낵바 메시지
- [ ] 필수값 검증

### 6.2 상태 관리
- [ ] `isEditRepeatDialogOpen` 상태
- [ ] `editingEvent` 상태
- [ ] 폼 입력값 상태

### 6.3 오류 처리
- [ ] API 실패
- [ ] 필수값 누락
- [ ] 네트워크 오류

---

## 7. 다음 단계

**test-code-writer 에이전트**가:
1. `src/__tests__/integration/repeat-edit-single.spec.tsx` 파일 생성
2. 13개 테스트 케이스 구현
3. MSW 핸들러 설정
4. 기존 패턴 재사용
