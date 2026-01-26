declare module 'cookie' {
  export interface CookieParseOptions {
    decode?: (value: string) => string;
  }

  export interface CookieSerializeOptions {
    encode?: (value: string) => string;
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    priority?: 'low' | 'medium' | 'high';
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  }

  export function parse(str: string, options?: CookieParseOptions): Record<string, string>;

  export function serialize(name: string, value: string, options?: CookieSerializeOptions): string;
}
