import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { Bluetooth, Square, Play } from 'lucide-react-native';
import { ComparisonChart, type ComparisonSample } from '../../src/components/ComparisonChart';
import { SignalPlot } from '../../src/components/SignalPlot';
import { useTheme } from '../../src/context/ThemeContext';
import { useSession } from '../../src/context/SessionContext';
import { useBleHeartRate } from '../../src/hooks/useBleHeartRate';
import { useRPPG } from '../../src/hooks/useRPPG';

const COMPARISON_WINDOW = 120;

export default function MonitorScreen() {
  const { palette } = useTheme();
  const { addSession } = useSession();

  const {
    hasPermission,
    device,
    isLoading,
    isRunning,
    status,
    error,
    bpm,
    signalData,
    startSession,
    stopSession,
    frameProcessor,
  } = useRPPG();

  const ble = useBleHeartRate();

  const [sessionSaved, setSessionSaved] = useState(false);
  const [comparison, setComparison] = useState<ComparisonSample[]>([]);
  const bleHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isRunning) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const sample: ComparisonSample = {
        t: (Date.now() - startedAt) / 1000,
        rppg: typeof bpm === 'number' ? bpm : null,
        ble: typeof ble.bpm === 'number' ? ble.bpm : null,
      };
      if (sample.ble !== null) bleHistoryRef.current.push(sample.ble);
      setComparison((prev) => {
        const next = [...prev, sample];
        return next.length > COMPARISON_WINDOW ? next.slice(-COMPARISON_WINDOW) : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, bpm, ble.bpm]);

  const handleStartStop = async () => {
    if (isRunning) {
      const sessionData = stopSession();
      if (sessionData && sessionData.avgBpm) {
        const bleReadings = bleHistoryRef.current;
        const enriched = { ...sessionData };
        if (bleReadings.length > 0) {
          enriched.bleAvgBpm = Math.round(
            bleReadings.reduce((a, b) => a + b, 0) / bleReadings.length,
          );
          enriched.bleMinBpm = Math.round(Math.min(...bleReadings));
          enriched.bleMaxBpm = Math.round(Math.max(...bleReadings));
        }
        addSession(enriched);
        setSessionSaved(true);
        setTimeout(() => setSessionSaved(false), 3000);
      }
      bleHistoryRef.current = [];
      setComparison([]);
    } else {
      setSessionSaved(false);
      bleHistoryRef.current = [];
      setComparison([]);
      await startSession();
    }
  };

  const handleBleToggle = async () => {
    if (ble.connected) await ble.disconnect();
    else await ble.connect();
  };

  const bpmColor = !bpm
    ? palette.textMuted
    : bpm < 60
      ? palette.bpmLow
      : bpm > 100
        ? palette.bpmHigh
        : palette.bpmNormal;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: palette.background }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Heart Rate Monitor</Text>
        <Text style={{ color: palette.textMuted }}>
          Position your face in the frame for accurate readings
        </Text>
      </View>

      {/* BPM display */}
      <View style={[styles.bpmCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.bpmRing, { borderColor: bpmColor }]}>
          {bpm ? (
            <>
              <Text style={[styles.bpmValue, { color: bpmColor }]}>{bpm}</Text>
              <Text style={[styles.bpmUnit, { color: palette.textMuted }]}>BPM</Text>
            </>
          ) : (
            <Text style={[styles.bpmPlaceholder, { color: palette.textMuted }]}>--</Text>
          )}
        </View>
        <Text style={[styles.bpmLabel, { color: palette.textMuted }]}>
          {bpm ? 'rPPG (camera)' : 'Heart Rate'}
        </Text>
      </View>

      {/* BLE card */}
      <View
        style={[
          styles.bleCard,
          {
            backgroundColor: palette.surface,
            borderColor: ble.connected ? palette.primary : palette.border,
          },
        ]}
      >
        <View style={styles.bleHeader}>
          <Text style={[styles.bleTitle, { color: palette.text }]}>BLE Device</Text>
          {ble.deviceName && (
            <Text style={[styles.bleDevice, { color: palette.textMuted }]}>{ble.deviceName}</Text>
          )}
        </View>
        <View style={styles.bleValue}>
          {ble.bpm ? (
            <>
              <Text style={[styles.bleBpm, { color: palette.warning }]}>{ble.bpm}</Text>
              <Text style={[styles.bleUnit, { color: palette.textMuted }]}>BPM</Text>
            </>
          ) : (
            <Text style={[styles.blePlaceholder, { color: palette.textMuted }]}>--</Text>
          )}
        </View>
        <Pressable
          onPress={handleBleToggle}
          style={({ pressed }) => [
            styles.bleButton,
            {
              backgroundColor: ble.connected ? palette.primary : palette.primaryDim,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Bluetooth size={14} color={ble.connected ? '#fff' : palette.primary} />
          <Text style={{ color: ble.connected ? '#fff' : palette.primary, fontWeight: '600' }}>
            {ble.connected ? 'Disconnect' : 'Connect HR Monitor'}
          </Text>
        </Pressable>
        <Text style={[styles.bleStatus, { color: palette.textMuted }]}>
          {ble.error ?? ble.status ?? 'Tap to pair a Bluetooth heart-rate monitor'}
        </Text>
      </View>

      {/* Camera preview */}
      <View
        style={[
          styles.cameraWrapper,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        {device && hasPermission && isRunning ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isRunning}
            frameProcessor={frameProcessor}
            pixelFormat="rgb"
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={{ color: palette.textMuted }}>Camera Preview</Text>
          </View>
        )}
      </View>

      {/* Signal plot */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>PPG Signal</Text>
        <SignalPlot data={signalData} width={320} height={120} />
      </View>

      {/* Comparison chart */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Camera vs Device</Text>
        <ComparisonChart data={comparison} width={320} height={140} />
      </View>

      {/* Status */}
      <View style={styles.status}>
        {error ? (
          <Text style={{ color: palette.danger }}>{error}</Text>
        ) : (
          <View style={styles.statusInline}>
            {isLoading && <ActivityIndicator size="small" color={palette.primary} />}
            <Text style={{ color: isRunning ? palette.primary : palette.textMuted }}>{status}</Text>
          </View>
        )}
        {sessionSaved && <Text style={{ color: palette.success }}>Session saved to history</Text>}
      </View>

      {/* Start/stop button */}
      <Pressable
        onPress={handleStartStop}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.controlButton,
          {
            backgroundColor: isRunning ? palette.danger : palette.primary,
            opacity: pressed || isLoading ? 0.85 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : isRunning ? (
          <Square color="#fff" size={20} fill="#fff" />
        ) : (
          <Play color="#fff" size={20} fill="#fff" />
        )}
        <Text style={styles.controlButtonText}>
          {isLoading ? 'Loading...' : isRunning ? 'Stop Session' : 'Start Session'}
        </Text>
      </Pressable>

      {/* Tips */}
      <View style={[styles.tips, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.tipsTitle, { color: palette.text }]}>Tips for accurate readings</Text>
        {[
          'Ensure good lighting on your face',
          'Stay still during measurement',
          'Face the camera directly',
          'Wait 10–15 seconds for stable readings',
          'Pair a BLE heart rate monitor to compare against a real sensor',
        ].map((tip) => (
          <Text key={tip} style={[styles.tip, { color: palette.textMuted }]}>
            • {tip}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  bpmCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bpmRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmValue: { fontSize: 48, fontWeight: '700' },
  bpmUnit: { fontSize: 12, letterSpacing: 1 },
  bpmPlaceholder: { fontSize: 36, fontWeight: '600' },
  bpmLabel: { fontSize: 13 },
  bleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  bleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bleTitle: { fontSize: 14, fontWeight: '600' },
  bleDevice: { fontSize: 12 },
  bleValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bleBpm: { fontSize: 28, fontWeight: '700' },
  bleUnit: { fontSize: 11, letterSpacing: 1 },
  blePlaceholder: { fontSize: 24, fontWeight: '600' },
  bleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bleStatus: { fontSize: 11 },
  cameraWrapper: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  status: { alignItems: 'center', gap: 4, minHeight: 24 },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  controlButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tips: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tipsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tip: { fontSize: 12, lineHeight: 18 },
});
