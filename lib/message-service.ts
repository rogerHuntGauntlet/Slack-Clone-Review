import { Message, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
  return prisma.message.create({ data });
} 