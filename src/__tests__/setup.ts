/**
 * Test setup - polyfill File API for Node < 20
 */
if (typeof File === 'undefined') {
  // @ts-ignore - Polyfill for Node 18
  global.File = class File {
    constructor(public bits: any[], public name: string, public options?: any) {}
  };
}
