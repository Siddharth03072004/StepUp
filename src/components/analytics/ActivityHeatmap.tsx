import { addDays, eachDayOfInterval, endOfWeek, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  className?: string;
}

const TOTAL_WEEKS = 53;
const DAYS_IN_WEEK = 7;
const CELL_SIZE = 13;
const WEEKDAY_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];
const INTENSITY_CLASSES = [
  'bg-muted/60',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary',
];

function getDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getIntensityLevel(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  const ratio = count / maxCount;

  if (ratio <= 0.25) {
    return 1;
  }

  if (ratio <= 0.5) {
    return 2;
  }

  if (ratio <= 0.75) {
    return 3;
  }

  return 4;
}

export function ActivityHeatmap({ data, className }: ActivityHeatmapProps) {
  const today = new Date();
  const endDate = endOfWeek(today, { weekStartsOn: 0 });
  const startDate = addDays(endDate, -(TOTAL_WEEKS * DAYS_IN_WEEK - 1));
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const countByDate = new Map(data.map((entry) => [entry.date, entry.count]));
  const maxCount = Math.max(...data.map((entry) => entry.count), 0);

  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, weekIndex) =>
    allDays.slice(weekIndex * DAYS_IN_WEEK, (weekIndex + 1) * DAYS_IN_WEEK),
  );

  const monthLabels = weeks.map((week, index) => {
    const firstDay = week[0];
    const previousWeek = weeks[index - 1]?.[0];

    if (!previousWeek || previousWeek.getMonth() !== firstDay.getMonth()) {
      return format(firstDay, 'MMM');
    }

    return '';
  });

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn('space-y-3', className)}>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="mb-2 flex items-end gap-1 pl-8">
              {monthLabels.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="text-[10px] text-muted-foreground"
                  style={{ width: `${CELL_SIZE}px` }}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col gap-1 pt-0.5">
                {WEEKDAY_LABELS.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="flex items-center justify-end text-[10px] text-muted-foreground"
                    style={{ height: `${CELL_SIZE}px`, width: '24px' }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                    {week.map((day) => {
                      const dateKey = getDateKey(day);
                      const count = countByDate.get(dateKey) ?? 0;
                      const level = getIntensityLevel(count, maxCount);
                      const isToday = dateKey === getDateKey(today);

                      return (
                        <Tooltip key={dateKey}>
                          <TooltipTrigger asChild>
                            <div
                              aria-label={`${count} activities on ${format(day, 'EEE, MMM d, yyyy')}`}
                              className={cn(
                                'rounded-sm border border-border/40 transition-transform hover:scale-110',
                                INTENSITY_CLASSES[level],
                                isToday && 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background',
                              )}
                              style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-xs">
                              <p className="font-medium">{format(day, 'EEE, MMM d, yyyy')}</p>
                              <p className="text-muted-foreground">
                                {count === 0 ? 'No activity' : `${count} recorded learning action${count === 1 ? '' : 's'}`}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Each square represents a day of recorded activity across learning, quizzes, notes, and coding.</p>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>Less</span>
            <div className="flex gap-1">
              {INTENSITY_CLASSES.map((cellClass, index) => (
                <div
                  key={`legend-${index}`}
                  className={cn('rounded-sm border border-border/40', cellClass)}
                  style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
