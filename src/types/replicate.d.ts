declare module 'replicate' {
  interface RunOptions { input?: Record<string, any>; }
  export default class Replicate {
    constructor(opts?: { auth?: string });
    run(model: string, options: RunOptions): Promise<any>;
  }
}
