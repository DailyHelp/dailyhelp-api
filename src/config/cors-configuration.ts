import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const corsConfiguration: CorsOptions = {
    origin: '*',
    methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'],
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

export { corsConfiguration };