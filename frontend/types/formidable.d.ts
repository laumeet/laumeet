// types/formidable.d.ts
declare module 'formidable' {
  import { IncomingForm } from 'formidable';
  export { IncomingForm };
  export type Files = Record<string, any>;
  export type Fields = Record<string, any>;
}
