import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parodin.dice3d',
  appName: 'Par Odin',
  webDir: 'dist',
  backgroundColor: '#120c08',
  android: {
    allowMixedContent: false,
    backgroundColor: '#120c08',
  },
};

export default config;
