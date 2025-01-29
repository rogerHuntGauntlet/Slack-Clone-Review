"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown, MessageSquarePlus } from 'lucide-react';
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { toast } from "react-hot-toast";

interface RoadmapModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  projectId: string;
  projectName: string;
  userRole: string;
  onSubmitAction: (data: TicketData) => Promise<void>;
}

interface TicketData {
  title: string;
  description: string;
  priority: string;
  type: string;
  tags: string[];
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: {
    type: string;
  };
  tags?: string[];
}

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' }
];

const TYPES = [
  { value: 'feature', label: 'Feature', icon: '✨' },
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'improvement', label: 'Improvement', icon: '📈' }
];

export function RoadmapModal({ isOpen, onCloseAction, projectId, projectName, userRole, onSubmitAction }: RoadmapModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [data, setData] = useState<TicketData>({
    title: '',
    description: '',
    priority: 'medium',
    type: 'feature',
    tags: []
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [isSubmittingSummary, setIsSubmittingSummary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen, projectId]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/zen_tickets?project_id=${projectId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }
      
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!data.title.trim() || !data.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/zen_tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description.trim(),
          priority: data.priority,
          project_id: projectId,
          tags: data.tags,
          category: { type: data.type },
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit ticket');
      }

      toast.success('Request submitted successfully');
      setData({
        title: '',
        description: '',
        priority: 'medium',
        type: 'feature',
        tags: []
      });
      setShowNewTicketForm(false);
      fetchTickets(); // Refresh the tickets list
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || data.tags.includes(trimmedTag)) return;
    setData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
  };

  const removeTag = (tag: string) => {
    setData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-blue-500',
      low: 'bg-gray-400'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-400';
  };

  const handleSummarySubmit = async (ticketId: string) => {
    if (!summary.trim()) {
      toast.error('Please enter your thoughts about this feature');
      return;
    }

    setIsSubmittingSummary(true);
    try {
      const response = await fetch('/api/zen_ticket_summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          summary: summary.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit support');
      }

      toast.success('Support submitted successfully');
      setSelectedTicketId(null);
      setSummary('');
    } catch (error) {
      console.error('Summary submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit support');
    } finally {
      setIsSubmittingSummary(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => !open && onCloseAction()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[800px] max-h-[85vh] bg-white rounded-lg p-6 overflow-hidden flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center flex-shrink-0">
              <Dialog.Title className="text-xl font-semibold text-black">
                {projectName} - Roadmap
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="outline" onClick={onCloseAction}>
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Tickets List */}
            <div className="flex-1 min-h-0 flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">Requests</h3>
                    <Button onClick={() => setShowNewTicketForm(true)}>
                      New Request
                    </Button>
                  </div>

                  {tickets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No requests yet. Create your first one!
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                      {tickets.map((ticket: Ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{ticket.title}</h4>
                              <p className="mt-1 text-sm text-gray-600">{ticket.description}</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn("text-white", getPriorityColor(ticket.priority))}>
                                {ticket.priority}
                              </Badge>
                              <Badge variant="outline" className="text-gray-700">{ticket.category.type}</Badge>
                              {ticket.tags && ticket.tags.length > 0 && ticket.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-xs text-gray-700">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <button
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                            >
                              <MessageSquarePlus className="w-5 h-5" />
                              Support this idea! 🚀
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* New Ticket Form */}
            {showNewTicketForm && (
              <div className="mt-6 space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">New Request</h3>
                  <Button variant="outline" onClick={() => setShowNewTicketForm(false)}>
                    Cancel
                  </Button>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter title"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={e => setData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description"
                    className="mt-1.5 h-32"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select.Root value={data.priority} onValueChange={(value: string) => setData(prev => ({ ...prev, priority: value }))}>
                      <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-black">
                        <Select.Value placeholder="Select priority" />
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-md shadow-lg border border-gray-200">
                          <Select.Viewport>
                            {PRIORITIES.map(p => (
                              <Select.Item
                                key={p.value}
                                value={p.value}
                                className="relative flex items-center px-8 py-2 hover:bg-gray-100 cursor-pointer text-black"
                              >
                                <Select.ItemText>{p.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div>
                    <Label>Type</Label>
                    <Select.Root value={data.type} onValueChange={(value: string) => setData(prev => ({ ...prev, type: value }))}>
                      <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-black">
                        <Select.Value placeholder="Select type" />
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-md shadow-lg border border-gray-200">
                          <Select.Viewport>
                            {TYPES.map(t => (
                              <Select.Item
                                key={t.value}
                                value={t.value}
                                className="relative flex items-center px-8 py-2 hover:bg-gray-100 cursor-pointer text-black"
                              >
                                <Select.ItemText>{t.icon} {t.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <Input
                    placeholder="Press Enter to add tag"
                    className="mt-1.5"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  {data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer text-black"
                          onClick={() => removeTag(tag)}
                        >
                          {tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !data.title || !data.description}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </div>
            )}

            {/* Support Dialog */}
            <Dialog.Root open={selectedTicketId !== null} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[500px] bg-white rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Dialog.Title className="text-xl font-semibold text-gray-900">
                        Support this feature
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <Button variant="outline" onClick={() => {
                          setSelectedTicketId(null);
                          setSummary('');
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </Dialog.Close>
                    </div>

                    <div className="space-y-4">
                      <Textarea
                        placeholder="Share your thoughts about this feature..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full min-h-[120px] text-white bg-gray-800 border-gray-700 placeholder:text-gray-400 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTicketId(null);
                            setSummary('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => selectedTicketId && handleSummarySubmit(selectedTicketId)}
                          disabled={isSubmittingSummary || !summary.trim()}
                        >
                          {isSubmittingSummary ? 'Submitting...' : 'Submit Support'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
 