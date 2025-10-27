# 테스트를 잘 작성하기 위한 규칙

> 이 문서는 좋은 테스트 코드를 작성하기 위한 보편적인 원칙과 가이드라인을 정리합니다.

## 목차

1. [핵심 원칙](#1-핵심-원칙)
2. [테스트 작성 규칙](#2-테스트-작성-규칙)
3. [좋은 테스트의 특징](#3-좋은-테스트의-특징)
4. [FIRST 원칙](#4-first-원칙)
5. [안티패턴](#5-안티패턴)

---

## 1. 핵심 원칙

### 1.1 명확한 목적

테스트는 **명확한 행동이나 기능 요구사항을 검증**해야 합니다.

"무엇을 테스트하는가?"가 코드만 봐도 드러나야 합니다.

**❌ 잘못된 예시:**

```javascript
test('works', () => {
  // ...
});
```

**✅ 올바른 예시:**

```javascript
test('로그인 버튼 클릭 시 홈 화면으로 이동한다', () => {
  // ...
});
```

### 1.2 단일 책임 원칙

**하나의 테스트는 하나의 개념만 검증**합니다.

여러 동작을 한 테스트에서 검증하면, 실패 시 원인을 추적하기 어렵습니다.

**❌ 잘못된 예시:**

```javascript
test('사용자 관리 기능', () => {
  // 사용자 생성
  const user = createUser('홍길동');
  expect(user.name).toBe('홍길동');

  // 사용자 수정
  updateUser(user, { name: '김철수' });
  expect(user.name).toBe('김철수');

  // 사용자 삭제
  deleteUser(user);
  expect(getUser(user.id)).toBeNull();
});
```

**✅ 올바른 예시:**

```javascript
test('사용자를 생성할 수 있다', () => {
  const user = createUser('홍길동');
  expect(user.name).toBe('홍길동');
});

test('사용자 정보를 수정할 수 있다', () => {
  const user = createUser('홍길동');
  updateUser(user, { name: '김철수' });
  expect(user.name).toBe('김철수');
});

test('사용자를 삭제할 수 있다', () => {
  const user = createUser('홍길동');
  deleteUser(user);
  expect(getUser(user.id)).toBeNull();
});
```

### 1.3 독립성

**테스트 간에 상태를 공유하지 않습니다.**

각 테스트는 **실행 순서에 상관없이 독립적으로** 동작해야 합니다.

**❌ 잘못된 예시:**

```javascript
let sharedUser;

test('사용자 생성', () => {
  sharedUser = createUser('홍길동');
  expect(sharedUser).toBeDefined();
});

test('사용자 수정', () => {
  // 이전 테스트에 의존!
  updateUser(sharedUser, { name: '김철수' });
  expect(sharedUser.name).toBe('김철수');
});
```

**✅ 올바른 예시:**

```javascript
beforeEach(() => {
  // 각 테스트마다 초기 상태 재설정
  cleanup();
});

test('사용자 생성', () => {
  const user = createUser('홍길동');
  expect(user).toBeDefined();
});

test('사용자 수정', () => {
  const user = createUser('홍길동'); // 독립적으로 준비
  updateUser(user, { name: '김철수' });
  expect(user.name).toBe('김철수');
});
```

---

## 2. 테스트 작성 규칙

### 2.1 가독성 - Given/When/Then 구조

테스트는 **"문서"의 역할**을 합니다.

코드만 봐도 요구사항과 시나리오를 이해할 수 있어야 합니다.

**Given / When / Then 구조**로 작성하면 명확해집니다:

```javascript
test('로그인 성공 시 홈 화면으로 이동한다', () => {
  // Given: 로그인 페이지에 있음
  render(<LoginPage />);

  // When: 이메일과 비밀번호 입력 후 버튼 클릭
  userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com');
  userEvent.type(screen.getByLabelText(/비밀번호/), '1234');
  userEvent.click(screen.getByText(/로그인/));

  // Then: 홈 화면으로 이동
  expect(screen.getByText(/홈/)).toBeInTheDocument();
});
```

**또는 AAA 패턴 (Arrange-Act-Assert)**으로도 표현됩니다:

- **Arrange (준비)**: 테스트 환경 설정
- **Act (실행)**: 테스트 대상 동작 실행
- **Assert (검증)**: 결과 확인

### 2.2 동작 중심 테스트

**구현이 아닌 동작(Behavior)을 테스트**합니다.

내부 로직보다는 **사용자 관점의 결과**를 검증합니다.

**❌ 구현 세부사항 테스트:**

```javascript
// 내부 클래스명에 의존
expect(button.classList.contains('active')).toBe(true);

// 내부 상태에 의존
expect(component.state.isLoading).toBe(true);
```

**✅ 동작 중심 테스트:**

```javascript
// 사용자가 보는 결과 검증
expect(screen.getByRole('button', { name: /저장됨/ })).toBeInTheDocument();

// 사용자가 경험하는 동작 검증
expect(screen.getByText(/로딩 중.../)).toBeInTheDocument();
```

### 2.3 적절한 테스트 계층 구성

```
         /\
        /  \
       / E2E \      ← 핵심 사용자 플로우만
      /-------\
     /         \
    / Integration \  ← 컴포넌트 간 상호작용
   /-------------\
  /               \
 /   Unit Tests    \  ← 가장 많이
/___________________\
```

- **Unit (단위)**: 함수나 컴포넌트의 최소 단위 검증
- **Integration (통합)**: 여러 컴포넌트 간의 상호작용 검증
- **E2E (End-to-End)**: 실제 사용자 플로우 검증

**권장**: 단위 테스트가 많고, 통합 테스트는 적당히, E2E는 핵심 시나리오만 선택적으로 작성

### 2.4 명확한 네이밍

테스트 이름은 **행동 중심**으로, **자연어에 가깝게** 작성합니다.

**✅ 좋은 예시:**

```javascript
it('빈 비밀번호 입력 시 에러 메시지를 표시한다');
it('should show error when password is empty');
```

**❌ 나쁜 예시:**

```javascript
it('errorTest1');
it('test_password');
```

**패턴:**

- `{조건}일 때 {결과}가 나온다`
- `{동작}하면 {결과}가 발생한다`
- `should {기대 동작} when {조건}`

---

## 3. 좋은 테스트의 특징

### 3.1 살아있는 문서

- 코드가 바뀌면 **테스트도 함께 업데이트**되어야 합니다
- 실패하는 테스트를 임시로 무시(`.skip`)하기보단 **원인을 찾아 수정**합니다
- **테스트 커버리지 수치**보다 **유의미한 시나리오**를 더 중시합니다

### 3.2 유지보수성

**최소한의 모킹:**

- Mocking은 **필요한 경우에만** 사용합니다
- 과도한 모킹은 테스트의 신뢰성을 떨어뜨립니다

**변화에 강한 테스트:**

- UI가 조금 바뀌어도 테스트가 깨지지 않도록 작성합니다
- 특정 구현에 결합되지 않도록 합니다

### 3.3 신뢰성

**Flaky Test (가끔 실패하는 테스트)는 코드보다 더 위험합니다.**

항상 **결정적(deterministic) 결과**를 보장해야 합니다.

**비결정적 요소 제어:**

```javascript
// ❌ 타이밍에 의존
setTimeout(() => {
  expect(element).toBeInTheDocument();
}, 1000); // 환경에 따라 실패할 수 있음

// ✅ 명시적 대기
await screen.findByText(/로딩 완료/, {}, { timeout: 3000 });

// ✅ 시간 모킹
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-01'));
```

**제어해야 할 비결정적 요소:**

- 네트워크 요청 → Mock
- 현재 시간 → 고정된 시간으로 설정
- 랜덤 값 → Seed 설정 또는 Mock
- 타이머 → Fake Timer 사용

---

## 4. FIRST 원칙

좋은 테스트의 다섯 가지 핵심 특성:

### **F - Fast (빠름)**

- 테스트는 **빠르게 실행**되어야 합니다
- 느린 테스트는 개발 속도를 저하시킵니다
- 단위 테스트는 밀리초 단위로 실행되어야 합니다

### **I - Independent (독립적)**

- 각 테스트는 **다른 테스트에 영향을 주지 않아야** 합니다
- 실행 순서에 관계없이 동작해야 합니다
- 공유 상태를 피하고, `beforeEach`로 초기화합니다

### **R - Repeatable (반복 가능)**

- 동일한 조건에서 **항상 같은 결과**를 내야 합니다
- 환경(로컬, CI, 다른 개발자 PC)에 관계없이 동작해야 합니다
- 비결정적 요소를 제거합니다

### **S - Self-validating (자가 검증)**

- 테스트 결과는 **자동으로 판단**되어야 합니다
- 사람이 로그를 확인하거나 수동 검증이 필요하면 안 됩니다
- Pass/Fail이 명확해야 합니다

### **T - Timely (적시)**

- 테스트는 **코드 작성 전(TDD) 또는 직후**에 작성되어야 합니다
- 나중으로 미루면 테스트 작성이 어려워집니다
- 코드와 함께 진화해야 합니다

---

## 5. 안티패턴

### 5.1 테스트 간 의존성

**❌ 나쁜 예시:**

```javascript
let globalUser;

test('사용자 생성', () => {
  globalUser = createUser('홍길동');
});

test('사용자 조회', () => {
  // 이전 테스트에 의존!
  expect(getUser(globalUser.id)).toBeDefined();
});
```

### 5.2 과도한 모킹

**❌ 모든 것을 모킹:**

```javascript
// 통합 테스트의 의미를 상실
vi.mock('./moduleA');
vi.mock('./moduleB');
vi.mock('./moduleC');
vi.mock('./moduleD');
```

**✅ 외부 의존성만 모킹:**

```javascript
// 외부 API나 라이브러리만 모킹
vi.mock('axios');
// 내부 모듈은 실제 코드 사용
```

### 5.3 구현 세부사항 테스트

**❌ 내부 상태나 메서드 테스트:**

```javascript
expect(component.state.count).toBe(5);
expect(component.calculateTotal).toHaveBeenCalled();
```

**✅ 사용자 관점의 결과 테스트:**

```javascript
expect(screen.getByText('총 5개')).toBeInTheDocument();
expect(screen.getByText('합계: 1000원')).toBeInTheDocument();
```

### 5.4 불명확한 테스트 이름

**❌:**

```javascript
test('test1');
test('should work');
test('validates input');
```

**✅:**

```javascript
test("빈 이메일 입력 시 '이메일을 입력하세요' 에러를 표시한다");
test("should display 'Please enter email' error when email is empty");
```

### 5.5 하나의 테스트에서 여러 개념 검증

**❌:**

```javascript
test('폼 검증', () => {
  // 이메일 검증
  expect(validateEmail('invalid')).toBe(false);
  // 비밀번호 검증
  expect(validatePassword('123')).toBe(false);
  // 나이 검증
  expect(validateAge(-1)).toBe(false);
});
```

**✅:**

```javascript
test('유효하지 않은 이메일을 거부한다', () => {
  expect(validateEmail('invalid')).toBe(false);
});

test('짧은 비밀번호를 거부한다', () => {
  expect(validatePassword('123')).toBe(false);
});

test('음수 나이를 거부한다', () => {
  expect(validateAge(-1)).toBe(false);
});
```

---

## 요약

### 좋은 테스트는:

✅ **명확한 목적**을 가지고 있다
✅ **하나의 개념**만 검증한다
✅ **독립적**으로 실행된다
✅ **읽기 쉽고** 이해하기 쉽다 (Given/When/Then)
✅ **동작**을 테스트한다 (구현 X)
✅ **빠르고** 반복 가능하며 신뢰할 수 있다
✅ **살아있는 문서**로서 역할한다

### 나쁜 테스트는:

❌ 무엇을 테스트하는지 불명확하다
❌ 여러 개념을 한 번에 검증한다
❌ 다른 테스트에 의존한다
❌ 구현 세부사항을 테스트한다
❌ 가끔 실패한다 (Flaky)
❌ 이름만 봐서는 무엇을 하는지 모른다
