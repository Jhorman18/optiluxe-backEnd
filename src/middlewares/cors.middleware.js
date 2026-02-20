import cors from 'cors';

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

export const corsMiddleware = cors(corsOptions);