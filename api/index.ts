import { PrismaClient } from '@prisma/client';
import { ZenStackMiddleware } from '@zenstackhq/server/express';
import RestApiHandler from '@zenstackhq/server/api/rest';
import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { compareSync } from 'bcryptjs';
import { enhance } from '@zenstackhq/runtime'
import { Request } from 'express';
import swaggerUI from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'https://trello-omega-gules.vercel.app', 'https://gemif.vercel.app'] }));
app.use(express.json());
app.use(cookieParser());

const prisma = new PrismaClient();

dotenv.config();

const options = { customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.css' };
const spec = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../agenda-gemif-api.json'), 'utf8')
);
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(spec, options));

function getUser(req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('TOKEN:', token);
    console.log('req:', req.body)
    if (!token) {
        console.log('no tokenn');
        return undefined;
    }
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        return { id: decoded.sub };
    } catch {
        // bad token
        console.log('bad token');
        return undefined;
    }
}

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body; 
    console.log(req.body) 
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

// create a RESTful-style API handlerr
const apiHandler = RestApiHandler({ endpoint: 'https://trello-server-gules.vercel.app/api/' });

app.use('/api', ZenStackMiddleware({ 
    getPrisma: (req) => enhance(prisma, { user: getUser(req) }),
    handler: apiHandler 
}));

export default app;