// Home Screen Widget — shows today's sessions and deadlines.
// This runs in a separate JS runtime (WidgetKit) and uses @expo/ui SwiftUI components.
import { createWidget } from 'expo-widgets';
import { Text, VStack, HStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, padding, frame } from '@expo/ui/swift-ui/modifiers';

type WidgetData = {
  sessions: Array<{
    code: string;
    type: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
  deadlines: Array<{
    code: string;
    title: string;
    type: string;
    dueDate: string;
    dueTime?: string;
  }>;
  focusMinutes: number;
  lastUpdated: string;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function getDueLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;
  return dueDate;
}

// Widget component — renders with @expo/ui SwiftUI primitives
const TodayWidget = createWidget<WidgetData>('TodayWidget', (data) => {
  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const dateStr = today.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });

  return (
    <VStack
      spacing={8}
      modifiers={[
        padding({ all: 16 }),
        background('#F7F7F8'),
        cornerRadius(12),
      ]}
    >
      {/* Header */}
      <HStack
        modifiers={[
          frame({ maxWidth: Infinity }),
        ]}
      >
        <Text modifiers={[frame({ maxWidth: Infinity })]}>
          {dayName} {dateStr}
        </Text>
        {data.focusMinutes > 0 && (
          <Text>{data.focusMinutes}m focused</Text>
        )}
      </HStack>

      {/* Sessions */}
      {data.sessions.length === 0 && data.deadlines.length === 0 && (
        <VStack
          spacing={4}
          modifiers={[
            padding({ top: 24, bottom: 24 }),
          ]}
        >
          <Text>No sessions today</Text>
          <Text>Open Clover to plan your day</Text>
        </VStack>
      )}

      {data.sessions.slice(0, 4).map((session, i) => (
        <HStack
          key={i}
          spacing={10}
          modifiers={[
            padding({ all: 10 }),
            background('#FFFFFF'),
            cornerRadius(8),
          ]}
        >
          <VStack spacing={2} modifiers={[frame({ maxWidth: Infinity })]}>
            <Text>{session.code}</Text>
            <Text>
              {session.type} · {formatTime12(session.startTime)}–{formatTime12(session.endTime)}
            </Text>
          </VStack>
          {session.location && <Text>{session.location}</Text>}
        </HStack>
      ))}

      {/* Deadlines */}
      {data.deadlines.slice(0, 2).map((deadline, i) => (
        <HStack
          key={`d-${i}`}
          spacing={10}
          modifiers={[
            padding({ all: 10 }),
            background('#FFF3E0'),
            cornerRadius(8),
          ]}
        >
          <VStack spacing={2} modifiers={[frame({ maxWidth: Infinity })]}>
            <Text>{deadline.code}: {deadline.title}</Text>
            <Text>
              {getDueLabel(deadline.dueDate)}{deadline.dueTime ? ` · ${formatTime12(deadline.dueTime)}` : ''}
            </Text>
          </VStack>
        </HStack>
      ))}

      {/* More indicator */}
      {(data.sessions.length > 4 || data.deadlines.length > 2) && (
        <Text>
          +{Math.max(0, data.sessions.length - 4) + Math.max(0, data.deadlines.length - 2)} more
        </Text>
      )}
    </VStack>
  );
});

export default TodayWidget;
