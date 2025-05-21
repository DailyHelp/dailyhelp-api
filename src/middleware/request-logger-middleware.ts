import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('request-logger');

  public use(req: Request, res: Response, next: Function) {
    res.on('close', () => {
      this.logger.log(`${req.method} ${req.originalUrl} ${req.statusCode}`);
    });
    next();
  }
}
