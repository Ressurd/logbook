"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  addDaysToDateString,
  formatDateStringKorean,
  getTodayKstDateString,
  isFutureKstDate,
} from "@/features/logbook/utils/date";

export function DateNavigator({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  const today = getTodayKstDateString();
  const isToday = date === today;

  const move = (amount: number) => {
    const next = addDaysToDateString(date, amount);
    if (!isFutureKstDate(next)) onChange(next);
  };

  return (
    <section className="date-section" aria-label="날짜 이동">
      <div>
        <p className="eyebrow">{isToday ? "오늘의 기록" : "지난 기록"}</p>
        <h1>{formatDateStringKorean(date)}</h1>
      </div>
      <div className="date-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="이전 날짜"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        {!isToday ? (
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(today)}
          >
            오늘
          </button>
        ) : null}
        <label className="date-picker-button" aria-label="날짜 직접 선택">
          <CalendarDays size={18} />
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => {
              if (event.target.value && !isFutureKstDate(event.target.value)) {
                onChange(event.target.value);
              }
            }}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="다음 날짜"
          disabled={isToday}
          onClick={() => move(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
