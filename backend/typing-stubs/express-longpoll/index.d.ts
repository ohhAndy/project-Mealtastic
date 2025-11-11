declare module "express-longpoll" {
  import { Express, Request, Response } from "express";

  export interface LongPollInstance {
    create(path: string, options?: { maxListeners?: number }): void;
    publish(path: string, data: any): void;
    publishToId(path: string, id: string, data: any): void;
  }

  export default function longpoll(app: Express, options?: any): LongPollInstance;
}