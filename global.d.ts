declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// Make this file a module if it isn't already importing/exporting anything
export {};