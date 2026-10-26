import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Traduce errores de PostgreSQL a respuestas HTTP claras (y deja pasar los HttpException) */
@Catch()
export class PgExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    const err = exception as { code?: string; cause?: { code?: string }; message?: string };
    const code = err?.code ?? err?.cause?.code;
    const map: Record<string, { status: number; message: string }> = {
      '23505': { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con ese valor único' },
      '23503': { status: HttpStatus.CONFLICT, message: 'El registro está relacionado con otros datos' },
      '22P02': { status: HttpStatus.BAD_REQUEST, message: 'Identificador inválido' },
    };
    const hit = code ? map[code] : undefined;
    if (hit) {
      res.status(hit.status).json({ statusCode: hit.status, message: hit.message, code });
      return;
    }
    this.logger.error(err?.message ?? exception);
    res.status(500).json({ statusCode: 500, message: 'Error interno del servidor' });
  }
}
