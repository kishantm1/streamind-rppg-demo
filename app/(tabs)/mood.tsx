import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Heart, MessageSquare, Smile, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useSession } from '../../src/context/SessionContext';
import { formatTimestamp } from '../../src/utils/time';

const MOOD_OPTIONS = [
  { emoji: '\u{1F60A}', label: 'Great', value: 'great' },
  { emoji: '\u{1F642}', label: 'Good', value: 'good' },
  { emoji: '\u{1F610}', label: 'Okay', value: 'okay' },
  { emoji: '\u{1F614}', label: 'Low', value: 'low' },
  { emoji: '\u{1F622}', label: 'Sad', value: 'sad' },
] as const;

function moodEmoji(value: string): string {
  return MOOD_OPTIONS.find((m) => m.value === value)?.emoji ?? '\u{1F610}';
}

function moodLabel(value: string): string {
  return MOOD_OPTIONS.find((m) => m.value === value)?.label ?? 'Unknown';
}

export default function MoodScreen() {
  const { palette } = useTheme();
  const { moods, addMood, clearMoods, sessions } = useSession();

  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [linkBpm, setLinkBpm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const lastBpm = sessions.length > 0 ? Math.round(sessions[0].avgBpm) : null;

  const handleSubmit = () => {
    if (!selected) return;
    addMood({
      mood: selected,
      note: note.trim() || null,
      bpm: linkBpm && lastBpm ? lastBpm : null,
    });
    setSelected(null);
    setNote('');
    setLinkBpm(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Smile size={22} color={palette.text} />
            <Text style={[styles.title, { color: palette.text }]}>Mood Tracker</Text>
          </View>
          {moods.length > 0 && (
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

        <View
          style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Text style={[styles.formTitle, { color: palette.text }]}>How are you feeling?</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Take a moment to check in with yourself
          </Text>

          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelected(opt.value)}
                  style={({ pressed }) => [
                    styles.moodOption,
                    {
                      backgroundColor: active ? palette.primaryDim : palette.background,
                      borderColor: active ? palette.primary : palette.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{opt.emoji}</Text>
                  <Text style={{ color: palette.text, fontSize: 11 }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} color={palette.textMuted} />
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>Add a note (optional)</Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What's on your mind?"
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={500}
              style={[
                styles.noteInput,
                {
                  color: palette.text,
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },
              ]}
            />
            <Text style={{ color: palette.textMuted, fontSize: 11, textAlign: 'right' }}>
              {note.length}/500
            </Text>
          </View>

          {lastBpm && (
            <View style={styles.linkRow}>
              <Switch
                value={linkBpm}
                onValueChange={setLinkBpm}
                thumbColor={linkBpm ? palette.primary : undefined}
              />
              <Heart size={14} color={palette.danger} />
              <Text style={{ color: palette.text, fontSize: 12, flex: 1 }}>
                Link with last heart rate ({lastBpm} BPM)
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!selected}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: selected ? palette.primary : palette.border,
                opacity: pressed && selected ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Save Mood Entry</Text>
          </Pressable>
        </View>

        {showSuccess && (
          <View style={[styles.successBanner, { backgroundColor: palette.success }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Mood entry saved!</Text>
          </View>
        )}

        {moods.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.recentTitle, { color: palette.text }]}>Recent Entries</Text>
            {moods.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={{ fontSize: 32 }}>{moodEmoji(entry.mood)}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.entryHeader}>
                    <Text style={{ color: palette.text, fontWeight: '600' }}>
                      {moodLabel(entry.mood)}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                      {formatTimestamp(entry.timestamp)}
                    </Text>
                  </View>
                  {entry.note && (
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>{entry.note}</Text>
                  )}
                  {entry.bpm && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Heart size={12} color={palette.danger} />
                      <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                        {entry.bpm} BPM
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Smile size={48} color={palette.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No mood entries yet</Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Start tracking how you feel to discover patterns in your emotional well-being.
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
            <Text style={[styles.modalTitle, { color: palette.text }]}>Clear All Moods?</Text>
            <Text style={[styles.modalText, { color: palette.textMuted }]}>
              This will permanently delete all your mood entries. This action cannot be undone.
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
                  clearMoods();
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
  formCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  formTitle: { fontSize: 16, fontWeight: '700' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodOption: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteRow: { gap: 6 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  successBanner: { padding: 10, borderRadius: 8, alignItems: 'center' },
  recentTitle: { fontSize: 14, fontWeight: '600' },
  entryCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
