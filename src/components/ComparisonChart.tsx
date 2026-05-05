import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export type ComparisonSample = {
  t: number;
  rppg: number | null;
  ble: number | null;
};

type Props = {
  data?: ComparisonSample[];
  width?: number;
  height?: number;
};

export function ComparisonChart({ data = [], width = 320, height = 140 }: Props) {
  const { palette } = useTheme();

  const view = useMemo(() => buildView(data, width, height), [data, width, height]);

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>rPPG (camera)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: palette.warning }]} />
          <Text style={[styles.legendText, { color: palette.textMuted }]}>BLE device</Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        {[1, 2, 3].map((i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={(height / 4) * i}
            x2={width}
            y2={(height / 4) * i}
            stroke={palette.border}
            strokeWidth={1}
          />
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <Line
            key={`v${i}`}
            x1={(width / 6) * i}
            y1={0}
            x2={(width / 6) * i}
            y2={height}
            stroke={palette.border}
            strokeWidth={1}
          />
        ))}

        {view &&
          view.rppgSegments.map((seg, idx) => (
            <Polyline
              key={`r${idx}`}
              points={seg}
              fill="none"
              stroke={palette.primary}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        {view &&
          view.bleSegments.map((seg, idx) => (
            <Polyline
              key={`b${idx}`}
              points={seg}
              fill="none"
              stroke={palette.warning}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

        {view && (
          <>
            <SvgText x={width - 4} y={12} fontSize={10} fill={palette.textMuted} textAnchor="end">
              {Math.round(view.maxVal)}
            </SvgText>
            <SvgText x={width - 4} y={height - 4} fontSize={10} fill={palette.textMuted} textAnchor="end">
              {Math.round(view.minVal)}
            </SvgText>
          </>
        )}
      </Svg>

      {!view && (
        <View style={[styles.placeholder, { width, height }]} pointerEvents="none">
          <Text style={{ color: palette.textMuted }}>Waiting for readings…</Text>
        </View>
      )}
    </View>
  );
}

type View = {
  rppgSegments: string[];
  bleSegments: string[];
  minVal: number;
  maxVal: number;
};

function buildView(data: ComparisonSample[], width: number, height: number): View | null {
  const rppgValues = data.map((d) => d.rppg).filter((v): v is number => typeof v === 'number');
  const bleValues = data.map((d) => d.ble).filter((v): v is number => typeof v === 'number');
  const combined = [...rppgValues, ...bleValues];
  if (combined.length === 0 || data.length < 2) return null;

  let minVal = Math.min(...combined);
  let maxVal = Math.max(...combined);
  if (maxVal - minVal < 10) {
    const mid = (maxVal + minVal) / 2;
    minVal = mid - 5;
    maxVal = mid + 5;
  }
  const range = maxVal - minVal;
  const padding = range * 0.15;

  const yScale = (val: number) => {
    const normalized = (val - minVal + padding) / (range + padding * 2);
    return height - normalized * height;
  };
  const xStep = width / Math.max(1, data.length - 1);

  return {
    rppgSegments: buildSegments(data, 'rppg', xStep, yScale),
    bleSegments: buildSegments(data, 'ble', xStep, yScale),
    minVal,
    maxVal,
  };
}

function buildSegments(
  data: ComparisonSample[],
  key: 'rppg' | 'ble',
  xStep: number,
  yScale: (v: number) => number,
): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const v = data[i][key];
    if (typeof v !== 'number') {
      if (current.length >= 2) segments.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(`${i * xStep},${yScale(v)}`);
  }
  if (current.length >= 2) segments.push(current.join(' '));
  return segments;
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
  placeholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 6,
    left: 6,
  },
});
