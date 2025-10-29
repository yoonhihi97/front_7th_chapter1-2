# 반복 일정 단일 수정 기능 (1단계) 명세서

**작성일**: 2025-10-29
**버전**: 1.0
**단계**: 1/2
**상태**: 기능 설계 완료, 테스트 설계 대기

---

## 1. 개요

### 1.1 배경
반복 일정 수정 시 사용자가 "이 일정만 수정할지, 전체 시리즈를 수정할지" 선택할 수 없는 문제 해결의 첫 번째 단계입니다.

### 1.2 목적
사용자가 반복 일정을 수정하고 "예 (해당 일정만)"를 선택했을 때, 선택한 일정만 단일 일정으로 전환합니다.

### 1.3 사용 사례

**AS A** 캘린더 사용자
**I WANT** 반복되는 일정 중 특정 날짜의 일정만 변경하고
**SO THAT** 그 날짜의 일정은 단독으로 관리할 수 있습니다.

**시나리오: 단일 수정**
1. 매주 화요일 팀 미팅 (반복 일정)
2. 특정 화요일 편집 → 제목을 "팀 미팅 (취소)"로 변경
3. "일정 수정" 버튼 클릭
4. 다이얼로그: "해당 일정만 수정하시겠어요?"
5. "예" 선택
6. **결과**: 해당 화요일 일정만 수정, 반복 아이콘 사라짐

---

## 2. 범위

### 2.1 IN SCOPE (1단계)
- ✅ 다이얼로그 표시: 반복 일정 수정 시
- ✅ "예" 버튼 동작: repeat.type을 'none'으로 변경
- ✅ 기존 saveEvent 함수 활용
- ✅ 반복 아이콘 자동 제거 (기존 로직)

### 2.2 OUT OF SCOPE (2단계)
- ❌ "아니오" 버튼 동작
- ❌ 전체 반복 일정 수정
- ❌ 새로운 API 호출 (`/api/recurring-events/:repeatId`)

---

## 3. 상세 요구사항

### 3.1 데이터 변환

**수정 전** (반복 일정):
```typescript
{
  id: "event-123",
  title: "팀 미팅",
  date: "2025-11-05",
  repeat: {
    type: "weekly",      // 반복 유형
    interval: 1,
    endDate: "2025-12-31",
    id: "repeat-uuid"    // 반복 시리즈 ID
  }
}
```

**수정 후** (단일 일정):
```typescript
{
  id: "event-123",
  title: "팀 미팅 (취소)",  // 사용자가 수정한 값
  date: "2025-11-05",
  repeat: {
    type: "none",        // ← 핵심 변경
    interval: 1,
    // endDate, id 제거됨
  }
}
```

### 3.2 UI 변경 (App.tsx)

#### 3.2.1 상태 추가
```typescript
const [isEditRepeatDialogOpen, setIsEditRepeatDialogOpen] = useState(false);
```

#### 3.2.2 addOrUpdateEvent 함수 수정
```typescript
const addOrUpdateEvent = async () => {
  // 기존 검증 로직 (필수값, 시간)
  if (!title || !date || !startTime || !endTime) {
    enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
    return;
  }

  if (startTimeError || endTimeError) {
    enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
    return;
  }

  // 신규: 반복 일정 수정 확인 (1단계)
  if (editingEvent && editingEvent.repeat.type !== 'none') {
    setIsEditRepeatDialogOpen(true);
    return;  // 다이얼로그 표시 후 대기
  }

  // 기존 로직: 단일 일정 또는 신규 생성
  const eventData: Event | EventForm = {
    id: editingEvent ? editingEvent.id : undefined,
    title,
    date,
    startTime,
    endTime,
    description,
    location,
    category,
    repeat: editingEvent ? editingEvent.repeat : { type: 'none', interval: 1 },
    notificationTime,
  };

  const overlapping = findOverlappingEvents(eventData, events);
  if (overlapping.length > 0) {
    setOverlappingEvents(overlapping);
    setIsOverlapDialogOpen(true);
  } else {
    await saveEvent(eventData);
    resetForm();
  }
};
```

