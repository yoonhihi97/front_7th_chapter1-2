# 테스트 설계 문서: 반복 일정 삭제 (v2 - 영역 기반)

**작성일**: 2025-10-30 (수정)
**버전**: 2.0
**대상 기능**: 반복 일정 삭제 기능
**테스트 파일**: `src/__tests__/integration/repeat-delete.spec.tsx`
**총 테스트 수**: 16개

---

## 1. 핵심 개선 사항

### 1.1 이전 버전의 문제
- `getAllByText()` 전체 화면 검색으로 인해 예상과 다른 개수 반환
- 캘린더 그리드 + 이벤트 목록에 동일 제목이 중복 표시됨

### 1.2 새로운 접근 (v2)
- **영역 기반 쿼리**: `within()` 사용으로 특정 영역만 검색
- 캘린더 영역: `data-testid="month-view"` 또는 `data-testid="week-view"`
- 이벤트 목록 영역: `data-testid="event-list"`

**쿼리 패턴 변경:**
```typescript
// ❌ 이전 (문제)
expect(screen.getAllByText('주간 회의')).toHaveLength(2);

// ✅ 새로운 (해결)
const monthView = screen.getByTestId('month-view');
expect(within(monthView).getAllByText('주간 회의').length).toBeGreaterThan(0);
```

---

## 2. App.tsx 구조 분석

### 2.1 캘린더 영역
```
<Stack data-testid="month-view">  또는  <Stack data-testid="week-view">
  <Table>
    <TableBody>
      {events.map(event => (
        <Typography>{event.title}</Typography>
        <EventRepeat data-testid="EventRepeatIcon" />
      ))}
    </TableBody>
  </Table>
</Stack>
```

### 2.2 이벤트 목록 영역
```
<Stack data-testid="event-list">
  {filteredEvents.map(event => (
    <Box>
      <Typography>{event.title}</Typography>
      <IconButton onClick={() => handleDeleteClick(event)}>
        <Delete />
      </IconButton>
    </Box>
  ))}
</Stack>
```

---

## 3. 테스트 케이스 (16개)

### 3.1 행복 경로 (7개)

#### HP-1: 단일 일정 삭제 - 다이얼로그 없이 즉시 삭제
- Given: `repeat.type = 'none'`인 일정
- When: 이벤트 목록에서 삭제 버튼 클릭
- Then:
  - 다이얼로그 미표시
  - `DELETE /api/events/{id}` 호출
  - 이벤트 목록에서 제거
  - 캘린더에서도 제거

#### HP-2: 반복 일정 삭제 - 다이얼로그 표시
- Given: `repeat.type = 'weekly'`인 일정
- When: 이벤트 목록에서 삭제 버튼 클릭
- Then:
  - 다이얼로그 열림
  - 텍스트: "해당 일정만 삭제하시겠어요?"
  - 버튼: "예", "아니오"

#### HP-3: 반복 일정 - 해당 일정만 삭제 (예)
- Given: 다이얼로그 표시, 반복 일정 2개 (같은 repeat.id)
- When: "예" 버튼 클릭
- Then:
  - `DELETE /api/events/{id}` 호출 (단일 삭제)
  - 이벤트 목록에서 1개만 제거
  - 캘린더에서 1개만 제거
  - 나머지 1개 유지

#### HP-4: 반복 일정 - 전체 삭제 (아니오)
- Given: 다이얼로그 표시, repeat.id = 'repeat-123'
- When: "아니오" 버튼 클릭
- Then:
  - `DELETE /api/recurring-events/repeat-123` 호출
  - 같은 repeat.id의 모든 일정 제거
  - 이벤트 목록 비워짐
  - 캘린더에서도 모두 제거

#### HP-5: 다이얼로그 - "예" 버튼 클릭 시 닫힘
- Given: 다이얼로그 열림
- When: "예" 버튼 클릭
- Then: 다이얼로그 닫힘

#### HP-6: 다이얼로그 - "아니오" 버튼 클릭 시 닫힘
- Given: 다이얼로그 열림
- When: "아니오" 버튼 클릭
- Then: 다이얼로그 닫힘

