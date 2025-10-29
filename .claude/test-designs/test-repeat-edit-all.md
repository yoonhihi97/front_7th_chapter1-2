# 반복 일정 전체 수정 기능 (2단계) - 테스트 설계 명세서

**작성일**: 2025-10-29
**버전**: 1.0
**단계**: 2/2
**상태**: 테스트 설계 완료

---

## 1. 개요

### 1.1 테스트 전략
- **테스트 파일**: `src/__tests__/integration/repeat-edit-all.spec.tsx`
- **테스트 유형**: 통합 테스트 (UI + Hook + API 모킹)
- **테스트 라이브러리**: Vitest + React Testing Library + MSW
- **총 테스트 수**: 15개 (Happy: 6개, Boundary: 4개, Error: 3개, State: 2개)

### 1.2 핵심 검증 포인트
1. **"아니오" 버튼 동작**: handleEditAllEvents → updateRecurringEvents 호출
2. **API 요청**: PUT /api/recurring-events/:repeatId with 수정 데이터
3. **모든 시리즈 일정 수정**: 같은 repeat.id의 모든 일정 변경
4. **repeat.type, repeat.id 유지**: 반복 정보 유지
5. **반복 아이콘 유지**: repeat.type !== 'none' 조건 유지
6. **에러 처리**: API 실패, repeat.id 없는 경우

---

## 2. 테스트 케이스 설계

### 2.1 Happy Path (6개)

#### TC-1: "아니오" 버튼 클릭 시 updateRecurringEvents 호출
```
Given: 반복 일정 수정 다이얼로그 표시 중
When: "아니오" 버튼 클릭
Then: handleEditAllEvents → updateRecurringEvents 호출
```

**검증 포인트**:
- API 호출: `PUT /api/recurring-events/:repeatId`
- 다이얼로그 닫힘
- fetchEvents() 호출

#### TC-2: API 요청에 수정 데이터 포함
```
Given: "아니오" 버튼 클릭
When: updateRecurringEvents 호출
Then: PUT /api/recurring-events/:repeatId
      Body: { title, startTime, endTime, description, location, category, notificationTime }
```

**검증 포인트**:
- 요청 URL: `/api/recurring-events/{repeatId}`
- 요청 메서드: PUT
- 요청 본문: 수정 필드만 포함
- date, repeat는 포함하지 않음

#### TC-3: 같은 repeat.id의 모든 일정 수정됨
```
Given: 3개의 반복 일정 (같은 repeat.id)
When: "아니오" 클릭 → 제목 변경
Then: 3개 모두 제목 변경됨
```

**검증 포인트**:
- 같은 repeat.id의 모든 일정 조회 가능
- 모든 일정이 수정됨
- 나머지 필드는 유지됨

#### TC-4: repeat.type, repeat.id 유지
```
Given: repeat.type = 'weekly', repeat.id = 'uuid-1'
When: 전체 수정
Then: repeat.type = 'weekly' (유지)
      repeat.id = 'uuid-1' (유지)
```

**검증 포인트**:
- repeat.type 변경 없음
- repeat.id 변경 없음
- repeat.interval, endDate도 유지

#### TC-5: 반복 아이콘 유지
```
Given: 전체 수정 완료
When: 캘린더 목록 갱신
Then: 반복 아이콘(EventRepeat) 유지됨
```

**검증 포인트**:
- repeat.type !== 'none' 조건 확인
- EventRepeat 아이콘 렌더링 확인

#### TC-6: 스낵바 메시지 표시
```
Given: API 성공
When: fetchEvents 완료
Then: "반복 일정이 모두 수정되었습니다." 표시
```

**검증 포인트**:
- 스낵바 메시지: "반복 일정이 모두 수정되었습니다."
- variant: "success"
- 메시지 자동 닫힘

---

### 2.2 Boundary Cases (4개)

#### TC-7: repeat.id가 없는 경우 에러 처리
```
Given: editingEvent.repeat.id === undefined
When: "아니오" 버튼 클릭
Then: 조기 반환 (아무 동작 안 함)
```

