import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, waitFor } from '@testing-library/react';
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

describe('반복 일정 삭제 기능 (영역 기반 쿼리)', () => {
  /**
   * 테스트용 단일 일정 Mock 데이터
   * repeat.type = 'none'인 단일 일정
   */
  const singleEvent: Event = {
    id: 'event-single-1',
    title: '단일 회의',
    date: '2025-10-15',
    startTime: '10:00',
    endTime: '11:00',
    description: '단일 일정',
    location: '회의실',
    category: '업무',
    repeat: { type: 'none', interval: 1 },
    notificationTime: 10,
  };

  /**
   * 테스트용 반복 일정 Mock 데이터 (같은 시리즈)
   * repeat.type = 'weekly', 같은 repeat.id = 'repeat-weekly-123'
   */
  const repeatEvent1: Event = {
    id: 'event-repeat-1',
    title: '주간 회의',
    date: '2025-10-15',
    startTime: '14:00',
    endTime: '15:00',
    description: '주간 반복 일정',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'weekly', interval: 1, id: 'repeat-weekly-123' },
    notificationTime: 10,
  };

  const repeatEvent2: Event = {
    id: 'event-repeat-2',
    title: '주간 회의',
    date: '2025-10-22',
    startTime: '14:00',
    endTime: '15:00',
    description: '주간 반복 일정',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'weekly', interval: 1, id: 'repeat-weekly-123' },
    notificationTime: 10,
  };

  describe('Happy Path (정상 시나리오)', () => {
    it('HP-1: 단일 일정 삭제 - 다이얼로그 없이 즉시 삭제', async () => {
      // Given: repeat.type = 'none'인 일정
      const mockEvents = [singleEvent];

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
      await screen.findByText('일정 로딩 완료!');

      // 이벤트 목록에서 삭제 버튼 클릭
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getByText('단일 회의')).toBeInTheDocument();

      const deleteButton = within(eventList).getByLabelText('Delete event');

      // When: 삭제 버튼 클릭
      await user.click(deleteButton);

      // Then: 다이얼로그 표시 안 됨, 즉시 삭제
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 성공 메시지 표시
      expect(screen.getByText('일정이 삭제되었습니다.')).toBeInTheDocument();

      // 이벤트 목록에서 제거됨
      await waitFor(() => {
        expect(within(eventList).queryByText('단일 회의')).not.toBeInTheDocument();
      });
    });

    it('HP-2: 반복 일정 삭제 - 다이얼로그 표시', async () => {
      // Given: repeat.type = 'weekly'인 일정
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [repeatEvent1, repeatEvent2] });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 이벤트 목록에서 반복 일정 확인
      const eventList = screen.getByTestId('event-list');
      const repeatEvents = within(eventList).getAllByText('주간 회의');
      expect(repeatEvents).toHaveLength(2);

      // When: 삭제 버튼 클릭
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      // Then: 다이얼로그 표시
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 다이얼로그 내용 확인
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: '아니오' })).toBeInTheDocument();
    });

    it('HP-3: 반복 일정 - 해당 일정만 삭제 (예)', async () => {
      // Given: 다이얼로그 표시, 반복 일정 2개 (같은 repeat.id)
      const mockEvents = [repeatEvent1, repeatEvent2];

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
      await screen.findByText('일정 로딩 완료!');

      // 이벤트 목록 확인
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getAllByText('주간 회의')).toHaveLength(2);

      // 삭제 버튼 클릭 → 다이얼로그 표시
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "예" 버튼 클릭
      const dialog = screen.getByRole('dialog');
      const yesButton = within(dialog).getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: 1개만 제거, 나머지 1개 유지
      await waitFor(() => {
        const remainingEvents = within(eventList).getAllByText('주간 회의');
        expect(remainingEvents).toHaveLength(1);
      });
    });

    it('HP-4: 반복 일정 - 전체 삭제 (아니오)', async () => {
      // Given: 다이얼로그 표시, repeat.id = 'repeat-weekly-123'
      const mockEvents = [repeatEvent1, repeatEvent2];

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
      await screen.findByText('일정 로딩 완료!');

      // 이벤트 목록 확인
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getAllByText('주간 회의')).toHaveLength(2);

      // 삭제 버튼 클릭 → 다이얼로그 표시
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 버튼 클릭
      const dialog = screen.getByRole('dialog');
      const noButton = within(dialog).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 모든 일정 제거
      await waitFor(() => {
        expect(within(eventList).queryByText('주간 회의')).not.toBeInTheDocument();
      });

      // "검색 결과가 없습니다." 메시지 표시
      expect(within(eventList).getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    });

    it('HP-5: 다이얼로그 - "예" 버튼 클릭 시 닫힘', async () => {
      // Given: 다이얼로그 열림
      const mockEvents = [repeatEvent1, repeatEvent2];

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
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "예" 버튼 클릭
      const dialog = screen.getByRole('dialog');
      const yesButton = within(dialog).getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: 다이얼로그 닫힘
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('HP-6: 다이얼로그 - "아니오" 버튼 클릭 시 닫힘', async () => {
      // Given: 다이얼로그 열림
      const mockEvents = [repeatEvent1, repeatEvent2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', () => {
          mockEvents.length = 0;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 버튼 클릭
      const dialog = screen.getByRole('dialog');
      const noButton = within(dialog).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 다이얼로그 닫힘
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('HP-7: 성공 메시지 표시', async () => {
      // Given: 삭제 완료
      const mockEvents = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', () => {
          mockEvents.length = 0;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');
      await user.click(deleteButton);

      // When: 삭제 완료
      // Then: "일정이 삭제되었습니다." 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정이 삭제되었습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Cases (경계 케이스)', () => {
    it('BC-1: 캘린더는 읽기 전용 - 이벤트 목록에서만 삭제', async () => {
      // Given: 캘린더 영역과 이벤트 목록에 동일 일정 표시
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [singleEvent] });
        })
      );

      setup();
      await screen.findByText('일정 로딩 완료!');

      // Then: 캘린더 영역에서 삭제 버튼 없음
      const monthView = screen.getByTestId('month-view');
      expect(within(monthView).getByText('단일 회의')).toBeInTheDocument();
      expect(within(monthView).queryByLabelText('Delete event')).not.toBeInTheDocument();

      // 이벤트 목록에만 삭제 버튼 있음
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getByLabelText('Delete event')).toBeInTheDocument();
    });

    it('BC-2: 다이얼로그 Escape 키 - 삭제 안 됨', async () => {
      // Given: 다이얼로그 열림
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [repeatEvent1, repeatEvent2] });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: Escape 키
      await user.keyboard('{Escape}');

      // Then: 다이얼로그 닫힘, 삭제 안 됨
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 일정 여전히 존재
      expect(within(eventList).getAllByText('주간 회의')).toHaveLength(2);
    });

    it('BC-3: 마지막 일정 삭제 후 목록 비움', async () => {
      // Given: 마지막 일정만 있음
      const mockEvents = [singleEvent];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', () => {
          mockEvents.length = 0;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');

      // When: 삭제
      await user.click(deleteButton);

      // Then: "검색 결과가 없습니다." 메시지 표시
      await waitFor(() => {
        expect(within(eventList).getByText('검색 결과가 없습니다.')).toBeInTheDocument();
      });
    });

    it('BC-4: repeat.id 없는 경우 - 안전 처리', async () => {
      // Given: repeat.id가 없는 반복 일정
      const eventWithoutRepeatId: Event = {
        ...repeatEvent1,
        repeat: { type: 'weekly', interval: 1 }, // id 없음
      };

      const mockEvents = [eventWithoutRepeatId];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 클릭 (repeat.id 없음)
      const dialog = screen.getByRole('dialog');
      const noButton = within(dialog).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 오류 없이 다이얼로그만 닫힘
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Cases (오류 케이스)', () => {
    it('EC-1: 단일 삭제 API 실패 (500)', async () => {
      // Given: 단일 일정 삭제 시도
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [singleEvent] });
        }),
        // When: 서버 500 에러
        http.delete('/api/events/:id', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');
      await user.click(deleteButton);

      // Then: 일정 유지, 에러 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정 삭제 실패')).toBeInTheDocument();
      });

      // 일정 여전히 존재
      expect(within(eventList).getByText('단일 회의')).toBeInTheDocument();
    });

    it('EC-2: 전체 삭제 API 실패 (500)', async () => {
      // Given: 반복 전체 삭제 시도
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [repeatEvent1, repeatEvent2] });
        }),
        // When: 서버 500 에러
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const noButton = within(dialog).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 모든 일정 유지, 에러 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('일정 삭제 실패')).toBeInTheDocument();
      });

      // 일정 여전히 존재
      expect(within(eventList).getAllByText('주간 회의')).toHaveLength(2);
    });

    it('EC-3: 네트워크 타임아웃 에러', async () => {
      // Given: 삭제 요청 중
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [singleEvent] });
        }),
        // When: 네트워크 타임아웃 (응답 없음)
        http.delete('/api/events/:id', async () => {
          await new Promise(() => {}); // 무한 대기 (timeout 시뮬레이션)
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');
      await user.click(deleteButton);

      // Then: 일정 유지 (타임아웃 발생 시나리오)
      // 실제로는 타임아웃이 매우 오래 걸리므로 일정이 여전히 존재하는지만 확인
      await waitFor(
        () => {
          expect(within(eventList).getByText('단일 회의')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('State Cases (상태 케이스)', () => {
    it('SC-1: 순차 삭제 - 여러 일정 연속 삭제', async () => {
      // Given: 단일 일정 1개, 반복 일정 2개
      const mockEvents = [singleEvent, repeatEvent1, repeatEvent2];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);
          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
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
      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');

      // When: 1. 단일 일정 삭제
      let deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]); // 단일 회의 삭제

      await waitFor(() => {
        expect(within(eventList).queryByText('단일 회의')).not.toBeInTheDocument();
      });

      // 2. 반복 일정 1개 삭제 (예)
      deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      let dialog = screen.getByRole('dialog');
      const yesButton = within(dialog).getByRole('button', { name: '예' });
      await user.click(yesButton);

      await waitFor(() => {
        const remainingEvents = within(eventList).getAllByText('주간 회의');
        expect(remainingEvents).toHaveLength(1);
      });

      // 3. 반복 일정 1개 삭제 (아니오)
      deleteButtons = within(eventList).getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      dialog = screen.getByRole('dialog');
      const noButton = within(dialog).getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 마지막에 목록 비워짐
      await waitFor(() => {
        expect(within(eventList).getByText('검색 결과가 없습니다.')).toBeInTheDocument();
      });
    });

    it('SC-2: 캘린더 뷰 전환 후 삭제', async () => {
      // Given: 월간 뷰에서 일정 표시
      const mockEvents = [
        {
          ...singleEvent,
          date: '2025-10-02', // 주간 뷰에서 보이도록 날짜 조정
        },
      ];

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
      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰에서 일정 확인
      const monthView = screen.getByTestId('month-view');
      expect(within(monthView).getByText('단일 회의')).toBeInTheDocument();

      // When: 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 주간 뷰에서 일정 확인
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('단일 회의')).toBeInTheDocument();

      // 삭제
      const eventList = screen.getByTestId('event-list');
      const deleteButton = within(eventList).getByLabelText('Delete event');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(within(weekView).queryByText('단일 회의')).not.toBeInTheDocument();
      });

      // 월간 뷰로 복귀
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'month-option' }));

      // Then: 월간 뷰에서도 삭제 반영됨
      const updatedMonthView = screen.getByTestId('month-view');
      expect(within(updatedMonthView).queryByText('단일 회의')).not.toBeInTheDocument();
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });
});
