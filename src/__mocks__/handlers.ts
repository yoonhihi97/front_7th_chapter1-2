import { http, HttpResponse } from 'msw';

import { events } from '../__mocks__/response/events.json' assert { type: 'json' };
import { Event } from '../types';

export const handlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ events });
  }),

  http.post('/api/events', async ({ request }) => {
    const newEvent = (await request.json()) as Event;
    newEvent.id = String(events.length + 1);
    return HttpResponse.json(newEvent, { status: 201 });
  }),

  http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = (await request.json()) as Event;
    const index = events.findIndex((event) => event.id === id);

    if (index !== -1) {
      return HttpResponse.json({ ...events[index], ...updatedEvent });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/events/:id', ({ params }) => {
    const { id } = params;
    const index = events.findIndex((event) => event.id === id);

    if (index !== -1) {
      return new HttpResponse(null, { status: 204 });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
    const { repeatId } = params;
    const updateData = (await request.json()) as Partial<Event>;

    // 같은 repeatId를 가진 모든 일정 찾기 및 수정
    const updatedEvents = events.map((event) => {
      if (event.repeat?.id === repeatId) {
        // updateData의 정의된 필드만 병합 (id, date, repeat는 유지)
        return {
          ...event,
          ...updateData,
          id: event.id,
          date: event.date,
          repeat: event.repeat,
        };
      }
      return event;
    });

    // events 배열 업데이트
    events.length = 0;
    events.push(...updatedEvents);

    const updatedSeries = updatedEvents.filter((e) => e.repeat?.id === repeatId);

    if (updatedSeries.length === 0) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updatedSeries);
  }),
];
