// backend/prismaMiddleware.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { SUBJECTS } from '../constants/subjects';

const prisma = new PrismaClient();

prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    // Check if the operation is a user creation
    if (params.model === 'User' && params.action === 'create') {
        const result = await next(params);

        // After user is created, create initial boards
        const userId = result.id;

        const date: Date = new Date()
        const quadri : number = date.getMonth() >= 1 ? 1 : 0

        const yearIndex = Number(result.attributes.year ?? '1') - 1;
        const subjects = SUBJECTS[yearIndex][quadri];

        const initialBoards: Prisma.BoardCreateManyInput[] = subjects.map((subject) => ({
          userId,
          name: subject,
      }));

        await prisma.board.createMany({
            data: initialBoards,
        });

        return result;
    }

    return next(params);
});

export default prisma;
