import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';

import App from '../../App';
import { server } from '../../setupTests';
import { Event } from '../../types';

const theme = createTheme();

/**
 * 테스트 환경을 설정하고 App 컴포넌트를 렌더링합니다.
 * @returns render 결과와 userEvent 인스턴스
 */
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

describe('반복 일정 삭제', () => {
  /**
   * 테스트용 단일 일정 Mock 데이터
   */
  const singleEvent: Event = {
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
  };

  /**
   * 테스트용 반복 일정 Mock 데이터
   */
  const weeklyEvent: Event = {
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
      id: 'repeat-weekly-123',
    },
    notificationTime: 10,
  };

  /**
   * 반복 시리즈의 두 번째 일정
   */
  const weeklyEvent2: Event = {
    id: 'event-repeat-2',
    title: '주간 회의',
    date: '2025-10-22',
    startTime: '14:00',
    endTime: '15:00',
    description: '매주 진행',
    location: '회의실 B',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-weekly-123',
    },
    notificationTime: 10,
  };

  describe('행복 경로', () => {
    it('HP-1: 단일 일정 삭제 - 다이얼로그 없이 즉시 삭제', async () => {
      const mockEvents: Event[] = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      // 일정이 표시될 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('단일 회의')).toBeInTheDocument();
      });

      // 삭제 버튼 클릭
      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 다이얼로그가 표시되지 않아야 함
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 일정이 삭제되었는지 확인
      await waitFor(() => {
        expect(screen.queryByText('단일 회의')).not.toBeInTheDocument();
      });

      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('일정이 삭제되었습니다.')).toBeInTheDocument();
      });
    });

    it('HP-2: 반복 일정 삭제 - 다이얼로그 표시', async () => {
      const mockEvents: Event[] = [weeklyEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup();

      // 일정이 표시될 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      // 삭제 버튼 클릭
      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 다이얼로그가 표시되어야 함
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 다이얼로그 내용 확인
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('일정 삭제')).toBeInTheDocument();
      expect(within(dialog).getByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: '아니오' })).toBeInTheDocument();
    });

    it('HP-3: 반복 일정 - 해당 일정만 삭제 (예)', async () => {
      const mockEvents: Event[] = [weeklyEvent, weeklyEvent2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      // 일정이 표시될 때까지 대기
      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(2);
      });

      // 첫 번째 일정의 삭제 버튼 클릭
      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      // 다이얼로그에서 "예" 클릭
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = within(screen.getByRole('dialog')).getByRole('button', { name: '예' });
      await user.click(yesButton);

      // 다이얼로그가 닫혀야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 한 개의 일정만 삭제되고 나머지는 유지
      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(1);
      });
    });

    it('HP-4: 반복 일정 - 전체 삭제 (아니오)', async () => {
      const mockEvents: Event[] = [weeklyEvent, weeklyEvent2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', ({ params }) => {
          const { repeatId } = params;
          // repeatId와 일치하는 모든 일정 삭제
          const filtered = mockEvents.filter((event) => event.repeat.id !== repeatId);
          mockEvents.length = 0;
          mockEvents.push(...filtered);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      // 일정이 표시될 때까지 대기
      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(2);
      });

      // 첫 번째 일정의 삭제 버튼 클릭
      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      // 다이얼로그에서 "아니오" 클릭
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = within(screen.getByRole('dialog')).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // 다이얼로그가 닫혀야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 모든 반복 일정이 삭제되어야 함
      await waitFor(() => {
        expect(screen.queryByText('주간 회의')).not.toBeInTheDocument();
      });
    });

    it('HP-5: 다이얼로그 - "예" 버튼 클릭 시 닫힘', async () => {
      const mockEvents: Event[] = [weeklyEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = within(screen.getByRole('dialog')).getByRole('button', { name: '예' });
      await user.click(yesButton);

      // 다이얼로그가 닫혀야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('HP-6: 다이얼로그 - "아니오" 버튼 클릭 시 닫힘', async () => {
      const mockEvents: Event[] = [weeklyEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', ({ params }) => {
          const { repeatId } = params;
          const filtered = mockEvents.filter((event) => event.repeat.id !== repeatId);
          mockEvents.length = 0;
          mockEvents.push(...filtered);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = within(screen.getByRole('dialog')).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // 다이얼로그가 닫혀야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('HP-7: 성공 메시지 표시', async () => {
      const mockEvents: Event[] = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('단일 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 성공 메시지 표시 확인
      await waitFor(() => {
        expect(screen.getByText('일정이 삭제되었습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('경계 케이스', () => {
    it('BC-1: 반복 종료일 경계 - 마지막 일정 삭제', async () => {
      const lastRepeatEvent: Event = {
        ...weeklyEvent,
        id: 'event-repeat-last',
        date: '2025-12-31',
      };

      const mockEvents: Event[] = [lastRepeatEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 마지막 일정이어도 반복 일정이므로 다이얼로그 표시
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('BC-2: repeat.id 누락 처리', async () => {
      const noRepeatIdEvent: Event = {
        ...weeklyEvent,
        id: 'event-no-repeat-id',
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: '2025-12-31',
          // id가 없음
        },
      };

      const mockEvents: Event[] = [noRepeatIdEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', () => {
          // repeatId가 undefined일 경우를 대비
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = within(screen.getByRole('dialog')).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // 오류 없이 안전하게 종료되어야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('BC-3: 다이얼로그 Escape 키 (닫기만 함)', async () => {
      const mockEvents: Event[] = [weeklyEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('주간 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Escape 키 입력
      await user.keyboard('{Escape}');

      // 다이얼로그가 닫혀야 함
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 일정은 그대로 유지되어야 함
      expect(screen.getByText('주간 회의')).toBeInTheDocument();
    });

    it('BC-4: 빈 이벤트 목록에서 삭제 후 상태', async () => {
      const mockEvents: Event[] = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('단일 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 일정이 삭제되어 빈 목록 상태
      await waitFor(() => {
        expect(screen.queryByText('단일 회의')).not.toBeInTheDocument();
      });

      // 오류 없이 빈 목록 표시
      expect(screen.queryByText('단일 회의')).not.toBeInTheDocument();
    });
  });

  describe('오류 케이스', () => {
    it('EC-1: 단일 삭제 API 실패 (500 에러)', async () => {
      const mockEvents: Event[] = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('단일 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 오류 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정 삭제 실패')).toBeInTheDocument();
      });

      // 일정이 여전히 목록에 있어야 함 (롤백)
      expect(screen.getByText('단일 회의')).toBeInTheDocument();
    });

    it('EC-2: 전체 삭제 API 실패 (500 에러)', async () => {
      const mockEvents: Event[] = [weeklyEvent, weeklyEvent2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(2);
      });

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = within(screen.getByRole('dialog')).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // 오류 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정 삭제 실패')).toBeInTheDocument();
      });

      // 모든 일정이 여전히 목록에 있어야 함
      expect(screen.getAllByText('주간 회의')).toHaveLength(2);
    });

    it('EC-3: 네트워크 타임아웃', async () => {
      const mockEvents: Event[] = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', () => {
          return HttpResponse.error();
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('단일 회의')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      // 타임아웃 오류 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정 삭제 실패')).toBeInTheDocument();
      });
    });
  });

  describe('상태 케이스', () => {
    it('SC-1: 순차 삭제 - 여러 일정 연속 삭제', async () => {
      const event1: Event = { ...weeklyEvent, id: 'event-1' };
      const event2: Event = {
        ...weeklyEvent,
        id: 'event-2',
        repeat: { ...weeklyEvent.repeat, id: 'repeat-weekly-456' },
      };

      const mockEvents: Event[] = [event1, event2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(2);
      });

      // 첫 번째 일정 삭제
      let deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      let yesButton = within(screen.getByRole('dialog')).getByRole('button', { name: '예' });
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText('주간 회의')).toHaveLength(1);
      });

      // 두 번째 일정 삭제
      deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      yesButton = within(screen.getByRole('dialog')).getByRole('button', { name: '예' });
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 모든 일정이 삭제됨
      await waitFor(() => {
        expect(screen.queryByText('주간 회의')).not.toBeInTheDocument();
      });
    });

    it('SC-2: 편집 중 삭제 (Race Condition)', async () => {
      const event1: Event = {
        ...weeklyEvent,
        id: 'event-1',
        title: '편집 대상',
        repeat: { ...weeklyEvent.repeat, id: 'repeat-1' },
      };
      const event2: Event = {
        ...weeklyEvent,
        id: 'event-2',
        title: '삭제 대상',
        repeat: { ...weeklyEvent.repeat, id: 'repeat-2' },
      };

      const mockEvents: Event[] = [event1, event2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', ({ params }) => {
          const { repeatId } = params;
          const filtered = mockEvents.filter((event) => event.repeat.id !== repeatId);
          mockEvents.length = 0;
          mockEvents.push(...filtered);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();

      await waitFor(() => {
        expect(screen.getByText('편집 대상')).toBeInTheDocument();
        expect(screen.getByText('삭제 대상')).toBeInTheDocument();
      });

      // 첫 번째 일정 편집 시작
      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      // 편집 폼이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByLabelText('제목')).toBeInTheDocument();
      });

      // 두 번째 일정 삭제 (전체 삭제)
      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[1]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = within(screen.getByRole('dialog')).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 삭제 대상은 사라지고 편집 대상은 유지
      await waitFor(() => {
        expect(screen.queryByText('삭제 대상')).not.toBeInTheDocument();
      });

      expect(screen.getByText('편집 대상')).toBeInTheDocument();
    });
  });
});
