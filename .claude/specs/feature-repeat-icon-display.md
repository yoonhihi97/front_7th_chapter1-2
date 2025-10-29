# 기능 명세서: 캘린더 뷰 반복 일정 아이콘 표시

**작성일**: 2025-10-29
**버전**: 1.0
**담당 영역**: 일정 관리 시스템 - 캘린더 뷰 UI 개선

---

## 1. 개요

### 1.1 배경
현재 캘린더 뷰(월간/주간)에서는 알림 받은 일정만 Notifications 아이콘으로 구분 표시됩니다. 하지만 반복 일정은 일반 일정과 시각적으로 구분되지 않아 사용자가 일정의 반복 여부를 즉시 파악하기 어렵습니다.

일정 목록(우측 패널)에는 반복 정보가 텍스트로 표시되지만 (App.tsx 566-576라인), 캘린더 그리드에서는 제목만 표시되어 반복 일정 식별이 불가능합니다.

### 1.2 목적
캘린더 뷰의 일정 항목에 반복 아이콘을 추가하여 사용자가 한눈에 반복 일정과 단일 일정을 구분할 수 있도록 합니다.

### 1.3 사용 사례

**AS A** 일정 관리 시스템 사용자
**I WANT** 캘린더 뷰에서 반복 일정에 아이콘이 표시되기를
**SO THAT** 매주 반복되는 회의인지, 일회성 미팅인지 제목을 클릭하지 않고도 즉시 구분할 수 있습니다.

---

## 2. 범위 (Scope)

### 2.1 IN SCOPE

#### 포함 항목:
1. **MUI 아이콘 import**: EventRepeat 또는 Repeat 아이콘 추가
2. **월간 뷰 아이콘 표시**: App.tsx 라인 276-305 수정
3. **주간 뷰 아이콘 표시**: App.tsx 라인 185-218 수정
4. **조건부 렌더링**: `event.repeat.type !== 'none'`일 때만 아이콘 표시
5. **아이콘 배치**: 알림 아이콘과 제목 사이에 반복 아이콘 표시

### 2.2 OUT OF SCOPE

#### 제외 항목 (이유):
1. **반복 유형별 다른 아이콘**: 통합 반복 아이콘만 사용 (UI 복잡도 최소화)
2. **일정 목록 패널 수정**: 이미 텍스트로 반복 정보 표시 중 (566-576라인)
3. **툴팁 추가**: 아이콘 자체로 충분히 직관적 (향후 개선 가능)
4. **색상 변경**: 기존 스타일 패턴 유지
5. **애니메이션**: 정적 아이콘만 표시

---

## 3. 상세 요구사항

### 3.1 UI 변경

#### 3.1.1 아이콘 선택

**추천 아이콘**: `EventRepeat` (MUI Icons)
- 이유: 이벤트 반복을 명확히 나타내는 시맨틱 아이콘
- 대안: `Repeat`, `Loop`

#### 3.1.2 월간 뷰 수정

**파일**: `src/App.tsx`
**위치**: 라인 276-305

**현재 코드 구조**:
```typescript
{getEventsForDay(filteredEvents, day).map((event) => {
  const isNotified = notifiedEvents.includes(event.id);
  return (
    <Box key={event.id} sx={{...}}>
      <Stack direction="row" spacing={1} alignItems="center">
        {isNotified && <Notifications fontSize="small" />}
        <Typography variant="caption" noWrap>
          {event.title}
        </Typography>
      </Stack>
    </Box>
  );
})}
```

**변경 요구사항**:
1. **라인 1-6**: EventRepeat 아이콘 import 추가
   ```typescript
   import EventRepeat from '@mui/icons-material/EventRepeat';
   ```

2. **라인 293-302**: 반복 아이콘 조건부 렌더링 추가
   ```typescript
   <Stack direction="row" spacing={1} alignItems="center">
     {isNotified && <Notifications fontSize="small" />}
     {event.repeat.type !== 'none' && <EventRepeat fontSize="small" />}
     <Typography variant="caption" noWrap>
       {event.title}
     </Typography>
   </Stack>
   ```

**아이콘 표시 순서**:
[알림 아이콘] [반복 아이콘] [제목]

#### 3.1.3 주간 뷰 수정

**파일**: `src/App.tsx`
**위치**: 라인 185-218

**변경 요구사항**:
월간 뷰와 동일하게 조건부 반복 아이콘 렌더링 추가

#### 3.1.4 스타일 요구사항

- **아이콘 크기**: `fontSize="small"` (기존 Notifications 아이콘과 동일)
- **아이콘 색상**: 부모 컴포넌트 color 상속 (명시적 지정 없음)
- **간격**: `spacing={1}` (기존 Stack 설정 유지)
- **정렬**: `alignItems="center"` (기존 Stack 설정 유지)

---

## 4. 검증 체크리스트

### 4.1 기능 검증

#### 아이콘 표시 정확성:
- [ ] `repeat.type === 'none'` → 아이콘 표시 안 됨
- [ ] `repeat.type === 'daily'` → EventRepeat 아이콘 표시
- [ ] `repeat.type === 'weekly'` → EventRepeat 아이콘 표시
- [ ] `repeat.type === 'monthly'` → EventRepeat 아이콘 표시
- [ ] `repeat.type === 'yearly'` → EventRepeat 아이콘 표시

#### 뷰별 표시:
- [ ] 월간 뷰 - 반복 일정에 아이콘 표시
- [ ] 주간 뷰 - 반복 일정에 아이콘 표시

#### 복합 상태:
- [ ] 알림 + 반복 일정 → 두 아이콘 모두 표시 (순서: 알림, 반복, 제목)
- [ ] 알림만 있는 일정 → Notifications 아이콘만 표시
- [ ] 반복만 있는 일정 → EventRepeat 아이콘만 표시
- [ ] 일반 일정 → 아이콘 없이 제목만 표시

---

## 5. 구현 가이드라인

### 5.1 구현 순서
1. MUI EventRepeat 아이콘 import 추가 (App.tsx 라인 1-6)
2. 월간 뷰 수정 (App.tsx 라인 293-302)
3. 주간 뷰 수정 (App.tsx 라인 206-215)

### 5.2 변경 파일
- `src/App.tsx` (import + 2개 위치)

### 5.3 변경 불필요 파일
- `src/types.ts` (타입 정의 기존 사용)
- `src/hooks/*.ts` (Hook 변경 없음)
- `src/utils/*.ts` (유틸 변경 없음)

---

## 6. 다음 단계

이 명세서를 바탕으로 test-designer 에이전트가 테스트 케이스를 설계합니다.