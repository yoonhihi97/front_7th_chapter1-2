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

/**
 * 일정 편집 후 다이얼로그 표시까지의 공통 로직
 * @param user - userEvent 인스턴스
 * @param newTitle - 수정할 제목
 */
const editEventAndOpenDialog = async (user: ReturnType<typeof userEvent.setup>, newTitle: string) => {
  const editButtons = await screen.findAllByLabelText('Edit event');
  await user.click(editButtons[0]);

  const titleInput = screen.getByLabelText('제목');
  await user.clear(titleInput);
  await user.type(titleInput, newTitle);

  await user.click(screen.getByTestId('event-submit-button'));

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
};

/**
 * Mock 핸들러를 설정하여 반복 일정 전체 수정 API를 모킹합니다.
 * @param initEvents - 초기 이벤트 목록
 */
const setupMockHandlerRecurringUpdate = (initEvents: Event[] = []) => {
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
      const updatedEvents = mockEvents.map((event) => {
        if (event.repeat.id === repeatId) {
          updatedCount++;
          return {
            ...event,
            title: updateData.title !== undefined ? updateData.title : event.title,
            startTime: updateData.startTime !== undefined ? updateData.startTime : event.startTime,
            endTime: updateData.endTime !== undefined ? updateData.endTime : event.endTime,
            description: updateData.description !== undefined ? updateData.description : event.description,
            location: updateData.location !== undefined ? updateData.location : event.location,
            category: updateData.category !== undefined ? updateData.category : event.category,
            notificationTime:
              updateData.notificationTime !== undefined ? updateData.notificationTime : event.notificationTime,
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

      const updatedSeries = updatedEvents.filter((e) => e.repeat.id === repeatId);
      return HttpResponse.json(updatedSeries);
    })
  );
};

describe('반복 일정 전체 수정 기능 (2단계)', () => {
  /**
   * 반복 시리즈 A (주간, 3개 일정)
   * repeat.id = 'repeat-id-A'
   */
  const weeklySeriesA: Event[] = [
    {
      id: 'event-a-1',
      title: '팀 미팅',
      date: '2025-10-05',
      startTime: '10:00',
      endTime: '11:00',
      description: '팀 스탠드업',
      location: '회의실 A',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-12-31',
        id: 'repeat-id-A',
      },
      notificationTime: 10,
    },
    {
      id: 'event-a-2',
      title: '팀 미팅',
      date: '2025-10-12',
      startTime: '10:00',
      endTime: '11:00',
      description: '팀 스탠드업',
      location: '회의실 A',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-12-31',
        id: 'repeat-id-A',
      },
      notificationTime: 10,
    },
    {
      id: 'event-a-3',
      title: '팀 미팅',
      date: '2025-10-19',
      startTime: '10:00',
      endTime: '11:00',
      description: '팀 스탠드업',
      location: '회의실 A',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-12-31',
        id: 'repeat-id-A',
      },
      notificationTime: 10,
    },
  ];

  /**
   * 반복 시리즈 B (주간, 2개 일정)
   * repeat.id = 'repeat-id-B'
   */
  const weeklySeriesB: Event[] = [
    {
      id: 'event-b-1',
      title: '개발 회의',
      date: '2025-10-06',
      startTime: '14:00',
      endTime: '15:00',
      description: '개발 팀 미팅',
      location: '회의실 B',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-12-31',
        id: 'repeat-id-B',
      },
      notificationTime: 10,
    },
    {
      id: 'event-b-2',
      title: '개발 회의',
      date: '2025-10-13',
      startTime: '14:00',
      endTime: '15:00',
      description: '개발 팀 미팅',
      location: '회의실 B',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-12-31',
        id: 'repeat-id-B',
      },
      notificationTime: 10,
    },
  ];

  describe('Happy Path (정상 시나리오)', () => {
    it('TC-1: "아니오" 버튼 클릭 시 updateRecurringEvents 호출', async () => {
      // Given: 반복 일정 수정 다이얼로그 표시 중
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 일정 편집 및 다이얼로그 표시
      await editEventAndOpenDialog(user, '팀 미팅 (전체 수정)');

      // When: "아니오" 버튼 클릭
      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: updateRecurringEvents 호출 (API 요청)
      // 다이얼로그 닫힘
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // fetchEvents() 호출되어 스낵바 표시
      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });
    });

    it('TC-2: API 요청에 수정 데이터 포함', async () => {
      // Given: "아니오" 버튼 클릭
      let capturedRequest: Partial<Event> | null = null;

      const mockEvents: Event[] = [...weeklySeriesA];
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
          const { repeatId } = params;
          capturedRequest = (await request.json()) as Partial<Event>;

          const updatedEvents = mockEvents.map((event) => {
            if (event.repeat.id === repeatId) {
              return {
                ...event,
                title: capturedRequest!.title || event.title,
                startTime: capturedRequest!.startTime || event.startTime,
                endTime: capturedRequest!.endTime || event.endTime,
              };
            }
            return event;
          });

          mockEvents.length = 0;
          mockEvents.push(...updatedEvents);

          return HttpResponse.json(updatedEvents.filter((e) => e.repeat.id === repeatId));
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      const startTimeInput = screen.getByLabelText('시작 시간');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '14:00');

      const endTimeInput = screen.getByLabelText('종료 시간');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '15:00');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: API 요청에 수정 데이터 포함
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.title).toBe('팀 미팅 (수정)');
        expect(capturedRequest?.startTime).toBe('14:00');
        expect(capturedRequest?.endTime).toBe('15:00');
        // date, repeat는 포함하지 않음
        expect(capturedRequest).not.toHaveProperty('date');
        expect(capturedRequest).not.toHaveProperty('repeat');
      });
    });

    it('TC-3: 같은 repeat.id의 모든 일정 수정됨', async () => {
      // Given: 3개의 반복 일정 (같은 repeat.id)
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // When: "아니오" 클릭 → 제목 변경
      await editEventAndOpenDialog(user, '팀 미팅 (전체 변경)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      // Then: 3개 모두 제목 변경됨 (이벤트 목록에서)
      await waitFor(() => {
        const eventList = within(screen.getByTestId('event-list'));
        const titleElements = eventList.getAllByText('팀 미팅 (전체 변경)');
        expect(titleElements).toHaveLength(3);
      });
    });

    it('TC-4: repeat.type, repeat.id 유지', async () => {
      // Given: repeat.type = 'weekly', repeat.id = 'repeat-id-A'
      const mockEvents: Event[] = [...weeklySeriesA];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
          const { repeatId } = params;
          const updateData = (await request.json()) as Partial<Event>;

          const updatedEvents = mockEvents.map((event) => {
            if (event.repeat.id === repeatId) {
              return {
                ...event,
                title: updateData.title || event.title,
                // repeat는 유지됨
              };
            }
            return event;
          });

          mockEvents.length = 0;
          mockEvents.push(...updatedEvents);

          return HttpResponse.json(updatedEvents.filter((e) => e.repeat.id === repeatId));
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // When: 전체 수정
      await editEventAndOpenDialog(user, '팀 미팅 (수정)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      // Then: repeat.type, repeat.id 유지됨
      // (EventRepeat 아이콘이 계속 표시되는지로 확인)
      await waitFor(() => {
        const repeatIcons = screen.getAllByTestId('EventRepeatIcon');
        expect(repeatIcons).toHaveLength(3); // 3개의 반복 일정 모두 아이콘 유지
      });
    });

    it('TC-5: 반복 아이콘 유지', async () => {
      // Given: 전체 수정 완료
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 반복 아이콘 있는지 확인
      await waitFor(() => {
        const repeatIcons = screen.getAllByTestId('EventRepeatIcon');
        expect(repeatIcons).toHaveLength(3);
      });

      // When: 전체 수정
      await editEventAndOpenDialog(user, '팀 미팅 (수정)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      // Then: 반복 아이콘(EventRepeat) 유지됨
      await waitFor(() => {
        const repeatIcons = screen.getAllByTestId('EventRepeatIcon');
        expect(repeatIcons).toHaveLength(3);
      });
    });

    it('TC-6: 스낵바 메시지 표시', async () => {
      // Given: API 성공
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      await editEventAndOpenDialog(user, '팀 미팅 (수정)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 스낵바 메시지: "반복 일정이 모두 수정되었습니다."
      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Cases (경계 케이스)', () => {
    it('TC-7: repeat.id가 없는 경우 에러 처리', async () => {
      // Given: editingEvent.repeat.id === undefined
      const eventWithoutRepeatId: Event = {
        id: 'event-no-id',
        title: '반복 일정 (ID 없음)',
        date: '2025-10-05',
        startTime: '10:00',
        endTime: '11:00',
        description: '설명',
        location: '위치',
        category: '업무',
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: '2025-12-31',
          // id 없음
        },
        notificationTime: 10,
      };

      let apiCalled = false;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [eventWithoutRepeatId] });
        }),
        http.put('/api/recurring-events/:repeatId', async () => {
          apiCalled = true;
          return HttpResponse.json([]);
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '반복 일정 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 버튼 클릭
      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 조기 반환 (아무 동작 안 함)
      await waitFor(
        () => {
          // 다이얼로그가 닫혔는지 확인
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // API 호출 없음
      expect(apiCalled).toBe(false);
    });

    it('TC-8: 같은 repeat.id의 일정이 1개인 경우', async () => {
      // Given: 반복 일정 1개만 존재 (repeat.id = 'repeat-id-single')
      const singleRepeatEvent: Event = {
        id: 'event-single',
        title: '단일 반복 일정',
        date: '2025-10-05',
        startTime: '10:00',
        endTime: '11:00',
        description: '설명',
        location: '위치',
        category: '업무',
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: '2025-12-31',
          id: 'repeat-id-single',
        },
        notificationTime: 10,
      };

      setupMockHandlerRecurringUpdate([singleRepeatEvent]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // When: "아니오" 클릭 → 수정
      await editEventAndOpenDialog(user, '단일 반복 일정 (수정)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 1개만 수정됨 (정상 동작)
      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      await waitFor(() => {
        const eventList = within(screen.getByTestId('event-list'));
        expect(eventList.getByText('단일 반복 일정 (수정)')).toBeInTheDocument();
      });
    });

    it('TC-9: 서로 다른 repeat.id의 일정들 (영향 없음)', async () => {
      // Given: 2개 시리즈 (repeat-id-A: 3개, repeat-id-B: 2개)
      setupMockHandlerRecurringUpdate([...weeklySeriesA, ...weeklySeriesB]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // When: A 시리즈 수정 (제목 변경)
      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]); // A 시리즈 첫 번째 일정

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (A 수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      // Then: A 시리즈만 수정, B는 원래대로 유지
      await waitFor(() => {
        const eventList = within(screen.getByTestId('event-list'));
        // A 시리즈: 3개 모두 제목 변경
        const seriesA = eventList.getAllByText('팀 미팅 (A 수정)');
        expect(seriesA).toHaveLength(3);

        // B 시리즈: 2개 모두 원래 제목 유지
        const seriesB = eventList.getAllByText('개발 회의');
        expect(seriesB).toHaveLength(2);
      });
    });

    it('TC-10: 다이얼로그 닫힘 확인', async () => {
      // Given: "아니오" 버튼 클릭
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      await editEventAndOpenDialog(user, '팀 미팅 (수정)');

      // When: handleEditAllEvents 실행
      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: isEditRepeatDialogOpen = false
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 폼이 초기화됨
      expect(screen.getByLabelText('제목')).toHaveValue('');
    });
  });

  describe('Error Cases (오류 처리)', () => {
    it('TC-11: API 호출 실패 시 에러 처리', async () => {
      // Given: "아니오" 버튼 클릭
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [...weeklySeriesA] });
        }),
        // When: PUT /api/recurring-events/:repeatId 실패 (500)
        http.put('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      await editEventAndOpenDialog(user, '팀 미팅 (수정)');

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 에러 스낵바: "반복 일정 수정 실패"
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정 실패')).toBeInTheDocument();
      });

      // 일정 목록 갱신 안 됨 (원래 제목 유지)
      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getAllByText('팀 미팅')).toHaveLength(3);
    });

    it('TC-12: repeat.id 없는 반복 일정 수정 시도', async () => {
      // Given: repeat.type = 'weekly', repeat.id = undefined
      const eventWithoutRepeatId: Event = {
        id: 'event-no-id',
        title: '반복 일정',
        date: '2025-10-05',
        startTime: '10:00',
        endTime: '11:00',
        description: '설명',
        location: '위치',
        category: '업무',
        repeat: {
          type: 'weekly',
          interval: 1,
          // id 없음
        },
        notificationTime: 10,
      };

      let apiCalled = false;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [eventWithoutRepeatId] });
        }),
        http.put('/api/recurring-events/:repeatId', () => {
          apiCalled = true;
          return HttpResponse.json([]);
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '반복 일정 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 버튼 클릭
      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 조기 반환, API 호출 없음
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      expect(apiCalled).toBe(false);
    });

    it('TC-13: 필수값 누락 시 다이얼로그 표시 전 검증', async () => {
      // Given: 제목 비움
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [...weeklySeriesA] });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      // 제목 비우기
      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);

      // When: "일정 수정" 버튼 클릭
      await user.click(screen.getByTestId('event-submit-button'));

      // Then: 검증 에러 표시, 다이얼로그 표시 안 됨
      await waitFor(() => {
        expect(screen.getByText('필수 정보를 모두 입력해주세요.')).toBeInTheDocument();
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('State Cases (상태 관리)', () => {
    it('TC-14: 폼 초기화 확인', async () => {
      // Given: 전체 수정 완료
      setupMockHandlerRecurringUpdate([...weeklySeriesA]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      // 편집 모드 확인
      expect(screen.getByRole('heading', { name: '일정 수정' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument();

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByText('반복 일정이 모두 수정되었습니다.')).toBeInTheDocument();
      });

      // Then: 폼 초기화됨
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '일정 추가' })).toBeInTheDocument();
      });
      expect(screen.getByLabelText('제목')).toHaveValue('');
    });

    it('TC-15: 다이얼로그 대기 중 다른 일정 선택', async () => {
      // Given: 반복 일정 A 다이얼로그 표시 중
      const seriesA = [...weeklySeriesA];
      const seriesB = [...weeklySeriesB];

      setupMockHandlerRecurringUpdate([...seriesA, ...seriesB]);

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 첫 번째 일정 (A 시리즈) 편집
      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument();

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: 반복 일정 B 선택 (editingEvent 변경)
      const updatedEditButtons = await screen.findAllByLabelText('Edit event');
      await user.click(updatedEditButtons[3]); // B 시리즈 첫 번째 일정

      // Then: 다이얼로그 닫힘 (useEffect에서 자동 처리)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 폼에 B 데이터 표시
      await waitFor(() => {
        expect(screen.getByDisplayValue('개발 회의')).toBeInTheDocument();
      });
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });
});
