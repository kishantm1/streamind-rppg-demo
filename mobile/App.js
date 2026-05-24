import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import WebApp from './dom/WebApp';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WebApp
        dom={{
          style: styles.dom,
          scrollEnabled: true,
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          allowsBackForwardNavigationGestures: false,
          containerStyle: styles.dom,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c4a6e',
  },
  dom: {
    flex: 1,
  },
});
