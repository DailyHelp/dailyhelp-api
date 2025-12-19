import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SuccessMessageInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result) => {
        const handlerMessage =
          this.reflector.get<string>('successMessage', context.getHandler()) ||
          this.reflector.get<string>('successMessage', context.getClass());

        let defaultMessage = handlerMessage;

        const friendlyFromPath = (path?: string) => {
          if (!path) return null;
          const cleaned = path.split('?')[0];
          const parts = cleaned
            .split('/')
            .filter(Boolean)
            .filter((p) => !p.startsWith(':'));
          if (!parts.length) return null;
          const last = parts[parts.length - 1]
            .replace(/[-_]/g, ' ')
            .trim();
          if (!last) return null;
          return `${last.charAt(0).toUpperCase()}${last.slice(1)} successful`;
        };

        if (!defaultMessage && context.getType() === 'http') {
          const req = context.switchToHttp().getRequest();
          const path = req?.route?.path || req?.originalUrl || req?.url || '';
          defaultMessage = friendlyFromPath(path) || 'Request successful';
        }

        const message = defaultMessage || 'Request succeeded';

        const isObject = result !== null && typeof result === 'object';
        const isArray = Array.isArray(result);

        if (isObject && !isArray) {
          if ((result as any).message) return result;
          return { ...result, message };
        }

        return { status: true, data: result, message };
      }),
    );
  }
}
