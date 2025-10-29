import { EventForm } from '../types';

/**
 * 반복 종료일 검증
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @param endDate - 종료일 (YYYY-MM-DD)
 * @returns 검증 오류 메시지 또는 null
 */
export function validateRepeatEndDate(startDate: string, endDate: string): string | null {
  // 빈 값 허용
  if (!endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // 종료일이 시작일보다 이전이면 에러
  if (end < start) {
    return '반복 종료일은 시작일 이후여야 합니다';
  }

  return null;
}

/**
 * 기본 반복 종료일 계산
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @returns 1년 후 날짜 (최대 2025-12-31)
 */
export function getDefaultEndDate(startDate: string): string {
  const start = new Date(startDate);
  const oneYearLater = new Date(start);
  oneYearLater.setFullYear(start.getFullYear() + 1);

  const maxDate = new Date('2025-12-31');

  // 1년 후가 최대 날짜보다 크면 최대 날짜 반환
  return oneYearLater > maxDate
    ? '2025-12-31'
    : oneYearLater.toISOString().split('T')[0];
}

/**
 * 반복 일정 날짜 배열 생성
 * @param baseEvent - 기본 일정 정보
 * @returns 반복 날짜 배열 (최대 100개, 종료일까지)
 */
export function generateRepeatDates(baseEvent: EventForm): string[] {
  const { date, repeat } = baseEvent;
  const { type, interval, endDate } = repeat;

  // 반복 없으면 시작일만 반환
  if (type === 'none') {
    return [date];
  }

  const dates: string[] = [];
  const startDate = new Date(date);
  const maxDate = new Date('2025-12-31');

  // 종료일 결정: 지정된 종료일 또는 1년 후 (2025-12-31 제한)
  let actualEndDate: Date;
  if (endDate) {
    actualEndDate = new Date(endDate);
    // 2025-12-31 넘으면 제한
    if (actualEndDate > maxDate) {
      actualEndDate = maxDate;
    }
  } else {
    // 종료일 미지정 시 1년 후
    const defaultEnd = getDefaultEndDate(date);
    actualEndDate = new Date(defaultEnd);
  }

  let currentDate = new Date(startDate);
  const MAX_COUNT = 100;

  while (currentDate <= actualEndDate && currentDate <= maxDate && dates.length < MAX_COUNT) {
    dates.push(currentDate.toISOString().split('T')[0]);

    // 다음 날짜 계산
    switch (type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;

      case 'weekly':
        currentDate.setDate(currentDate.getDate() + interval * 7);
        break;

      case 'monthly': {
        const originalDay = startDate.getDate();
        currentDate.setMonth(currentDate.getMonth() + interval);

        // 원래 날짜로 설정
        const daysInMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();

        // 원래 날짜가 해당 월에 없으면 건너뛰기
        if (originalDay > daysInMonth) {
          // 다음 달로 계속 진행
          continue;
        }

        currentDate.setDate(originalDay);
        break;
      }

      case 'yearly': {
        const originalMonth = startDate.getMonth();
        const originalDay = startDate.getDate();

        currentDate.setFullYear(currentDate.getFullYear() + interval);

        // 윤년 2월 29일 처리
        if (originalMonth === 1 && originalDay === 29) {
          // 평년이면 건너뛰기
          const targetYear = currentDate.getFullYear();
          const isLeapYear =
            (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;

          if (!isLeapYear) {
            // 다음 해로 계속 진행
            continue;
          }
        }

        currentDate.setMonth(originalMonth);
        currentDate.setDate(originalDay);
        break;
      }

      default:
        break;
    }
  }

  return dates;
}

