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
    <div className="relative rounded-2xl bg-gradient-to-r from-[#F0F5FE]/90 via-white/95 to-[#F4F1FE]/90 backdrop-blur-md border border-[#22C5D9]/30 shadow-md shadow-[#0a2342]/5 px-3.5 sm:px-6 py-2.5 sm:py-3 overflow-hidden">
      {/* Subtle decorative glow accents */}
      <div className="absolute -top-10 -left-10 w-28 h-28 bg-[#22C5D9]/15 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#7554D9]/15 rounded-full blur-xl pointer-events-none" />

      {timeLeft.status === 'upcoming' && (
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Heading and small caption */}
          <div className="text-center md:text-left shrink-0">
            <div className="inline-flex items-center gap-2 text-xs sm:text-[13.5px] font-extrabold tracking-wider text-[#061d36] font-heading uppercase">
              <Clock className="w-4 h-4 text-[#22C5D9] shrink-0" />
              <span>THE COUNTDOWN BEGINS</span>
            </div>
            <div className="text-[11px] sm:text-[12.5px] font-bold text-[#7554D9] tracking-wider uppercase mt-0.5">
              COUNTDOWN TO 15 FEBRUARY 2027
            </div>
          </div>

          {/* Right / Center: 4 Horizontal Countdown Units */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-3.5 w-full md:w-auto md:min-w-[360px] max-w-lg">
            {units.map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center justify-center py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-xl bg-white/95 border border-indigo-100/90 shadow-2xs hover:border-[#22C5D9]/60 transition-colors"
              >
                <span className="text-2xl sm:text-3xl md:text-[34px] lg:text-[36px] font-black text-[#061d36] tabular-nums leading-none">
                  {unit.value}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#7554D9] uppercase mt-1">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {timeLeft.status === 'live' && (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 py-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-emerald-700 tracking-wider uppercase font-heading">
                THE CONFERENCE IS NOW LIVE
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
                15–16 February 2027 · SRM College of Pharmacy, Kattankulathur
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
            In Collaboration with INTI International University, Malaysia
          </div>
        </div>
      )}

      {timeLeft.status === 'ended' && (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 py-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-[#7554D9]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#061d36] tracking-wider uppercase font-heading">
                THANK YOU FOR BEING PART OF AICONDD 2027
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
                15–16 February 2027 · SRM College of Pharmacy, SRMIST
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-full">
            Proceedings & Certificates Available
          </div>
        </div>
      )}
    </div>
  );
};
