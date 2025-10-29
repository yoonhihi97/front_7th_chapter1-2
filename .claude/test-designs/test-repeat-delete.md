# 테스트 설계 문서: 반복 일정 삭제

**작성일**: 2025-10-30
**대상 기능**: 반복 일정 삭제 기능
**테스트 파일**: `src/__tests__/integration/repeat-delete.spec.tsx`
**총 테스트 수**: 16개

---

## 1. 테스트 전략

### 1.1 테스트 분류

| 카테고리 | 개수 | 목적 |
|---------|------|------|
| 행복 경로 | 7개 | 정상 시나리오 검증 |
| 경계 케이스 | 4개 | 경계값 및 엣지 케이스 |
| 오류 케이스 | 3개 | 에러 처리 검증 |
| 상태 케이스 | 2개 | 상태 관리 및 순차 동작 |

### 1.2 위험 영역

1. **단일 삭제 vs 전체 삭제**: API 호출 혼동 위험
   - 단일 일정: `repeat.type === 'none'` → 다이얼로그 없이 즉시 삭제
   - 반복 일정: `repeat.type !== 'none'` → 다이얼로그 표시

2. **다이얼로그 상태 관리**: 다이얼로그 미닫힘, 중복 삭제 위험
   - Dialog 닫기 로직 누락
   - eventToDelete 상태 초기화 누락

3. **API 엔드포인트 오류**: 잘못된 엔드포인트 호출
   - 단일 삭제: `DELETE /api/events/{id}`
   - 전체 삭제: `DELETE /api/recurring-events/{repeatId}`

4. **repeat.id 누락**: 반복 시리즈 식별 불가
   - repeat.id 없으면 전체 삭제 불가능

---

## 2. 테스트 케이스

### 2.1 행복 경로 (7개)

#### HP-1: 단일 일정 삭제 - 다이얼로그 없이 즉시 삭제
- Given: `repeat.type = 'none'`인 일정
- When: 삭제 버튼 클릭
- Then:
  - 다이얼로그 미표시
  - `DELETE /api/events/{id}` 호출
  - 일정 목록에서 제거
  - 성공 메시지 표시

#### HP-2: 반복 일정 삭제 - 다이얼로그 표시
- Given: `repeat.type = 'weekly'`인 일정
- When: 삭제 버튼 클릭
- Then:
  - 다이얼로그 열림
  - 텍스트: "해당 일정만 삭제하시겠어요?"
  - 버튼: "예", "아니오"

#### HP-3: 반복 일정 - 해당 일정만 삭제 (예)
- Given: 다이얼로그 표시 상태, 반복 일정
- When: "예" 버튼 클릭
- Then:
  - `DELETE /api/events/{id}` 호출 (단일 삭제)
  - 해당 일정만 제거
  - 다른 반복 일정은 유지
  - 다이얼로그 닫힘

#### HP-4: 반복 일정 - 전체 삭제 (아니오)
- Given: 다이얼로그 표시 상태, repeat.id = 'repeat-123'
- When: "아니오" 버튼 클릭
- Then:
  - `DELETE /api/recurring-events/repeat-123` 호출 (전체 삭제)
  - 같은 repeat.id의 모든 일정 제거
  - 다이얼로그 닫힘

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
- Then: "일정이 삭제되었습니다." 메시지 표시

### 2.2 경계 케이스 (4개)

#### BC-1: 반복 종료일 경계 - 마지막 일정 삭제
- Given: 반복 시리즈의 마지막 일정
- When: 삭제 버튼 클릭
- Then: 다이얼로그 표시 (반복 일정 취급)

#### BC-2: repeat.id 누락 처리
- Given: repeat.id가 없는 반복 일정
- When: "아니오" 클릭하여 전체 삭제 시도
- Then: 오류 처리 또는 안전 종료

#### BC-3: 다이얼로그 Escape 키 (닫기만 함)
- Given: 다이얼로그 열림
- When: Escape 키 또는 배경 클릭
- Then:
  - 다이얼로그 닫힘
  - 삭제 동작 없음

#### BC-4: 빈 이벤트 목록에서 삭제 후 상태
- Given: 마지막 일정 삭제 후
- When: 페이지 새로고침
- Then: 빈 목록 표시, 오류 없음

### 2.3 오류 케이스 (3개)

#### EC-1: 단일 삭제 API 실패 (500 에러)
- Given: 단일 일정 삭제 시도
- When: 서버 반환 500 에러
- Then:
  - 일정 목록 유지 (롤백)
  - 오류 메시지: "일정 삭제 실패"

#### EC-2: 전체 삭제 API 실패 (500 에러)
- Given: 반복 전체 삭제 시도, "아니오" 클릭
- When: 서버 반환 500 에러
- Then:
  - 모든 일정 유지
  - 오류 메시지 표시

