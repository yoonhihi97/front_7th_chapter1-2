# 반복 일정 전체 수정 기능 (2단계) 명세서

**작성일**: 2025-10-29
**버전**: 1.0
**단계**: 2/2
**상태**: 기능 설계 완료, 테스트 설계 대기

---

## 1. 개요

### 1.1 배경
1단계에서 "해당 일정만 수정하시겠어요?" 다이얼로그가 구현되었습니다. 2단계에서는 "아니오" 버튼을 구현하여 같은 반복 시리즈의 모든 일정을 한 번에 수정하는 기능을 추가합니다.

### 1.2 목적
사용자가 반복 일정을 수정하고 "아니오 (전체 시리즈)"를 선택했을 때, 같은 `repeat.id`를 가진 모든 일정이 동시에 수정됩니다.

### 1.3 사용 사례

**AS A** 일정 관리 시스템 사용자
**I WANT** 반복되는 일정의 시간을 변경하려고 하고
**SO THAT** 모든 반복 일정이 일괄적으로 업데이트됩니다.

**시나리오: 전체 수정**
1. 매주 화요일 팀 미팅 (10:00-11:00) (반복 일정)
2. 시간을 14:00-15:00으로 변경
3. "일정 수정" 버튼 클릭
4. 다이얼로그: "해당 일정만 수정하시겠어요?"
5. "아니오" 선택
6. **결과**: 모든 화요일 팀 미팅이 14:00-15:00으로 변경
7. 반복 아이콘 유지됨

---

## 2. 범위

### 2.1 IN SCOPE (2단계)
- ✅ "아니오" 버튼 동작: handleEditAllEvents 함수
- ✅ updateRecurringEvents 함수 (useEventOperations)
- ✅ PUT /api/recurring-events/:repeatId 핸들러 (Mock)
- ✅ repeat.type, repeat.id 유지
- ✅ 반복 아이콘 유지

### 2.2 OUT OF SCOPE
- ❌ 다이얼로그 UI (1단계에서 완성됨)
- ❌ "예" 버튼 동작 (1단계)
- ❌ "이후 모든 일정 수정" (향후 구현)

---

## 3. 상세 요구사항

### 3.1 데이터 변환

**수정 전** (반복 일정):
```typescript
{
  id: "event-123",
  title: "팀 미팅",
  date: "2025-11-05",
  startTime: "10:00",
  endTime: "11:00",
  repeat: {
    type: "weekly",      // 유지됨
    interval: 1,
    endDate: "2025-12-31",
    id: "repeat-uuid"    // 유지됨
  }
}
```

**수정 후** (같은 repeat.id의 모든 일정):
```typescript
// API 요청: title, startTime, endTime만 보냄
{
  title: "팀 미팅",
  startTime: "14:00",    // 변경됨
  endTime: "15:00",      // 변경됨
  description: "...",
  location: "...",
  category: "...",
  notificationTime: 10
}

// 서버 응답: 모든 시리즈가 업데이트됨
{
  id: "event-123",
  date: "2025-11-05",
  startTime: "14:00",    // 변경됨
  endTime: "15:00",      // 변경됨
  repeat: {
    type: "weekly",      // 유지됨
    interval: 1,
    endDate: "2025-12-31",
    id: "repeat-uuid"    // 유지됨
  }
}
```

### 3.2 수정 가능/불가능 필드

**수정 가능** (API에 전송):
- title
- startTime
- endTime
- description
- location
- category
- notificationTime

**수정 불가능** (서버에서 무시):
- id
- date
- repeat.type
- repeat.interval
- repeat.endDate
- repeat.id

### 3.3 UI 변경 (App.tsx)

#### "아니오" 버튼 연결
```typescript
<Button onClick={handleEditAllEvents}>
  아니오
</Button>
```

#### handleEditAllEvents 함수 추가
```typescript
const handleEditAllEvents = async () => {
  setIsEditRepeatDialogOpen(false);

  if (!editingEvent || !editingEvent.repeat.id) return;

  // 전체 수정용 데이터 (date, repeat 제외)
  const updateData = {
    title,
    startTime,
    endTime,
    description,
    location,
    category,
    notificationTime,
  };

  await updateRecurringEvents(editingEvent.repeat.id, updateData);
  resetForm();
};
```

### 3.4 Hook 변경 (useEventOperations.ts)

