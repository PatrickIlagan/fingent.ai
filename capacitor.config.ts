import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.fingent.mobile',
  appName: 'FinGent',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false
    },
    FirebaseAuthentication: {
      providers: ['google.com']
    }
  }
};

export default config;
