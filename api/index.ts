// backend/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { compareSync } from 'bcryptjs';
import swaggerUI from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZenStackMiddleware } from '@zenstackhq/server/express';
import RestApiHandler from '@zenstackhq/server/api/rest';
import prisma from '../prisma/prismaMiddleware'; // Import the middleware-enhanced Prisma client
import { enhance } from '@zenstackhq/runtime';

dotenv.config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'https://trello-omega-gules.vercel.app', 'https://gemif.vercel.app'] }));
app.use(express.json());

const options = { customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.css' };
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../agenda-gemif-api.json'), 'utf8'));
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(spec, options));

function getUser(req: Request): { id: string } | undefined {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return undefined;
    }
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        return { id: decoded.sub };
    } catch {
        // Bad token
        return undefined;
    }
}

app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
        where: { email },
    });
    if (!user || !compareSync(password, user.password)) {
        res.status(401).json({ error: 'Invalid credentials' });
    } else {
        const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!);
        res.json({ id: user.id, name: user.name, year: user.year, email: user.email, token });
    }
});

// Create a RESTful-style API handler
const apiHandler = RestApiHandler({ endpoint: 'https://trello-server-gules.vercel.app/api/' });

app.use('/api', ZenStackMiddleware({
    getPrisma: (req: Request) => enhance(prisma, { user: getUser(req) }), // Use the enhanced Prisma client
    handler: apiHandler
}));

export default app;
