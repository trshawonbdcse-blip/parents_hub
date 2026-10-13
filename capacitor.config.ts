import type { CapacitorConfig } from '@capacitor/cli'

// Native iOS wrapper around the same web app (built into dist/).
const config: CapacitorConfig = {
  appId: 'ee.parentshub.app',
  appName: 'Kuhu Minna',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#ffffff',
  },
  plugins: {
    LocalNotifications: { iconColor: '#0f5c5c' },
  },
}

export default config
