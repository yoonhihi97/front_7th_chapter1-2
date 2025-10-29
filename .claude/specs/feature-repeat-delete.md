# 기능 명세서: 반복 일정 삭제

**작성일**: 2025-10-30
**버전**: 1.0
**담당 영역**: 일정 관리 시스템 - 반복 일정 삭제 기능

---

## 1. 개요

### 1.1 배경
현재 캘린더 애플리케이션의 삭제 기능은 단일 일정 삭제만 지원합니다. 반복 일정을 삭제할 때 사용자가 해당 일정만 삭제할지, 반복 시리즈 전체를 삭제할지 선택할 수 없어 사용성이 떨어집니다.

### 1.2 목적
반복 일정 삭제 시 다이얼로그를 통해 사용자가 다음 두 가지 옵션 중 선택할 수 있도록 하여 의도하지 않은 삭제를 방지하고 유연한 일정 관리를 지원합니다.

### 1.3 사용 사례

**AS A** 일정 관리 시스템 사용자
**I WANT** 반복 일정 삭제 시 옵션을 선택할 수 있기를
**SO THAT** 필요에 따라 해당 일정만 삭제하거나 전체 반복 시리즈를 삭제할 수 있습니다.

---

## 2. 범위 (Scope)

### 2.1 IN SCOPE

#### 포함 항목:
1. **삭제 다이얼로그 추가**: 반복 일정 삭제 시 선택 옵션 제시
2. **옵션 1 - 해당 일정만 삭제**: "예" 선택 시 현재 일정만 삭제
3. **옵션 2 - 전체 반복 일정 삭제**: "아니오" 선택 시 반복 시리즈 전체 삭제
4. **다이얼로그 텍스트**: "해당 일정만 삭제하시겠어요?"
5. **API 엔드포인트**:
   - 단일 삭제: `DELETE /api/events/{id}` (기존)
   - 전체 삭제: `DELETE /api/recurring-events/{repeatId}` (신규)

### 2.2 OUT OF SCOPE

#### 제외 항목 (이유):
1. **이후 일정만 삭제**: 확장 기능 (향후 개선)
2. **삭제 실행 취소**: 서버 구현 불필요
3. **벌크 삭제**: 현재 범위 밖
4. **삭제 로그 기록**: 추후 감사 기능

---

## 3. 상세 요구사항

### 3.1 UI 변경

#### 3.1.1 삭제 버튼 동작 변경

**파일**: `src/App.tsx`
**현재 코드** (라인 677):
```typescript
<IconButton aria-label="Delete event" onClick={() => deleteEvent(event.id)}>
  <Delete />
</IconButton>
```

**변경 요구사항**:
1. 삭제 버튼 클릭 시 event 객체를 전달하도록 변경
```typescript
<IconButton
  aria-label="Delete event"
  onClick={() => handleDeleteClick(event)}
>
  <Delete />
</IconButton>
```

#### 3.1.2 삭제 확인 다이얼로그 추가

**위치**: App.tsx의 다른 Dialog 컴포넌트 근처
**구조**:
```typescript
<Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
  <DialogTitle>일정 삭제</DialogTitle>
  <DialogContent>
    <DialogContentText>
      해당 일정만 삭제하시겠어요?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => handleCancelDelete()}>아니오</Button>
    <Button onClick={() => handleConfirmDelete()} variant="contained" color="error">
      예
    </Button>
  </DialogActions>
</Dialog>
```

### 3.2 상태 관리

App.tsx에 다음 상태 추가:
```typescript
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
```

### 3.3 함수 로직

#### 3.3.1 handleDeleteClick
```
Given: 삭제 버튼 클릭 시 event 객체
When: event.repeat.type !== 'none' (반복 일정)
Then: 다이얼로그 표시, eventToDelete 상태 저장
Else: event.repeat.type === 'none' (단일 일정)
Then: 즉시 deleteEvent(event.id) 호출
```

#### 3.3.2 handleConfirmDelete (사용자가 "예" 선택)
```
Given: 다이얼로그에서 "예" 버튼 클릭
Then: deleteEvent(eventToDelete.id) 호출
And: 다이얼로그 닫기, eventToDelete 초기화
```

#### 3.3.3 handleCancelDelete (사용자가 "아니오" 선택)
```
Given: 다이얼로그에서 "아니오" 버튼 클릭
Then: updateRecurringEvents(eventToDelete.repeat.id, {}) 호출
  → 전체 반복 일정 삭제
And: 다이얼로그 닫기, eventToDelete 초기화
```

### 3.4 API 엔드포인트

#### 기존 엔드포인트 (이미 구현됨)
```
DELETE /api/events/{id}  - 단일 일정 삭제
```

#### 신규 엔드포인트 (백엔드에서 구현 필요)
```
DELETE /api/recurring-events/{repeatId}  - 반복 시리즈 전체 삭제
```

> 주의: 백엔드에서 이 엔드포인트 구현 필요

---

## 4. 검증 체크리스트

### 4.1 기능 검증

#### 단일 일정 삭제:
- [ ] `repeat.type === 'none'` → 다이얼로그 없이 즉시 삭제
- [ ] 삭제 후 목록 새로고침
- [ ] 성공 메시지 표시

#### 반복 일정 - 해당 일정만 삭제 (예):
- [ ] `repeat.type !== 'none'` → 다이얼로그 표시
- [ ] "예" 클릭 → 해당 일정만 삭제
- [ ] API: `DELETE /api/events/{id}` 호출
- [ ] 다이얼로그 닫기

#### 반복 일정 - 전체 삭제 (아니오):
- [ ] "아니오" 클릭 → 전체 반복 시리즈 삭제
- [ ] API: `DELETE /api/recurring-events/{repeatId}` 호출
- [ ] 다이얼로그 닫기

#### 다이얼로그 동작:
- [ ] 다이얼로그 텍스트: "해당 일정만 삭제하시겠어요?"
- [ ] 버튼: "예", "아니오"
- [ ] 다이얼로그 밖 클릭 → 닫기 (아니오로 동작하지 않음)

---

## 5. 구현 가이드라인

### 5.1 구현 순서
1. App.tsx에 상태 변수 추가 (isDeleteDialogOpen, eventToDelete)
2. handleDeleteClick 함수 구현
3. handleConfirmDelete 함수 구현
4. handleCancelDelete 함수 구현
5. 삭제 버튼 수정
6. 다이얼로그 UI 추가

### 5.2 변경 파일
- `src/App.tsx` (상태, 함수, UI)

### 5.3 변경 불필요 파일
- `src/types.ts` (Event 타입 수정 없음)
- `src/hooks/useEventOperations.ts` (기존 함수 사용)

---

## 6. 다음 단계

이 명세서를 바탕으로 test-designer 에이전트가 테스트 케이스를 설계합니다.