**검증 포인트**:
- API 호출 없음
- 다이얼로그 닫히지 않음
- 에러 메시지 없음 (silent fail)

#### TC-8: 같은 repeat.id의 일정이 1개인 경우
```
Given: 반복 일정 1개만 존재 (repeat.id = 'uuid-1')
When: "아니오" 클릭 → 수정
Then: 1개만 수정됨 (정상 동작)
```

**검증 포인트**:
- API 호출 성공
- 1개 일정 수정됨
- 스낵바 메시지 표시

#### TC-9: 서로 다른 repeat.id의 일정들 (영향 없음)
```
Given: 2개 시리즈 (repeat-id-A: 3개, repeat-id-B: 2개)
When: A 시리즈 수정 (제목 변경)
Then: A 시리즈만 수정, B는 원래대로 유지
```

**검증 포인트**:
- A 시리즈: 3개 모두 제목 변경
- B 시리즈: 2개 모두 원래 제목 유지
- 다른 repeat.id는 영향 없음

#### TC-10: 다이얼로그 닫힘 확인
```
Given: "아니오" 버튼 클릭
When: handleEditAllEvents 실행
Then: isEditRepeatDialogOpen = false
```

**검증 포인트**:
- Dialog 요소 없음 (queryByRole('dialog') === null)
- 폼 입력값 유지 (아직 초기화 전)

---

### 2.3 Error Cases (3개)

#### TC-11: API 호출 실패 시 에러 처리
```
Given: "아니오" 버튼 클릭
When: PUT /api/recurring-events/:repeatId 실패 (500)
Then: 에러 스낵바 "반복 일정 수정 실패"
```

**검증 포인트**:
- API 호출 실행됨
- 에러 스낵바: "반복 일정 수정 실패"
- variant: "error"
- 일정 목록 갱신 안 됨

#### TC-12: repeat.id 없는 반복 일정 수정 시도
```
Given: repeat.type = 'weekly', repeat.id = undefined
When: "아니오" 버튼 클릭
Then: 조기 반환, API 호출 없음
```

**검증 포인트**:
- API 호출 없음
- 콘솔 에러 없음
- 조용히 실패 (silent fail)

#### TC-13: 필수값 누락 시 다이얼로그 표시 전 검증
```
Given: 제목 비움
When: "일정 수정" 버튼 클릭
Then: 검증 에러 표시, 다이얼로그 표시 안 됨
```

**검증 포인트**:
- 검증 에러: "필수 정보를 모두 입력해주세요."
- 다이얼로그 표시 안 됨
- API 호출 없음

---

### 2.4 State Cases (2개)

#### TC-14: 폼 초기화 확인
```
Given: 전체 수정 완료
When: onSave 콜백 호출
Then: editingEvent = null, 폼 초기화
```

**검증 포인트**:
- 제목 입력값: '' (빈 상태)
- 날짜 입력값: '' (빈 상태)
- "일정 추가" 제목 표시
- 버튼 텍스트: "일정 추가"

#### TC-15: 다이얼로그 대기 중 다른 일정 선택
```
Given: 반복 일정 A 다이얼로그 표시 중
When: 반복 일정 B 선택 (editingEvent 변경)
Then: 다이얼로그 닫힘, 폼 갱신 (B 데이터)
```

**검증 포인트**:
- 다이얼로그 닫힘 (useEffect에서 자동 처리)
- 폼에 B 데이터 표시
- editingEvent = B

---

## 3. Mock 데이터

### 3.1 여러 반복 시리즈 Mock

