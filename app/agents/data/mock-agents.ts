import { Agent } from '../types/agent-types';

export const mockAgents: Agent[] = [
  {
    id: '6',
    name: 'PhD Research Assistant',
    description: 'Your personal research assistant with deep expertise in academic writing, research methodology, and literature review. Helps with paper writing, citation management, and research planning.',
    isActive: true,
    tags: ['research', 'academic', 'writing', 'phd'],
    userId: 'user1',
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    trainingFiles: [
      { type: 'text', url: '/mock/research-methodology.pdf', name: 'Research Methodology Guide', size: 4096 },
      { type: 'text', url: '/mock/academic-writing.pdf', name: 'Academic Writing Guidelines', size: 3584 },
      { type: 'text', url: '/mock/citation-styles.pdf', name: 'Citation Style Guides', size: 2048 }
    ]
  },
  {
    id: '1',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries and provides support with a friendly, professional demeanor.',
    isActive: true,
    tags: ['support', 'customer-service', 'help-desk'],
    userId: 'user1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    trainingFiles: [
      { type: 'text', url: '/mock/support-guidelines.pdf', name: 'Support Guidelines', size: 1024 },
      { type: 'text', url: '/mock/faq.pdf', name: 'FAQ Document', size: 2048 }
    ]
  },
  {
    id: '2',
    name: 'Sales Assistant',
    description: 'Helps qualify leads and answers product-related questions to support the sales process.',
    isActive: false,
    tags: ['sales', 'leads', 'product-knowledge'],
    userId: 'user1',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
    trainingFiles: [
      { type: 'text', url: '/mock/sales-playbook.pdf', name: 'Sales Playbook', size: 3072 }
    ]
  },
  {
    id: '3',
    name: 'Technical Documentation Bot',
    description: 'Assists developers by providing relevant documentation and code examples.',
    isActive: true,
    tags: ['technical', 'documentation', 'coding'],
    userId: 'user1',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    trainingFiles: [
      { type: 'text', url: '/mock/api-docs.md', name: 'API Documentation', size: 5120 },
      { type: 'text', url: '/mock/code-examples.ts', name: 'Code Examples', size: 1536 }
    ]
  },
  {
    id: '4',
    name: 'Meeting Scheduler',
    description: 'Coordinates meeting times and manages calendar invites automatically.',
    isActive: true,
    tags: ['scheduling', 'calendar', 'coordination'],
    userId: 'user1',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    trainingFiles: [
      { type: 'text', url: '/mock/calendar-integration.pdf', name: 'Calendar Integration Guide', size: 2560 }
    ]
  },
  {
    id: '5',
    name: 'Data Analysis Assistant',
    description: 'Helps analyze data and generate insights from various data sources.',
    isActive: false,
    tags: ['data', 'analysis', 'reporting'],
    userId: 'user1',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    trainingFiles: [
      { type: 'text', url: '/mock/data-analysis.pdf', name: 'Data Analysis Guidelines', size: 4096 },
      { type: 'text', url: '/mock/sample-reports.pdf', name: 'Sample Reports', size: 3584 }
    ]
  }
]; 