#### HP-7: 성공 메시지 표시
- Given: 삭제 완료
- When: Snackbar 확인
- Then: "일정이 삭제되었습니다." 메시지

### 3.2 경계 케이스 (4개)

#### BC-1: 캘린더에서 반복 일정 삭제 버튼 (없을 수도 있음)
- 캘린더는 읽기 전용, 이벤트 목록에서만 삭제

#### BC-2: 다이얼로그 Escape 키
- Given: 다이얼로그 열림
- When: Escape 키
- Then: 다이얼로그 닫힘, 삭제 안 됨

#### BC-3: 마지막 일정 삭제 후 목록 비움
- Given: 마지막 일정만 있음
- When: 삭제
- Then: "검색 결과가 없습니다." 메시지

#### BC-4: repeat.id 없는 경우
- Given: repeat.id가 없는 반복 일정
- When: "아니오" 클릭
- Then: 안전 처리 (오류 없음)

### 3.3 오류 케이스 (3개)

#### EC-1: 단일 삭제 API 실패 (500)
- Given: 단일 일정 삭제 시도
- When: 서버 500 에러
- Then:
  - 일정 유지
  - "일정 삭제 실패" 메시지

#### EC-2: 전체 삭제 API 실패 (500)
- Given: 반복 전체 삭제 시도
- When: 서버 500 에러
- Then:
  - 모든 일정 유지
  - "일정 삭제 실패" 메시지

#### EC-3: 네트워크 타임아웃
- Given: 삭제 요청 중
- When: 네트워크 끊김
- Then: 오류 메시지 표시

### 3.4 상태 케이스 (2개)

#### SC-1: 순차 삭제 - 여러 일정 연속 삭제
- Given: 단일 일정 1개, 반복 일정 2개
- When: 단일 일정 삭제 → 반복 일정 1개 삭제(예) → 반복 일정 1개 삭제(아니오)
- Then: 각각 정확하게 처리됨, 마지막에 목록 비워짐

#### SC-2: 캘린더 뷰 전환 후 삭제
- Given: 월간 뷰에서 일정 표시
- When: 주간 뷰로 전환 → 같은 일정 삭제 → 월간 뷰로 복귀
- Then: 뷰 전환 후에도 삭제 반영됨

---

## 4. 테스트 데이터

### 단일 일정
```typescript
{
  id: 'event-single-1',
  title: '단일 회의',
  date: '2025-10-15',
  startTime: '10:00',
  endTime: '11:00',
  repeat: { type: 'none', interval: 1 },
}
```

### 반복 일정 (같은 시리즈)
```typescript
{
  id: 'event-repeat-1',
  title: '주간 회의',
  date: '2025-10-15',
  repeat: { type: 'weekly', interval: 1, id: 'repeat-weekly-123' },
},
{
  id: 'event-repeat-2',
  title: '주간 회의',
  date: '2025-10-22',
  repeat: { type: 'weekly', interval: 1, id: 'repeat-weekly-123' },
}
```

---

## 5. 핵심 테스트 전략

### 영역 분리 쿼리
```typescript
// 캘린더에서만 검색
const monthView = screen.getByTestId('month-view');
within(monthView).getByText('주간 회의');

// 이벤트 목록에서만 검색
const eventList = screen.getByTestId('event-list');
within(eventList).getByText('주간 회의');
```

### 삭제 버튼 선택
```typescript
// 이벤트 목록에서만 삭제 버튼 있음
const eventList = screen.getByTestId('event-list');
const deleteButtons = within(eventList).getAllByLabelText('Delete event');
await user.click(deleteButtons[0]);
```

### 다이얼로그 처리
```typescript
const dialog = screen.getByRole('dialog');
const yesButton = within(dialog).getByRole('button', { name: '예' });
await user.click(yesButton);
```

---

## 6. 다음 단계

**test-code-writer 에이전트**에서:
1. 영역 기반 쿼리로 테스트 코드 작성
2. 캘린더와 이벤트 목록 분리
3. 모든 16개 테스트 통과 확인