```typescript
/**
 * 반복 시리즈 A (주간, 3개 일정)
 * repeat.id = 'repeat-id-A'
 */
const weeklySeriesA: Event[] = [
  {
    id: 'event-a-1',
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
      id: 'repeat-id-A'
    },
    notificationTime: 10,
  },
  {
    id: 'event-a-2',
    title: '팀 미팅',
    date: '2025-11-12',
    startTime: '10:00',
    endTime: '11:00',
    description: '팀 스탠드업',
    location: '회의실 A',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-A'
    },
    notificationTime: 10,
  },
  {
    id: 'event-a-3',
    title: '팀 미팅',
    date: '2025-11-19',
    startTime: '10:00',
    endTime: '11:00',
    description: '팀 스탠드업',
    location: '회의실 A',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-A'
    },
    notificationTime: 10,
  }
];

/**
 * 반복 시리즈 B (주간, 2개 일정)
 * repeat.id = 'repeat-id-B'
 */
const weeklySeriesB: Event[] = [
  {
    id: 'event-b-1',
    title: '개발 회의',
    date: '2025-11-06',
    startTime: '14:00',
    endTime: '15:00',
    description: '개발 팀 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-B'
    },
    notificationTime: 10,
  },
  {
    id: 'event-b-2',
    title: '개발 회의',
    date: '2025-11-13',
    startTime: '14:00',
    endTime: '15:00',
    description: '개발 팀 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-B'
    },
    notificationTime: 10,
  }
];
```

---

## 4. Mock 핸들러 구현

### 4.1 setupMockHandlerRecurringUpdate 유틸 추가

**파일**: `src/__mocks__/handlersUtils.ts`

```typescript
export const setupMockHandlerRecurringUpdate = (initEvents: Event[] = []) => {
  const mockEvents: Event[] = [...initEvents];

  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events: mockEvents });
    }),
    http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
      const { repeatId } = params;
      const updateData = (await request.json()) as Partial<Event>;

      // 같은 repeatId를 가진 모든 일정 찾기 및 수정
      let updatedCount = 0;
      const updatedEvents = mockEvents.map(event => {
        if (event.repeat.id === repeatId) {
          updatedCount++;
          return {
            ...event,
            title: updateData.title || event.title,
            startTime: updateData.startTime || event.startTime,
            endTime: updateData.endTime || event.endTime,
            description: updateData.description || event.description,
            location: updateData.location || event.location,
            category: updateData.category || event.category,
            notificationTime: updateData.notificationTime ?? event.notificationTime,
            // id, date, repeat는 유지
          };
        }
        return event;
      });

      if (updatedCount === 0) {
        return new HttpResponse(null, { status: 404 });
      }

      // mockEvents 업데이트 (실제 배열 수정)
      mockEvents.length = 0;
      mockEvents.push(...updatedEvents);

      const updatedSeries = updatedEvents.filter(e => e.repeat.id === repeatId);
      return HttpResponse.json(updatedSeries);
    })
  );
};
```

---

## 5. 검증 체크리스트

### 5.1 API 호출 검증
- [ ] `PUT /api/recurring-events/:repeatId` 호출
- [ ] repeatId = `editingEvent.repeat.id`
- [ ] Body에 수정 데이터 포함 (title, startTime, endTime, ...)
- [ ] date, repeat는 포함하지 않음

### 5.2 상태 검증
- [ ] 같은 repeat.id의 모든 일정 수정됨
- [ ] repeat.type 유지됨
- [ ] repeat.id 유지됨
- [ ] 다른 시리즈는 영향 없음

### 5.3 UI 검증
- [ ] 반복 아이콘(EventRepeat) 유지됨
- [ ] 다이얼로그 닫힘
- [ ] 스낵바 메시지 표시
- [ ] 폼 초기화

### 5.4 에러 처리 검증
- [ ] repeat.id 없을 때 조기 반환
- [ ] API 실패 시 에러 스낵바
- [ ] 필수값 누락 시 검증

---

## 6. 다음 단계

**test-code-writer 에이전트**가:
1. `src/__tests__/integration/repeat-edit-all.spec.tsx` 파일 생성
2. 15개 테스트 케이스 구현
3. setupMockHandlerRecurringUpdate 유틸 추가
4. 1단계 테스트 패턴 재사용
