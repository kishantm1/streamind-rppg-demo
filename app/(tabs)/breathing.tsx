import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { formatClock } from '../../src/utils/time';

type Phase = { name: 'Inhale' | 'Hold' | 'Exhale'; duration: number };
type PatternKey = 'box' | 'relaxing' | 'calm';

const PATTERNS: Record<PatternKey, { name: string; description: string; phases: Phase[] }> = {
  box: {
    name: 'Box Breathing',
    description: 'Equal timing for calm focus',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Exhale', duration: 4 },
      { name: 'Hold', duration: 4 },
    ],
  },
  relaxing: {
    name: '4-7-8 Technique',
    description: 'Deep relaxation pattern',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 7 },
      { name: 'Exhale', duration: 8 },
    ],
  },
  calm: {
    name: 'Calm Breathing',
    description: 'Simple and soothing',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Exhale', duration: 6 },
    ],
  },
};

export default function BreathingScreen() {
  const { palette } = useTheme();

  const [selected, setSelected] = useState<PatternKey>('box');
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = PATTERNS[selected];
  const currentPhase = pattern.phases[phaseIdx];

  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isRunning) return;
    if (currentPhase.name === 'Inhale') {
      scale.value = withTiming(1.5, {
        duration: currentPhase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (currentPhase.name === 'Exhale') {
      scale.value = withTiming(1, {
        duration: currentPhase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [isRunning, currentPhase, scale]);

  const animatedCircle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setPhaseIdx(0);
    setTimeRemaining(pattern.phases[0].duration);
    setCycleCount(0);
    setTotalTime(0);
    scale.value = 1;
  }, [pattern.phases, scale]);

  const handlePause = useCallback(() => setIsRunning(false), []);
  const handleResume = useCallback(() => setIsRunning(true), []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setPhaseIdx(0);
    setTimeRemaining(0);
    setCycleCount(0);
    setTotalTime(0);
    scale.value = 1;
  }, [scale]);

  const handlePatternChange = (key: PatternKey) => {
    handleReset();
    setSelected(key);
  };

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          const nextIdx = (phaseIdx + 1) % pattern.phases.length;
          if (nextIdx === 0) setCycleCount((c) => c + 1);
          setPhaseIdx(nextIdx);
          return pattern.phases[nextIdx].duration;
        }
        return prev - 0.1;
      });
      setTotalTime((prev) => prev + 0.1);
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phaseIdx, pattern.phases]);

  const cycleDuration = pattern.phases.reduce((sum, p) => sum + p.duration, 0);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: palette.background }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Breathing Exercise</Text>
        <Text style={{ color: palette.textMuted }}>
          Take a moment to breathe and find your calm
        </Text>
      </View>

      <View style={styles.patternRow}>
        {(Object.keys(PATTERNS) as PatternKey[]).map((key) => {
          const p = PATTERNS[key];
          const active = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => handlePatternChange(key)}
              disabled={isRunning}
              style={({ pressed }) => [
                styles.patternCard,
                {
                  backgroundColor: active ? palette.primaryDim : palette.surface,
                  borderColor: active ? palette.primary : palette.border,
                  opacity: isRunning ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.patternName, { color: palette.text }]}>{p.name}</Text>
              <Text style={[styles.patternDesc, { color: palette.textMuted }]}>{p.description}</Text>
              <Text style={[styles.patternTiming, { color: palette.primary }]}>
                {p.phases.map((ph) => `${ph.duration}s`).join(' · ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.circleArea}>
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: palette.primaryDim,
              borderColor: palette.primary,
            },
            animatedCircle,
          ]}
        >
          {isRunning ? (
            <>
              <Text style={[styles.phaseName, { color: palette.text }]}>{currentPhase.name}</Text>
              <Text style={[styles.phaseTimer, { color: palette.primary }]}>
                {Math.ceil(timeRemaining)}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.phaseName, { color: palette.text }]}>Ready</Text>
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>Press Start</Text>
            </>
          )}
        </Animated.View>
      </View>

      <View style={styles.controls}>
        {!isRunning && timeRemaining === 0 ? (
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Play size={18} color="#fff" fill="#fff" />
            <Text style={styles.controlBtnText}>Start</Text>
          </Pressable>
        ) : isRunning ? (
          <Pressable
            onPress={handlePause}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Pause size={18} color="#fff" fill="#fff" />
            <Text style={styles.controlBtnText}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleResume}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Play size={18} color="#fff" fill="#fff" />
            <Text style={styles.controlBtnText}>Resume</Text>
          </Pressable>
        )}

        {(isRunning || timeRemaining > 0 || cycleCount > 0) && (
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: 'transparent',
                borderColor: palette.border,
                borderWidth: 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <RotateCcw size={18} color={palette.text} />
            <Text style={[styles.controlBtnText, { color: palette.text }]}>Reset</Text>
          </Pressable>
        )}
      </View>

      {(cycleCount > 0 || totalTime > 0) && (
        <View
          style={[styles.stats, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Stat value={String(cycleCount)} label="Cycles" />
          <Stat value={formatClock(totalTime)} label="Session Time" />
          <Stat value={`${cycleDuration}s`} label="Per Cycle" />
        </View>
      )}

      <View
        style={[styles.tips, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Text style={[styles.tipsTitle, { color: palette.text }]}>How to Practice</Text>
        {[
          'Find a comfortable seated position',
          'Select a breathing pattern above',
          'Press Start and follow the visual guide',
          'Breathe in through your nose, out through your mouth',
          'Continue for at least 3–5 cycles',
        ].map((t, i) => (
          <Text key={t} style={[styles.tip, { color: palette.textMuted }]}>
            {i + 1}. {t}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  patternRow: { flexDirection: 'row', gap: 8 },
  patternCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  patternName: { fontSize: 13, fontWeight: '700' },
  patternDesc: { fontSize: 10 },
  patternTiming: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  circleArea: { alignItems: 'center', justifyContent: 'center', height: 280 },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  phaseName: { fontSize: 18, fontWeight: '600' },
  phaseTimer: { fontSize: 36, fontWeight: '800' },
  controls: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  controlBtnText: { color: '#fff', fontWeight: '700' },
  stats: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tips: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tipsTitle: { fontSize: 14, fontWeight: '600' },
  tip: { fontSize: 12, lineHeight: 18 },
});
