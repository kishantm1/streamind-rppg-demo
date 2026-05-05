import { useMemo } from 'react';
import { Text as RNText, View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Polyline, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

type Props = {
  data?: number[];
  width?: number;
  height?: number;
};

export function SignalPlot({ data = [], width = 320, height = 120 }: Props) {
  const { palette } = useTheme();

  const { polylinePoints, areaPath } = useMemo(() => {
    if (data.length < 2) return { polylinePoints: '', areaPath: '' };

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = range * 0.1;

    const scaleY = (val: number) => {
      const normalized = (val - minVal + padding) / (range + padding * 2);
      return height - normalized * height;
    };
    const stepX = width / (data.length - 1);

    const pts: string[] = [];
    for (let i = 0; i < data.length; i++) {
      pts.push(`${i * stepX},${scaleY(data[i])}`);
    }
    const polyline = pts.join(' ');
    const path = `M0,${height} L${pts.join(' L')} L${width},${height} Z`;
    return { polylinePoints: polyline, areaPath: path };
  }, [data, width, height]);

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.primary} stopOpacity={0.3} />
            <Stop offset="1" stopColor={palette.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid */}
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

        {polylinePoints !== '' && (
          <>
            <Path d={areaPath} fill="url(#signalFill)" />
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={palette.primary}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>

      {data.length < 2 && (
        <View style={[styles.placeholder, { width, height }]} pointerEvents="none">
          <RNText style={{ color: palette.textMuted }}>Waiting for signal…</RNText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 6,
    left: 6,
  },
});
