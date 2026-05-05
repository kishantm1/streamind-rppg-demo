import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Activity, Calendar, Heart, Trash2, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useSession } from '../../src/context/SessionContext';
import { formatDuration, formatTimestamp } from '../../src/utils/time';

export default function HistoryScreen() {
  const { palette } = useTheme();
  const { sessions, clearSessions, getRecentStats } = useSession();
  const [showConfirm, setShowConfirm] = useState(false);

  const stats = getRecentStats();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Calendar size={22} color={palette.text} strokeWidth={2} />
            <Text style={[styles.title, { color: palette.text }]}>Session History</Text>
          </View>
          {sessions.length > 0 && (
            <Pressable
              onPress={() => setShowConfirm(true)}
              style={({ pressed }) => [
                styles.clearButton,
                { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Trash2 size={16} color={palette.textMuted} />
              <Text style={{ color: palette.textMuted }}>Clear</Text>
            </Pressable>
          )}
        </View>

        {stats && (
          <View
            style={[
              styles.statsCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.statsTitle, { color: palette.text }]}>Recent Averages</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              Based on your last {stats.count} sessions
            </Text>
            <View style={styles.statsGrid}>
              <StatItem
                icon={<Heart size={20} color={palette.primary} />}
                value={Math.round(stats.avgBpm)}
                label="Avg BPM"
              />
              <StatItem
                icon={<TrendingDown size={20} color={palette.accent} />}
                value={Math.round(stats.minBpm)}
                label="Min BPM"
              />
              <StatItem
                icon={<TrendingUp size={20} color={palette.warning} />}
                value={Math.round(stats.maxBpm)}
                label="Max BPM"
              />
            </View>
          </View>
        )}

        {sessions.length > 0 ? (
          sessions.map((s) => (
            <View
              key={s.id}
              style={[
                styles.sessionCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={styles.sessionHeader}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatTimestamp(s.timestamp)}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatDuration(s.duration)}
                </Text>
              </View>
              <View style={styles.sessionBody}>
                <View style={styles.sessionBpm}>
                  <Heart size={20} color={palette.primary} />
                  <Text style={[styles.sessionValue, { color: palette.text }]}>
                    {Math.round(s.avgBpm)}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>BPM</Text>
                </View>
                <View style={styles.sessionRange}>
                  <Activity size={14} color={palette.textMuted} />
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {s.minBpm ? Math.round(s.minBpm) : '--'} – {s.maxBpm ? Math.round(s.maxBpm) : '--'} BPM
                  </Text>
                </View>
              </View>
              {typeof s.bleAvgBpm === 'number' && (
                <View style={[styles.bleRow, { borderColor: palette.border }]}>
                  <Text style={{ color: palette.warning, fontSize: 11, fontWeight: '600' }}>
                    BLE
                  </Text>
                  <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>
                    {s.bleAvgBpm}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>BPM avg</Text>
                  {typeof s.bleMinBpm === 'number' && typeof s.bleMaxBpm === 'number' && (
                    <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                      ({s.bleMinBpm}–{s.bleMaxBpm})
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Heart size={48} color={palette.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No sessions yet</Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Start monitoring your heart rate to see your history here. Each session will be saved
              automatically.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowConfirm(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modal, { backgroundColor: palette.surface }]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>Clear History?</Text>
            <Text style={[styles.modalText, { color: palette.textMuted }]}>
              This will permanently delete all your session history. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={[styles.modalButton, { borderColor: palette.border, borderWidth: 1 }]}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  clearSessions();
                  setShowConfirm(false);
                }}
                style={[styles.modalButton, { backgroundColor: palette.danger }]}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Clear All</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.statItem}>
      {icon}
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  statsTitle: { fontSize: 14, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  statItem: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  sessionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionBpm: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  sessionValue: { fontSize: 24, fontWeight: '700' },
  sessionRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  empty: { alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalText: { fontSize: 13, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
});
