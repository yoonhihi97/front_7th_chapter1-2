import { EventForm } from '../../types';
import {
  validateRepeatEndDate,
  getDefaultEndDate,
  generateRepeatDates,
} from '../../utils/repeatEventUtils';

describe('validateRepeatEndDate', () => {
  it('VED-1: 종료일 빈 값 → null 반환', () => {
    // Given: 시작일과 빈 종료일
    const startDate = '2025-11-01';
    const endDate = '';

    // When: 검증 함수 호출
    const result = validateRepeatEndDate(startDate, endDate);

    // Then: null 반환 (검증 통과)
    expect(result).toBeNull();
  });

  it('VED-2: 종료일 = 시작일 → null 반환', () => {
    // Given: 시작일과 동일한 종료일
    const startDate = '2025-11-01';
    const endDate = '2025-11-01';

    // When: 검증 함수 호출
    const result = validateRepeatEndDate(startDate, endDate);

    // Then: null 반환 (허용)
    expect(result).toBeNull();
  });

  it('VED-3: 종료일 > 시작일 → null 반환', () => {
    // Given: 시작일보다 이후인 종료일
    const startDate = '2025-11-01';
    const endDate = '2025-12-31';

    // When: 검증 함수 호출
    const result = validateRepeatEndDate(startDate, endDate);

    // Then: null 반환 (정상)
    expect(result).toBeNull();
  });

  it('VED-4: 종료일 < 시작일 → 에러 메시지 반환', () => {
    // Given: 시작일보다 이전인 종료일
    const startDate = '2025-11-01';
    const endDate = '2025-10-31';

    // When: 검증 함수 호출
    const result = validateRepeatEndDate(startDate, endDate);

    // Then: 에러 메시지 반환
    expect(result).toBe('반복 종료일은 시작일 이후여야 합니다');
  });
});

describe('getDefaultEndDate', () => {
  it('GED-1: 1년 후 < 2025-12-31 → 1년 후 반환', () => {
    // Given: 2024년 11월 1일
    const startDate = '2024-11-01';

    // When: 기본 종료일 계산
    const result = getDefaultEndDate(startDate);

    // Then: 1년 후 반환
    expect(result).toBe('2025-11-01');
  });

  it('GED-2: 1년 후 > 2025-12-31 → 2025-12-31 반환', () => {
    // Given: 2025년 6월 1일 (1년 후 = 2026년 6월 1일)
    const startDate = '2025-06-01';

    // When: 기본 종료일 계산
    const result = getDefaultEndDate(startDate);

    // Then: 2025-12-31 반환 (제한)
    expect(result).toBe('2025-12-31');
  });

  it('GED-3: 1년 후 = 2025-12-31 → 2025-12-31 반환', () => {
    // Given: 2024년 12월 31일
    const startDate = '2024-12-31';

    // When: 기본 종료일 계산
    const result = getDefaultEndDate(startDate);

    // Then: 2025-12-31 반환
    expect(result).toBe('2025-12-31');
  });
});

describe('generateRepeatDates - 종료일 적용', () => {
  it('GRD-1: 종료일까지만 생성 (매일)', () => {
    // Given: 매일 반복, 5일간
    const eventForm: EventForm = {
      title: '매일 반복',
      date: '2025-11-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'daily',
        interval: 1,
        endDate: '2025-11-05',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 5개 날짜 생성
    expect(result).toEqual(['2025-11-01', '2025-11-02', '2025-11-03', '2025-11-04', '2025-11-05']);
  });

  it('GRD-2: 종료일까지만 생성 (매주)', () => {
    // Given: 매주 반복, 2025-11-01(토) ~ 2025-11-30
    const eventForm: EventForm = {
      title: '매주 반복',
      date: '2025-11-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
        endDate: '2025-11-30',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 5개 날짜 생성 (매주 토요일)
    expect(result).toEqual(['2025-11-01', '2025-11-08', '2025-11-15', '2025-11-22', '2025-11-29']);
  });

  it('GRD-3: 종료일 = 시작일 → 1개만 생성', () => {
    // Given: 종료일이 시작일과 동일
    const eventForm: EventForm = {
      title: '1개만',
      date: '2025-11-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'daily',
        interval: 1,
        endDate: '2025-11-01',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 1개만 생성
    expect(result).toEqual(['2025-11-01']);
  });

  it('GRD-4: 종료일 미지정 → 1년 후까지 생성', () => {
    // Given: 종료일 없음, 매월 반복
    const eventForm: EventForm = {
      title: '매월 반복',
      date: '2024-11-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'monthly',
        interval: 1,
        endDate: '',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 13개 생성 (2024-11-01 ~ 2025-11-01)
    expect(result).toHaveLength(13);
    expect(result[0]).toBe('2024-11-01');
    expect(result[12]).toBe('2025-11-01');
  });

  it('GRD-5: 1년 후 > 2025-12-31 → 2025-12-31까지만 생성', () => {
    // Given: 종료일 없음, 매월 반복, 2025-06-01 시작
    const eventForm: EventForm = {
      title: '매월 반복',
      date: '2025-06-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'monthly',
        interval: 1,
        endDate: '',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 7개 생성 (2025-06-01 ~ 2025-12-01, 2025-12-31 제한)
    expect(result).toHaveLength(7);
    expect(result[0]).toBe('2025-06-01');
    expect(result[6]).toBe('2025-12-01');
  });

  it('GRD-6: 100개 제한 - 종료일보다 우선', () => {
    // Given: 매일 반복, 730일 이상 (2024-01-01 ~ 2025-12-31)
    const eventForm: EventForm = {
      title: '매일 반복',
      date: '2024-01-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'daily',
        interval: 1,
        endDate: '2025-12-31',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 100개만 생성 (제한 적용)
    expect(result).toHaveLength(100);
    expect(result[0]).toBe('2024-01-01');
    expect(result[99]).toBe('2024-04-09'); // 100일 후
  });

  it('GRD-7: 2025-12-31 제한 - 종료일보다 우선', () => {
    // Given: 매일 반복, 종료일 2026-12-31
    const eventForm: EventForm = {
      title: '매일 반복',
      date: '2025-11-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'daily',
        interval: 1,
        endDate: '2026-12-31',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 2025-12-31까지만 생성 (61개)
    expect(result).toHaveLength(61);
    expect(result[0]).toBe('2025-11-01');
    expect(result[60]).toBe('2025-12-31');
  });

  it('GRD-8: 특수 날짜 처리 + 종료일', () => {
    // Given: 매월 31일 반복, 2025-01-31 ~ 2025-06-30
    const eventForm: EventForm = {
      title: '매월 31일',
      date: '2025-01-31',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'monthly',
        interval: 1,
        endDate: '2025-06-30',
      },
      notificationTime: 10,
    };

    // When: 반복 날짜 생성
    const result = generateRepeatDates(eventForm);

    // Then: 31일 있는 달만 생성 (2월, 4월 건너뛰기)
    expect(result).toEqual(['2025-01-31', '2025-03-31', '2025-05-31']);
  });
});
