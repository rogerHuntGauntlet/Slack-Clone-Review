import { prisma } from './prisma';
import { Agent } from '@prisma/client';

export async function getAllAgents(): Promise<Agent[]> {
  return prisma.agent.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });
}

export async function getAgentById(id: string): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { id }
  });
}

export async function createAgent(data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) {
  return prisma.agent.create({
    data
  });
}

export async function updateAgent(id: string, data: Partial<Agent>) {
  return prisma.agent.update({
    where: { id },
    data
  });
}

export async function deactivateAgent(id: string) {
  return prisma.agent.update({
    where: { id },
    data: { isActive: false }
  });
} 