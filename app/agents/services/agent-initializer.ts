import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

interface AgentInitializationResult {
  success: boolean
  error?: string
  agentData?: {
    id: string
    name: string
    description: string
    isActive: boolean
  }
}

export class AgentInitializer {
  private static instance: AgentInitializer
  private initializationCache: Map<string, Promise<AgentInitializationResult>>

  private constructor() {
    this.initializationCache = new Map()
  }

  public static getInstance(): AgentInitializer {
    if (!AgentInitializer.instance) {
      AgentInitializer.instance = new AgentInitializer()
    }
    return AgentInitializer.instance
  }

  public async initializeAgent(agentId: string): Promise<AgentInitializationResult> {
    // Check cache first
    if (this.initializationCache.has(agentId)) {
      return this.initializationCache.get(agentId)!
    }

    // Create new initialization promise
    const initializationPromise = this.performInitialization(agentId)
    this.initializationCache.set(agentId, initializationPromise)

    return initializationPromise
  }

  private async performInitialization(agentId: string): Promise<AgentInitializationResult> {
    try {
      // First verify user has valid access
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return { success: false, error: 'No active session found' }
      }

      // Check for active subscription or access record
      const { data: accessRecord } = await supabase
        .from('access_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      const { data: paymentRecord } = await supabase
        .from('payment_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()

      const hasValidAccess = accessRecord || (paymentRecord && new Date(paymentRecord.current_period_end) > new Date())
      
      if (!hasValidAccess) {
        return { success: false, error: 'No valid access found' }
      }

      // Fetch agent data
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (agentError || !agentData) {
        return { success: false, error: agentError?.message || 'Agent not found' }
      }

      return {
        success: true,
        agentData: {
          id: agentData.id,
          name: agentData.name,
          description: agentData.description,
          isActive: agentData.is_active
        }
      }
    } catch (error) {
      console.error('Agent initialization error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize agent'
      }
    }
  }

  public clearCache(agentId?: string) {
    if (agentId) {
      this.initializationCache.delete(agentId)
    } else {
      this.initializationCache.clear()
    }
  }
} 