#### EC-3: 네트워크 타임아웃
- Given: 삭제 요청 중
- When: 네트워크 연결 끊김
- Then:
  - 타임아웃 오류 처리
  - 오류 메시지 표시

### 2.4 상태 케이스 (2개)

#### SC-1: 순차 삭제 - 여러 일정 연속 삭제
- Given: 여러 반복 일정 있음
- When: 첫 번째 일정 삭제 → "예" → 두 번째 일정 삭제 → "예"
- Then:
  - 각각 제대로 삭제됨
  - 다이얼로그 상태 정상 관리
  - 목록 각각 업데이트

#### SC-2: 편집 중 삭제 (Race Condition)
- Given: 일정 편집 중
- When: 다른 일정 삭제 → "아니오"
- Then:
  - 다른 일정 시리즈 삭제
  - 편집 중인 일정 유지
  - 충돌 없음

---

## 3. 테스트 데이터

### 단일 일정 샘플
```typescript
{
  id: 'event-single-1',
  title: '단일 회의',
  date: '2025-10-15',
  startTime: '10:00',
  endTime: '11:00',
  description: '단일 일정',
  location: '회의실 A',
  category: '업무',
  repeat: { type: 'none', interval: 1 },
  notificationTime: 10,
}
```

### 반복 일정 샘플
```typescript
{
  id: 'event-repeat-1',
  title: '주간 회의',
  date: '2025-10-15',
  startTime: '14:00',
  endTime: '15:00',
  description: '매주 진행',
  location: '회의실 B',
  category: '업무',
  repeat: {
    type: 'weekly',
    interval: 1,
    endDate: '2025-12-31',
    id: 'repeat-weekly-123'
  },
  notificationTime: 10,
}
```

---

## 4. 테스트 파일 구조

```typescript
describe('반복 일정 삭제', () => {
  describe('행복 경로', () => {
    it('HP-1: 단일 일정 삭제 - 다이얼로그 없이 즉시 삭제', () => { });
    it('HP-2: 반복 일정 삭제 - 다이얼로그 표시', () => { });
    it('HP-3: 반복 일정 - 해당 일정만 삭제 (예)', () => { });
    it('HP-4: 반복 일정 - 전체 삭제 (아니오)', () => { });
    it('HP-5: 다이얼로그 - "예" 버튼 클릭 시 닫힘', () => { });
    it('HP-6: 다이얼로그 - "아니오" 버튼 클릭 시 닫힘', () => { });
    it('HP-7: 성공 메시지 표시', () => { });
  });

  describe('경계 케이스', () => {
    it('BC-1: 반복 종료일 경계 - 마지막 일정 삭제', () => { });
    it('BC-2: repeat.id 누락 처리', () => { });
    it('BC-3: 다이얼로그 Escape 키 (닫기만 함)', () => { });
    it('BC-4: 빈 이벤트 목록에서 삭제 후 상태', () => { });
  });

  describe('오류 케이스', () => {
    it('EC-1: 단일 삭제 API 실패 (500 에러)', () => { });
    it('EC-2: 전체 삭제 API 실패 (500 에러)', () => { });
    it('EC-3: 네트워크 타임아웃', () => { });
  });

  describe('상태 케이스', () => {
    it('SC-1: 순차 삭제 - 여러 일정 연속 삭제', () => { });
    it('SC-2: 편집 중 삭제 (Race Condition)', () => { });
  });
});
```

---

## 5. API 모킹 전략

### 단일 삭제 엔드포인트
```typescript
http.delete('/api/events/:id', ({ params }) => {
  const { id } = params;
  mockEvents = mockEvents.filter(e => e.id !== id);
  return new HttpResponse(null, { status: 204 });
})
```

### 전체 삭제 엔드포인트 (신규)
```typescript
http.delete('/api/recurring-events/:repeatId', ({ params }) => {
  const { repeatId } = params;
  mockEvents = mockEvents.filter(e => e.repeat.id !== repeatId);
  return new HttpResponse(null, { status: 204 });
})
```

---

## 6. 구현 체크리스트

### App.tsx 변경 사항

#### 상태 추가
- [ ] `isDeleteDialogOpen` 상태 변수
- [ ] `eventToDelete` 상태 변수

#### 함수 추가
- [ ] `handleDeleteClick(event)` - 삭제 버튼 클릭
- [ ] `handleConfirmDelete()` - "예" 클릭 처리
- [ ] `handleCancelDelete()` - "아니오" 클릭 처리

#### UI 수정
- [ ] 삭제 버튼 onClick 핸들러 변경
- [ ] 삭제 확인 Dialog 추가

### 다이얼로그 요구사항
- [ ] 제목: "일정 삭제"
- [ ] 텍스트: "해당 일정만 삭제하시겠어요?"
- [ ] 버튼 1: "아니오" (전체 삭제)
- [ ] 버튼 2: "예" (해당 일정만 삭제)

---

## 7. 다음 단계

**test-code-writer 에이전트**에서 실제 테스트 코드 작성
