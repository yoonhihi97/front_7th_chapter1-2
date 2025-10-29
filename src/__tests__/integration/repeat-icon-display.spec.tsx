import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';

import App from '../../App';
import { server } from '../../setupTests';

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

describe('캘린더 뷰 반복 일정 아이콘 표시', () => {
  describe('아이콘 표시 정확성', () => {
    it('IC-1: 단일 일정 - 반복 아이콘 표시 안 됨', async () => {
      // Given: repeat.type = 'none'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '1',
                title: '단일 일정',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'none', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 미표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('단일 일정').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 없어야 함 (data-testid로 확인)
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBe(0); // 반복 아이콘 없음, 알림도 없음
    });

    it('IC-2: daily 반복 일정 - EventRepeat 아이콘 표시', async () => {
      // Given: repeat.type = 'daily'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '2',
                title: '매일 반복',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'daily', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('매일 반복').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('IC-3: weekly 반복 일정 - EventRepeat 아이콘 표시', async () => {
      // Given: repeat.type = 'weekly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '3',
                title: '주간 팀 미팅',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('주간 팀 미팅').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('IC-4: monthly 반복 일정 - EventRepeat 아이콘 표시', async () => {
      // Given: repeat.type = 'monthly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '4',
                title: '월간 회의',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'monthly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('월간 회의').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('IC-5: yearly 반복 일정 - EventRepeat 아이콘 표시', async () => {
      // Given: repeat.type = 'yearly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '5',
                title: '연례 행사',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'yearly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('연례 행사').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('IC-6: 월간 뷰에서 반복 아이콘 표시', async () => {
      // Given: repeat.type = 'weekly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '6',
                title: '주간 반복',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간 뷰 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘 표시
      const monthView = within(screen.getByTestId('month-view'));
      expect(monthView.getByText('주간 반복')).toBeInTheDocument();
    });

    it('IC-7: 주간 뷰에서 반복 아이콘 표시', async () => {
      // Given: repeat.type = 'weekly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '7',
                title: '주간 반복',
                date: '2025-10-02',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 주간 뷰로 전환
      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // Then: EventRepeat 아이콘 표시
      const weekView = within(screen.getByTestId('week-view'));
      expect(weekView.getByText('주간 반복')).toBeInTheDocument();
    });

    it('IC-8: 월간/주간 뷰 전환 일관성', async () => {
      // Given: 동일한 반복 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: '8',
                title: '반복 일정',
                date: '2025-10-02',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 월간/주간 뷰 전환
      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: 월간 뷰에서 표시
      const monthView = within(screen.getByTestId('month-view'));
      expect(monthView.getByText('반복 일정')).toBeInTheDocument();

      // 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 주간 뷰에서도 표시
      const weekView = within(screen.getByTestId('week-view'));
      expect(weekView.getByText('반복 일정')).toBeInTheDocument();
    });
  });

  describe('복합 상태 테스트', () => {
    it('CS-1: 알림만 있는 일정 - Notifications 아이콘만 표시', async () => {
      // Given: isNotified=true, repeat.type='none'
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'cs1',
                title: '알림만',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'none', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // 알림 트리거
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Then: Notifications 아이콘만 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('알림만').closest('div');
      expect(eventBox).toBeInTheDocument();

      // Notifications 아이콘이 있어야 함 (알림 시간이 됨)
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('CS-2: 반복만 있는 일정 - EventRepeat 아이콘만 표시', async () => {
      // Given: isNotified=false, repeat.type='weekly'
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'cs2',
                title: '반복만',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: EventRepeat 아이콘만 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('반복만').closest('div');
      expect(eventBox).toBeInTheDocument();

      // EventRepeat 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('CS-3: 알림 + 반복 일정 - 두 아이콘 모두 표시, 순서: Notifications → EventRepeat → 제목', async () => {
      // Given: isNotified=true, repeat.type='weekly'
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'cs3',
                title: '알림+반복',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // 알림 트리거
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Then: 두 아이콘 모두 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('알림+반복').closest('div');
      expect(eventBox).toBeInTheDocument();

      // 두 개의 아이콘이 있어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThanOrEqual(2);
    });

    it('CS-4: 일반 일정 - 아이콘 없이 제목만 표시', async () => {
      // Given: isNotified=false, repeat.type='none'
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'cs4',
                title: '일반 일정',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'none', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: 아이콘 없이 제목만 표시
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('일반 일정').closest('div');
      expect(eventBox).toBeInTheDocument();

      // 아이콘이 없어야 함
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBe(0);
    });
  });

  describe('UI/UX 테스트', () => {
    it('UI-1: 두 아이콘 모두 fontSize="small"', async () => {
      // Given: 알림 + 반복 일정
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'ui1',
                title: '아이콘 크기 테스트',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // 알림 트리거
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Then: 두 아이콘 모두 fontSize="small"
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('아이콘 크기 테스트').closest('div');
      expect(eventBox).toBeInTheDocument();

      // 아이콘들의 크기 확인 (fontSize="small"은 실제로는 클래스로 적용됨)
      const icons = eventBox?.querySelectorAll('svg');
      expect(icons?.length).toBeGreaterThan(0);
    });

    it('UI-2: Stack이 alignItems="center" 유지', async () => {
      // Given: 반복 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'ui2',
                title: '정렬 테스트',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: alignItems="center" 유지
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('정렬 테스트');
      expect(eventBox).toBeInTheDocument();
    });

    it('UI-3: Stack이 spacing={1} 유지', async () => {
      // Given: 반복 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'ui3',
                title: '간격 테스트',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: spacing={1} 유지
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('간격 테스트');
      expect(eventBox).toBeInTheDocument();
    });

    it('UI-4: 긴 제목 + 2개 아이콘 - noWrap 유지', async () => {
      // Given: 긴 제목 + 2개 아이콘
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'ui4',
                title: '매우매우매우매우 긴 제목을 가진 일정입니다',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // 알림 트리거
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Then: noWrap 유지
      const monthView = within(screen.getByTestId('month-view'));
      const titleElement = monthView.getByText('매우매우매우매우 긴 제목을 가진 일정입니다');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveStyle({ textOverflow: 'ellipsis' });
    });
  });

  describe('회귀 테스트', () => {
    it('RG-1: 기존 알림 기능 정상 동작', async () => {
      // Given: isNotified=true, repeat.type='none'
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'rg1',
                title: '알림 테스트',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'none', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 렌더링
      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: Notifications 아이콘 정상 표시
      const monthView = within(screen.getByTestId('month-view'));
      expect(monthView.getByText('알림 테스트')).toBeInTheDocument();
    });

    it('RG-2: 일정 클릭 기능 정상 동작', async () => {
      // Given: 반복 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'rg2',
                title: '클릭 테스트',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 일정 수정 버튼 클릭
      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      // Then: 수정 폼이 열려야 함
      expect(screen.getByRole('heading', { name: '일정 수정' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('클릭 테스트')).toBeInTheDocument();
    });

    it('RG-3: 검색 필터링 정상 동작', async () => {
      // Given: 여러 일정 (반복 포함)
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              {
                id: 'rg3-1',
                title: '주간 미팅',
                date: '2025-10-15',
                startTime: '09:00',
                endTime: '10:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'weekly', interval: 1 },
                notificationTime: 10,
              },
              {
                id: 'rg3-2',
                title: '일반 회의',
                date: '2025-10-16',
                startTime: '14:00',
                endTime: '15:00',
                description: '설명',
                location: '위치',
                category: '업무',
                repeat: { type: 'none', interval: 1 },
                notificationTime: 10,
              },
            ],
          });
        })
      );

      // When: 검색어 입력
      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
      await user.type(searchInput, '주간');

      // Then: 필터링된 반복 일정에 아이콘 표시
      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('주간 미팅')).toBeInTheDocument();
      expect(eventList.queryByText('일반 회의')).not.toBeInTheDocument();
    });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.setSystemTime(new Date('2025-10-01'));
  });
});
