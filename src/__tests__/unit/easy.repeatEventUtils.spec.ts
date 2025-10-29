import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';

import App from '../../App';

const theme = createTheme();

const setup = () => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

describe('반복 유형 선택 기능', () => {
  describe('UI 렌더링', () => {
    it('RT-1: 반복 체크박스 OFF 시 반복 옵션 숨김', () => {
      // Arrange: 앱 렌더링 (기본 상태: isRepeating = false)
      setup();

      // Act: 반복 체크박스 확인
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });

      // Assert: 체크박스가 선택되지 않았고, 반복 옵션들이 문서에 없어야 함
      expect(repeatCheckbox).not.toBeChecked();
      expect(screen.queryByLabelText('반복 유형')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('반복 간격')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('반복 종료일')).not.toBeInTheDocument();
    });

    it('RT-2: 반복 체크박스 ON 시 반복 옵션 표시', async () => {
      // Arrange: 앱 렌더링
      const { user } = setup();

      // Act: 반복 체크박스 클릭
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Assert: 반복 옵션들이 표시되어야 함
      expect(repeatCheckbox).toBeChecked();
      expect(screen.getByLabelText('반복 유형')).toBeInTheDocument();
      expect(screen.getByLabelText('반복 간격')).toBeInTheDocument();
      expect(screen.getByLabelText('반복 종료일')).toBeInTheDocument();
    });

    it('RT-3: 반복 유형 드롭다운에 4개 옵션 표시', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 유형 드롭다운 열기
      const repeatTypeSelect = screen.getByLabelText('반복 유형');
      await user.click(within(repeatTypeSelect).getByRole('combobox'));

      // Assert: 4개 옵션이 표시되어야 함
      expect(screen.getByRole('option', { name: '매일' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '매주' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '매월' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '매년' })).toBeInTheDocument();
    });

    it('RT-4: 반복 간격 입력에 min=1 제한', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 간격 입력 필드 찾기
      const repeatIntervalInput = screen.getByLabelText('반복 간격') as HTMLInputElement;

      // Assert: min 속성이 1이어야 함
      expect(repeatIntervalInput).toHaveAttribute('min', '1');
      expect(repeatIntervalInput.type).toBe('number');
    });
  });

  describe('반복 유형 선택', () => {
    it('RS-1: 매일(daily) 선택 → 상태 업데이트', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 유형 드롭다운에서 "매일" 선택
      const repeatTypeSelect = screen.getByLabelText('반복 유형');
      await user.click(within(repeatTypeSelect).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '매일' }));

      // Assert: 선택된 값이 "매일"이어야 함
      const combobox = within(repeatTypeSelect).getByRole('combobox') as HTMLInputElement;
      expect(combobox.value).toBe('daily');
    });

    it('RS-2: 매주(weekly) 선택 → 상태 업데이트', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 유형 드롭다운에서 "매주" 선택
      const repeatTypeSelect = screen.getByLabelText('반복 유형');
      await user.click(within(repeatTypeSelect).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '매주' }));

      // Assert: 선택된 값이 "weekly"이어야 함
      const combobox = within(repeatTypeSelect).getByRole('combobox') as HTMLInputElement;
      expect(combobox.value).toBe('weekly');
    });

    it('RS-3: 매월(monthly) 선택 → 상태 업데이트', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 유형 드롭다운에서 "매월" 선택
      const repeatTypeSelect = screen.getByLabelText('반복 유형');
      await user.click(within(repeatTypeSelect).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '매월' }));

      // Assert: 선택된 값이 "monthly"이어야 함
      const combobox = within(repeatTypeSelect).getByRole('combobox') as HTMLInputElement;
      expect(combobox.value).toBe('monthly');
    });

    it('RS-4: 매년(yearly) 선택 → 상태 업데이트', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 유형 드롭다운에서 "매년" 선택
      const repeatTypeSelect = screen.getByLabelText('반복 유형');
      await user.click(within(repeatTypeSelect).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '매년' }));

      // Assert: 선택된 값이 "yearly"이어야 함
      const combobox = within(repeatTypeSelect).getByRole('combobox') as HTMLInputElement;
      expect(combobox.value).toBe('yearly');
    });
  });

  describe('반복 간격 입력', () => {
    it('RI-1: 간격 1 입력', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 간격 입력에 1 입력
      const repeatIntervalInput = screen.getByLabelText('반복 간격') as HTMLInputElement;
      await user.clear(repeatIntervalInput);
      await user.type(repeatIntervalInput, '1');

      // Assert: 입력된 값이 1이어야 함
      expect(repeatIntervalInput.value).toBe('1');
    });

    it('RI-2: 간격 2 입력', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 간격 입력에 2 입력
      const repeatIntervalInput = screen.getByLabelText('반복 간격') as HTMLInputElement;
      await user.clear(repeatIntervalInput);
      await user.type(repeatIntervalInput, '2');

      // Assert: 입력된 값이 2이어야 함
      expect(repeatIntervalInput.value).toBe('2');
    });

    it('RI-3: 간격 0 입력 불가 (UI 제한)', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 간격 입력 필드 확인
      const repeatIntervalInput = screen.getByLabelText('반복 간격') as HTMLInputElement;

      // Assert: min 속성으로 인해 0 입력이 제한되어야 함
      // HTML의 min 속성 확인 (브라우저가 유효성 검사 처리)
      expect(repeatIntervalInput).toHaveAttribute('min', '1');
      expect(repeatIntervalInput.type).toBe('number');
    });
  });

  describe('반복 종료일 선택', () => {
    it('RE-1: 종료일 미입력 (선택사항)', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 종료일 입력 필드 확인 (아무 입력 없음)
      const repeatEndDateInput = screen.getByLabelText('반복 종료일') as HTMLInputElement;

      // Assert: 기본값이 빈 문자열이어야 함
      expect(repeatEndDateInput.value).toBe('');
    });

    it('RE-2: 종료일 입력', async () => {
      // Arrange: 앱 렌더링 및 반복 체크박스 ON
      const { user } = setup();
      const repeatCheckbox = screen.getByRole('checkbox', { name: '반복 일정' });
      await user.click(repeatCheckbox);

      // Act: 반복 종료일 입력에 날짜 입력
      const repeatEndDateInput = screen.getByLabelText('반복 종료일') as HTMLInputElement;
      await user.type(repeatEndDateInput, '2025-12-31');

      // Assert: 입력된 값이 저장되어야 함
      expect(repeatEndDateInput.value).toBe('2025-12-31');
    });
  });
});
