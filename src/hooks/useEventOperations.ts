import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Event, EventForm } from '../types';
import {
  generateRepeatDates,
  getDefaultEndDate,
  validateRepeatEndDate,
} from '../utils/repeatEventUtils';

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar('이벤트 로딩 실패', { variant: 'error' });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      let response;
      if (editing) {
        response = await fetch(`/api/events/${(eventData as Event).id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        // 새 일정 추가
        if (eventData.repeat.type !== 'none') {
          // 반복 일정인 경우

          // 1. 종료일 검증
          if (eventData.repeat.endDate) {
            const error = validateRepeatEndDate(eventData.date, eventData.repeat.endDate);
            if (error) {
              enqueueSnackbar(error, { variant: 'error' });
              return;
            }
          }

          // 2. 기본 종료일 설정
          const endDate = eventData.repeat.endDate || getDefaultEndDate(eventData.date);

          // 3. 반복 날짜 생성
          const dates = generateRepeatDates({
            ...eventData,
            repeat: {
              ...eventData.repeat,
              endDate,
            },
          });

          // 4. 각 날짜에 대한 Event 객체 배열 생성
          const events = dates.map((date) => ({
            ...eventData,
            date,
            repeat: {
              ...eventData.repeat,
              endDate,
            },
          }));

          // 5. /api/events-list 호출 (여러 일정 한 번에 생성)
          response = await fetch('/api/events-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
          });
        } else {
          // 단일 일정인 경우 (기존 로직)
          response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
          });
        }
      }

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.', {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar('일정 저장 실패', { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  async function init() {
    await fetchEvents();
    enqueueSnackbar('일정 로딩 완료!', { variant: 'info' });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 같은 repeat.id를 가진 모든 반복 일정을 수정합니다.
   * @param repeatId - 반복 시리즈 ID
   * @param updateData - 수정할 필드 (title, startTime, endTime 등)
   */
  const updateRecurringEvents = async (repeatId: string, updateData: Partial<Event>) => {
    try {
      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update recurring events');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar('반복 일정이 모두 수정되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error updating recurring events:', error);
      enqueueSnackbar('반복 일정 수정 실패', { variant: 'error' });
    }
  };

  /**
   * 같은 repeat.id를 가진 모든 반복 일정을 삭제합니다.
   * @param repeatId - 반복 시리즈 ID
   */
  const deleteRecurringEvents = async (repeatId: string) => {
    try {
      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recurring events');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting recurring events:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  return {
    events,
    fetchEvents,
    saveEvent,
    deleteEvent,
    updateRecurringEvents,
    deleteRecurringEvents,
  };
};