#### 3.2.3 handleEditSingleEvent 함수 추가
```typescript
const handleEditSingleEvent = async () => {
  setIsEditRepeatDialogOpen(false);

  if (!editingEvent) return;

  // 단일 일정으로 변환 (repeat.type = 'none')
  const singleEventData: Event = {
    id: editingEvent.id,
    title,
    date,
    startTime,
    endTime,
    description,
    location,
    category,
    repeat: {
      type: 'none',      // ← 핵심: 반복 제거
      interval: 1,
      // endDate, id 제거됨
    },
    notificationTime,
  };

  await saveEvent(singleEventData);
  resetForm();
};
```

#### 3.2.4 Dialog 컴포넌트 추가
```tsx
<Dialog
  open={isEditRepeatDialogOpen}
  onClose={() => setIsEditRepeatDialogOpen(false)}
>
  <DialogTitle>반복 일정 수정</DialogTitle>
  <DialogContent>
    <DialogContentText>
      해당 일정만 수정하시겠어요?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleEditSingleEvent} variant="contained">
      예
    </Button>
    <Button onClick={() => setIsEditRepeatDialogOpen(false)}>
      아니오
    </Button>
  </DialogActions>
</Dialog>
```

### 3.3 Mock 데이터
**변경 없음** - 기존 `PUT /api/events/:id` 핸들러 사용

### 3.4 Hook
**변경 없음** - `useEventOperations` 함수 그대로 사용

### 3.5 유틸
**변경 없음** - `repeatEventUtils` 그대로 사용

### 3.6 API 호출 시퀀스

```
1. 사용자 반복 일정 편집 (예: 제목 변경)
2. "일정 수정" 클릭
   ↓
3. addOrUpdateEvent() 호출
   - 필수값 검증
   - editingEvent.repeat.type !== 'none' 확인
   ↓
4. 다이얼로그 표시: "해당 일정만 수정하시겠어요?"
   ↓
5. 사용자 "예" 클릭
   ↓
6. handleEditSingleEvent() 호출
   - repeat.type = 'none' 설정
   - saveEvent(singleEventData) 호출
   ↓
7. API: PUT /api/events/:id
   Request: { id, title, repeat: { type: 'none', ... } }
   ↓
8. fetchEvents() (목록 갱신)
   ↓
9. 스낵바: "일정이 수정되었습니다."
   ↓
10. resetForm() (폼 초기화)
```

### 3.7 제약사항

#### 비즈니스
- 단일 수정 후 해당 일정은 반복 시리즈와 완전히 분리됨
- 다른 반복 일정은 영향 없음
- 취소할 수 없음 (되돌리기 불가)

#### 기술
- 기존 `saveEvent` 함수 재사용 (PUT /api/events/:id)
- repeat.type만 'none'으로 변경하면 자동 처리됨
- 아이콘은 조건부 렌더링 (repeat.type !== 'none')으로 자동 제거

#### UI
- 다이얼로그 문구: "해당 일정만 수정하시겠어요?"
- 버튼: "예", "아니오"
- "아니오" 클릭 시 다이얼로그 닫음 (폼 유지)

---

## 4. 검증 체크리스트

### 4.1 기능 검증
- [ ] 반복 일정 수정 시 다이얼로그 표시
- [ ] 단일 일정 수정 시 다이얼로그 표시 안 함
- [ ] 신규 반복 일정 생성 시 다이얼로그 표시 안 함
- [ ] "예" 클릭 시 해당 일정만 수정
- [ ] "예" 클릭 후 repeat.type = 'none'
- [ ] "예" 클릭 후 반복 아이콘 사라짐
- [ ] "아니오" 클릭 시 다이얼로그 닫고 폼 유지
- [ ] 다른 반복 일정은 영향 없음

### 4.2 오류 처리
- [ ] API 실패 시 에러 스낵바 표시
- [ ] 필수값 누락 시 다이얼로그 표시 전 검증
- [ ] 시간 오류 시 다이얼로그 표시 전 검증
- [ ] 네트워크 오류 처리

### 4.3 통합
- [ ] 캘린더 목록 자동 갱신
- [ ] 다른 기능 (삭제, 생성) 영향 없음
- [ ] 스낵바 메시지 명확함

---

## 5. 파일 수정

| 파일 | 변경 |
|------|------|
| `src/App.tsx` | 상태 추가, 함수 수정, 컴포넌트 추가 |
| 기타 | 변경 없음 |

---

## 6. 다음 단계

테스트 설계 → 테스트 코드 → 구현 → 리팩토링 → 커밋
