// backend/prismaMiddleware.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { SUBJECTS } from '../constants/subjects';

const prisma = new PrismaClient();

prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    if (params.model === 'User' && params.action === 'create') {
        console.log("User creation request received:", params.args);

        // Ensure user creation
        const result = await next(params);
        console.log("User created successfully:", result);

        // Now the user has been created, create initial boards
        const userId = result.id;
        const date = new Date();
        const quadri = date.getMonth() >= 1 ? 1 : 0;

        const yearIndex = Number(result.year ?? '1') - 1;
        const subjects = SUBJECTS[yearIndex][quadri];

        const initialBoards: Prisma.BoardCreateManyInput[] = subjects.map((subject) => ({
            userId,
            name: subject,
        }));

        try {
            await prisma.board.createMany({
                data: initialBoards,
            });
            console.log("Initial boards created successfully for user:", userId);
        } catch (error) {
            console.error("Error creating initial boards:", error);
        }

        return result;
    }

    return next(params);
});

export default prisma;