#### updateRecurringEvents 함수 추가
```typescript
/**
 * 같은 repeat.id를 가진 모든 반복 일정을 수정합니다.
 * @param repeatId - 반복 시리즈 ID
 * @param updateData - 수정할 필드 (title, startTime, endTime 등)
 */
const updateRecurringEvents = async (repeatId: string, updateData: Partial<Event>) => {
  try {
    const response = await fetch(`/api/recurring-events/${repeatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update recurring events');
    }

    await fetchEvents();
    onSave?.();
    enqueueSnackbar('반복 일정이 모두 수정되었습니다.', { variant: 'success' });
  } catch (error) {
    console.error('Error updating recurring events:', error);
    enqueueSnackbar('반복 일정 수정 실패', { variant: 'error' });
  }
};
```

#### 반환값에 함수 추가
```typescript
return {
  events,
  fetchEvents,
  saveEvent,
  deleteEvent,
  updateRecurringEvents  // 신규 추가
};
```

### 3.5 Mock 데이터 (handlers.ts)

#### PUT /api/recurring-events/:repeatId 핸들러 추가
```typescript
http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
  const { repeatId } = params;
  const updateData = (await request.json()) as Partial<Event>;

  // 같은 repeatId를 가진 모든 일정 찾기 및 수정
  const updatedEvents = events.map(event => {
    if (event.repeat.id === repeatId) {
      return {
        ...event,
        title: updateData.title || event.title,
        startTime: updateData.startTime || event.startTime,
        endTime: updateData.endTime || event.endTime,
        description: updateData.description || event.description,
        location: updateData.location || event.location,
        category: updateData.category || event.category,
        notificationTime: updateData.notificationTime || event.notificationTime,
        // id, date, repeat는 유지
      };
    }
    return event;
  });

  const updatedSeries = updatedEvents.filter(e => e.repeat.id === repeatId);

  if (updatedSeries.length === 0) {
    return new HttpResponse(null, { status: 404 });
  }

  return HttpResponse.json(updatedSeries);
}),
```

### 3.6 API 호출 시퀀스

```
사용자 → 반복 일정 편집 (예: 시간 변경)
  → "일정 수정" 버튼 클릭
  → 다이얼로그 표시: "해당 일정만 수정하시겠어요?"
  → "아니오" 클릭
    ↓
  handleEditAllEvents() 호출
    ↓
  updateRecurringEvents(repeatId, updateData) 호출
    ↓
  PUT /api/recurring-events/:repeatId 호출
    Request: { title, startTime, endTime, ... }
    Response: [{ 모든 시리즈 업데이트된 일정 }, ...]
    ↓
  fetchEvents() 호출 (전체 목록 갱신)
    ↓
  스낵바: "반복 일정이 모두 수정되었습니다."
    ↓
  폼 초기화
```

### 3.7 제약사항

#### 비즈니스
- 같은 repeat.id를 가진 모든 일정이 영향받음 (과거 일정도 포함)
- 취소 불가능 (되돌리기 없음)
- date는 변경 불가능 (각 일정의 날짜 유지)

#### 기술
- repeat.id가 반드시 존재해야 함 (없으면 에러)
- API: PUT /api/recurring-events/:repeatId (서버 이미 구현)
- onSave 콜백으로 폼 초기화

#### UI
- 스낵바 메시지: "반복 일정이 모두 수정되었습니다."
- "아니오" 클릭 후 다이얼로그 닫힘

---

## 4. 파일 수정

| 파일 | 변경 |
|------|------|
| `src/App.tsx` | handleEditAllEvents 함수 추가, "아니오" 버튼 연결 |
| `src/hooks/useEventOperations.ts` | updateRecurringEvents 함수 추가 |
| `src/__mocks__/handlers.ts` | PUT /api/recurring-events/:repeatId 핸들러 추가 |

---

## 5. 검증 체크리스트

### 5.1 기능 검증
- [ ] "아니오" 버튼 클릭 시 updateRecurringEvents 호출
- [ ] 같은 repeat.id의 모든 일정 수정됨
- [ ] repeat.type 유지됨
- [ ] repeat.id 유지됨
- [ ] 반복 아이콘 유지됨
- [ ] 다른 시리즈는 영향 없음

### 5.2 오류 처리
- [ ] repeat.id 없는 경우 에러 처리
- [ ] API 호출 실패 시 에러 스낵바
- [ ] 필수값 누락 시 다이얼로그 표시 전 검증

### 5.3 통합
- [ ] 1단계 기능 영향 없음
- [ ] 캘린더 목록 자동 갱신
- [ ] 스낵바 메시지 명확함

---

## 6. 다음 단계

테스트 설계 → 테스트 코드 → 구현 → 리팩토링 → 커밋
