import React, { useState, useEffect } from 'react';
import { Clock, Radio, CheckCircle2 } from 'lucide-react';

interface TimeLeft {
  status: 'upcoming' | 'live' | 'ended';
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Target conference start: 15 February 2027 at 00:00:00 IST (Asia/Kolkata, UTC+05:30)
const CONFERENCE_START_MS = new Date('2027-02-15T00:00:00+05:30').getTime();
// Conference runs through 16 February 2027 IST (concluding at 2027-02-17T00:00:00+05:30)
const CONFERENCE_END_MS = new Date('2027-02-17T00:00:00+05:30').getTime();

function calculateTimeLeft(): TimeLeft {
  const now = Date.now();

  if (now >= CONFERENCE_END_MS) {
    return { status: 'ended', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  if (now >= CONFERENCE_START_MS) {
    return { status: 'live', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diff = Math.max(0, CONFERENCE_START_MS - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    status: 'upcoming',
    days,
    hours,
    minutes,
    seconds,
  };
}

export const ConferenceCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft());

  useEffect(() => {
    // Initial sync
    setTimeLeft(calculateTimeLeft());

    // Update dynamically every second
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format numbers (two digits for hours, mins, secs; proper padded/unpadded digits for days)
  const units = [
    {
      label: 'DAYS',
      value: timeLeft.days >= 10 ? String(timeLeft.days) : String(timeLeft.days).padStart(2, '0'),
    },
    {
      label: 'HOURS',
      value: String(timeLeft.hours).padStart(2, '0'),
    },
    {
      label: 'MINUTES',
      value: String(timeLeft.minutes).padStart(2, '0'),
    },
    {
      label: 'SECONDS',
      value: String(timeLeft.seconds).padStart(2, '0'),
    },
  ];

  return (
    <div
      className="relative rounded-2xl sm:rounded-full px-4 sm:px-7 py-2.5 sm:py-3 overflow-hidden border border-white/25"
      style={{
        backgroundColor: 'rgba(15, 35, 75, 0.32)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow:
          '0 10px 28px rgba(5, 16, 42, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
      }}
    >
      {timeLeft.status === 'upcoming' && (
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Countdown label */}
          <div className="flex items-center justify-center md:justify-start gap-2 shrink-0">
            <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#67E8F9] shrink-0" />
            <span className="text-xs sm:text-[13px] font-bold tracking-[0.14em] text-white font-heading uppercase [text-shadow:0_1px_6px_rgba(4,12,34,0.75)]">
              THE COUNTDOWN BEGINS
            </span>
          </div>

          {/* Subtle vertical divider on md+ */}
          <div className="hidden md:block h-8 w-px bg-white/25 shrink-0" />

          {/* Right: 4 Translucent Number Tiles */}
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full md:w-auto">
            {units.map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center justify-center py-1.5 px-2.5 sm:py-2 sm:px-3.5 min-w-[60px] sm:min-w-[70px] rounded-xl border border-white/20 transition-colors"
                style={{
                  backgroundColor: 'rgba(12, 30, 68, 0.36)',
                  boxShadow:
                    '0 4px 12px rgba(4, 12, 34, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                }}
              >
                <span className="text-xl sm:text-2xl md:text-[26px] font-black text-white tabular-nums leading-none [text-shadow:0_1px_6px_rgba(4,12,34,0.75)]">
                  {unit.value}
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] font-bold tracking-[0.14em] text-[#38BDF8] uppercase mt-1">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {timeLeft.status === 'live' && (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 py-0.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#22D3EE]/15 text-[#67E8F9] border border-white/15">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-heading">
                THE CONFERENCE IS NOW LIVE
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-200">
                15–16 February 2027 · SRM College of Pharmacy, Kattankulathur
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-[#CFFAFE] bg-white/10 border border-white/20 px-3 py-1 rounded-full">
            In Collaboration with INTI International University, Malaysia
          </div>
        </div>
      )}

      {timeLeft.status === 'ended' && (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 py-0.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-[#67E8F9] border border-white/15">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-heading">
                THANK YOU FOR BEING PART OF AICONDD 2027
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-200">
                15–16 February 2027 · SRM College of Pharmacy, SRMIST
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-white bg-white/10 border border-white/20 px-3 py-1 rounded-full">
            Proceedings & Certificates Available
          </div>
        </div>
      )}
    </div>
  );
};
