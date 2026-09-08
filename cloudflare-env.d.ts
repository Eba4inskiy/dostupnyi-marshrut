interface D1Result<T = Record<string, unknown>> { success: boolean; results: T[]; meta: Record<string, unknown>; }
interface D1PreparedStatement {
 bind(...values: unknown[]): D1PreparedStatement;
 first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
 all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
 run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
 raw<T = unknown[]>(options?: {columnNames?: boolean}): Promise<T[]>;
}
interface D1Database {
 prepare(query: string): D1PreparedStatement;
 batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
 exec(query: string): Promise<{count: number; duration: number}>;
 dump(): Promise<ArrayBuffer>;
}
interface Fetcher {fetch(input: Request | string, init?: RequestInit): Promise<Response>}
interface RoutePhotoBucket {
 put(key:string,body:ArrayBuffer|ArrayBufferView,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>;
 get(key:string):Promise<{body:ReadableStream;httpMetadata?:{contentType?:string}}|null>;
 delete(key:string):Promise<void>;
}
declare module "cloudflare:workers" { export const env:{DB:D1Database;BUCKET:RoutePhotoBucket;ASSETS:Fetcher}; }
