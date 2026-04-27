import cors from 'cors';

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

export const corsMiddleware = cors(corsOptions);