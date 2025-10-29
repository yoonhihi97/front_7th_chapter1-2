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

describe('반복 일정 단일 수정 기능 (1단계)', () => {
  // Mock 데이터
  const weeklyEvent: Event = {
    id: 'event-weekly-1',
    title: '팀 미팅',
    date: '2025-10-15',
    startTime: '10:00',
    endTime: '11:00',
    description: '팀 스탠드업',
    location: '회의실 A',
    category: '업무',
    repeat: {
      type: 'weekly',
      interval: 1,
      endDate: '2025-12-31',
    },
    notificationTime: 10,
  };

  const singleEvent: Event = {
    id: 'event-single-1',
    title: '일일 일정',
    date: '2025-10-10',
    startTime: '14:00',
    endTime: '15:00',
    description: '단일 일정',
    location: '사무실',
    category: '업무',
    repeat: {
      type: 'none',
      interval: 1,
    },
    notificationTime: 5,
  };

  describe('Happy Path (정상 시나리오)', () => {
    it('TC-1: 반복 일정 수정 시 다이얼로그 표시', async () => {
      // Given: 반복 일정을 수정 중 (editingEvent.repeat.type = 'weekly')
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 반복 일정 편집 버튼 클릭
      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      // 제목 수정
      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      // When: "일정 수정" 버튼 클릭
      await user.click(screen.getByTestId('event-submit-button'));

      // Then: "해당 일정만 수정하시겠어요?" 다이얼로그 표시됨
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
    });

    it('TC-2: "예" 버튼 클릭 시 repeat.type이 \'none\'으로 변경되어 API 호출', async () => {
      // Given: 다이얼로그 표시 중 (repeat.type = 'weekly')
      let capturedRequest: Event | null = null;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        http.put('/api/events/:id', async ({ request }) => {
          capturedRequest = (await request.json()) as Event;
          return HttpResponse.json({
            ...capturedRequest,
            id: 'event-weekly-1',
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (취소)');

      await user.click(screen.getByTestId('event-submit-button'));

      // 다이얼로그가 표시될 때까지 대기
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "예" 버튼 클릭
      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: repeat.type이 'none'으로 변경되어 API 호출
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.repeat.type).toBe('none');
        expect(capturedRequest?.repeat.interval).toBe(1);
      });

      // 다이얼로그 닫힘
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('TC-3: "예" 후 반복 아이콘 제거됨', async () => {
      // Given: 단일 수정 완료 (repeat.type = 'none')
      const updatedEvent = {
        ...weeklyEvent,
        title: '팀 미팅 (취소)',
        repeat: { type: 'none', interval: 1 },
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        http.put('/api/events/:id', async () => {
          return HttpResponse.json(updatedEvent);
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 반복 아이콘이 표시되어 있는지 확인
      const monthView = within(screen.getByTestId('month-view'));
      const eventBox = monthView.getByText('팀 미팅').closest('div');
      const iconsBefore = eventBox?.querySelectorAll('svg');
      expect(iconsBefore?.length).toBeGreaterThan(0);

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (취소)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // When: 캘린더 목록 갱신
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [updatedEvent],
          });
        })
      );

      // Then: 반복 아이콘(EventRepeat) 사라짐
      await waitFor(() => {
        const updatedEventBox = monthView.getByText('팀 미팅 (취소)').closest('div');
        const iconsAfter = updatedEventBox?.querySelectorAll('svg');
        expect(iconsAfter?.length).toBe(0);
      });
    });

    it('TC-4: "예" 후 폼 초기화', async () => {
      // Given: 단일 수정 완료
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        http.put('/api/events/:id', async () => {
          return HttpResponse.json({
            ...weeklyEvent,
            repeat: { type: 'none', interval: 1 },
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

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

      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: 폼 초기화됨
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '일정 추가' })).toBeInTheDocument();
      });
      expect(screen.getByLabelText('제목')).toHaveValue('');
    });

    it('TC-5: 성공 스낵바 표시', async () => {
      // Given: "예" 버튼 클릭, API 성공
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        http.put('/api/events/:id', async () => {
          return HttpResponse.json({
            ...weeklyEvent,
            repeat: { type: 'none', interval: 1 },
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: 성공 스낵바 표시
      await waitFor(() => {
        expect(screen.getByText('일정이 수정되었습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Cases (경계 케이스)', () => {
    it('TC-6: 단일 일정 수정 시 다이얼로그 표시 안 함', async () => {
      // Given: 단일 일정 수정 중 (repeat.type = 'none')
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [singleEvent],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '일일 일정 (수정)');

      // When: "일정 수정" 버튼 클릭
      await user.click(screen.getByTestId('event-submit-button'));

      // Then: 다이얼로그 표시 안 됨 (겹침 체크 진행)
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('TC-7: 신규 반복 일정 생성 시 다이얼로그 표시 안 함', async () => {
      // Given: 신규 반복 일정 생성 중 (editingEvent === null)
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 신규 일정 추가 폼
      expect(screen.getByRole('heading', { name: '일정 추가' })).toBeInTheDocument();

      await user.type(screen.getByLabelText('제목'), '새 반복 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-20');
      await user.type(screen.getByLabelText('시작 시간'), '10:00');
      await user.type(screen.getByLabelText('종료 시간'), '11:00');
      await user.type(screen.getByLabelText('설명'), '설명');
      await user.type(screen.getByLabelText('위치'), '위치');

      // 반복 일정 체크
      await user.click(screen.getByRole('checkbox', { name: '반복 일정' }));

      // When: "일정 추가" 버튼 클릭
      await user.click(screen.getByTestId('event-submit-button'));

      // Then: 다이얼로그 표시 안 됨 (신규 생성 로직 진행)
      await waitFor(
        () => {
          expect(screen.queryByText('해당 일정만 수정하시겠어요?')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('TC-8: "아니오" 버튼 클릭 시 다이얼로그만 닫음', async () => {
      // Given: 다이얼로그 표시 중
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: "아니오" 버튼 클릭
      const noButton = screen.getByRole('button', { name: '아니오' });
      await user.click(noButton);

      // Then: 다이얼로그 닫힘, 폼 유지
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 폼 데이터 유지
      expect(screen.getByDisplayValue('팀 미팅 (수정)')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '일정 수정' })).toBeInTheDocument();
    });
  });

  describe('Error Cases (오류 처리)', () => {
    it('TC-9: API 호출 실패 시 에러 처리', async () => {
      // Given: "예" 버튼 클릭
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        // When: PUT /api/events/:id 실패 (500)
        http.put('/api/events/:id', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // Then: 에러 스낵바 표시
      await waitFor(() => {
        expect(screen.getByText('일정 저장 실패')).toBeInTheDocument();
      });

      // 폼 유지: 다시 수정 가능
      expect(screen.getByDisplayValue('팀 미팅 (수정)')).toBeInTheDocument();
    });

    it('TC-10: 필수값 누락 시 다이얼로그 표시 전 검증', async () => {
      // Given: 제목 비움 (필수값 누락)
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

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
    it('TC-11: 다이얼로그 상태 초기화 (배경 클릭)', async () => {
      // Given: 다이얼로그 표시 중
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: 다이얼로그 배경 클릭 (Escape 키로 대체)
      await user.keyboard('{Escape}');

      // Then: 다이얼로그 닫힘, 상태 초기화
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 폼 데이터 유지
      expect(screen.getByDisplayValue('팀 미팅 (수정)')).toBeInTheDocument();
    });

    it('TC-12: editingEvent 상태 변경 시 다이얼로그 닫힘', async () => {
      // Given: 반복 일정 A 수정 중 (다이얼로그 표시)
      const weeklyEventA = { ...weeklyEvent, id: 'event-a', title: '반복 일정 A' };
      const weeklyEventB = {
        ...weeklyEvent,
        id: 'event-b',
        title: '반복 일정 B',
        date: '2025-10-16',
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEventA, weeklyEventB],
          });
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      // 첫 번째 일정 편집
      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      expect(screen.getByDisplayValue('반복 일정 A')).toBeInTheDocument();

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '반복 일정 A (수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // When: 반복 일정 B 선택
      const updatedEditButtons = await screen.findAllByLabelText('Edit event');
      await user.click(updatedEditButtons[1]);

      // Then: editingEvent 변경, 폼 갱신
      await waitFor(() => {
        expect(screen.getByDisplayValue('반복 일정 B')).toBeInTheDocument();
      });

      // 다이얼로그가 닫혀야 함 (아직 구현 안 됨)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('TC-13: 같은 일정 재수정 시 다이얼로그 표시 안 함', async () => {
      // Given: 단일 일정으로 변환됨 (repeat.type = 'none')
      const convertedEvent = {
        ...weeklyEvent,
        title: '팀 미팅 (변환됨)',
        repeat: { type: 'none', interval: 1 },
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [weeklyEvent],
          });
        }),
        http.put('/api/events/:id', async () => {
          return HttpResponse.json(convertedEvent);
        })
      );

      const { user } = setup();
      await screen.findByText('일정 로딩 완료!');

      const editButton = await screen.findByLabelText('Edit event');
      await user.click(editButton);

      const titleInput = screen.getByLabelText('제목');
      await user.clear(titleInput);
      await user.type(titleInput, '팀 미팅 (변환됨)');

      await user.click(screen.getByTestId('event-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: '예' });
      await user.click(yesButton);

      // 일정이 단일 일정으로 변환됨
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [convertedEvent],
          });
        })
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '일정 추가' })).toBeInTheDocument();
      });

      // When: 같은 일정 재편집 → "일정 수정" 클릭
      const editButtonAgain = await screen.findByLabelText('Edit event');
      await user.click(editButtonAgain);

      const titleInputAgain = screen.getByLabelText('제목');
      await user.clear(titleInputAgain);
      await user.type(titleInputAgain, '팀 미팅 (재수정)');

      await user.click(screen.getByTestId('event-submit-button'));

      // Then: 다이얼로그 표시 안 됨 (단일 일정이므로)
      await waitFor(
        () => {
          expect(screen.queryByText('해당 일정만 수정하시겠어요?')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });
});
