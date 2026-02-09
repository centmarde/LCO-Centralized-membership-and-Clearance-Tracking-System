import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { getErrorMessage } from '@/utils/helpers'

export type BlockBatchStatus = 'pending' | 'approved' | 'declined'

export interface EventBlockBatch {
  id: string
  organization_id: string | number
  event_id: number
  leader_id: string | null
  status: BlockBatchStatus
  submitted_at?: string | null
  reviewed_at?: string | null
  reviewer_id?: string | null
  note?: string | null
  organization?: { id: string; title: string }
  event?: { id: number; title: string; date?: string | null }
  leader?: { id: string; email?: string | null; full_name?: string | null }
}

export interface EventBlockBatchItem {
  id: string
  batch_id: string
  student_id: string | number
  present: boolean
  student?: {
    id: string
    full_name?: string | null
    email?: string | null
    student_number?: string | null
  }
}

interface CreateBatchInput {
  organizationId: string | number
  eventId: number
  leaderId: string | null
  items: { studentId: string | number; present: boolean }[]
}

export const useEventBlockingStore = defineStore('eventBlocking', () => {
  const toast = useToast()
  const authStore = useAuthUserStore()

  const loading = ref(false)
  const saving = ref(false)
  const approving = ref(false)

  const pendingBatches = ref<EventBlockBatch[]>([])
  const batchItems = ref<EventBlockBatchItem[]>([])

  const createBatchSubmission = async (input: CreateBatchInput): Promise<boolean> => {
    if (!input.organizationId || !input.eventId) {
      toast.error('Missing organization or event context')
      return false
    }
    const payloadItems = input.items.filter(i => i.present)
    if (payloadItems.length === 0) {
      toast.error('Select at least one student to include in the batch')
      return false
    }

    saving.value = true
    try {
      const { data: batchRows, error: batchErr } = await supabase
        .from('event_block_batches')
        .insert({
          organization_id: input.organizationId,
          event_id: input.eventId,
          leader_id: input.leaderId,
          status: 'pending'
        })
        .select()
        .limit(1)

      if (batchErr || !batchRows?.[0]) {
        toast.error('Failed to submit batch: ' + getErrorMessage(batchErr))
        return false
      }

      const batchId = batchRows[0].id as string
      const itemsPayload = payloadItems.map(item => ({
        batch_id: batchId,
        student_id: item.studentId,
        present: item.present
      }))

      const { error: itemErr } = await supabase
        .from('event_block_batch_items')
        .insert(itemsPayload)

      if (itemErr) {
        toast.error('Batch saved, but items failed: ' + getErrorMessage(itemErr))
        return false
      }

      toast.success('Batch submitted for admin approval')
      return true
    } catch (e) {
      console.error('Error creating batch submission:', e)
      toast.error('Unexpected error while submitting batch')
      return false
    } finally {
      saving.value = false
    }
  }

  const fetchPendingBatches = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('event_block_batches')
        .select(`
          id,
          organization_id,
          event_id,
          leader_id,
          status,
          submitted_at,
          reviewed_at,
          reviewer_id,
          note,
          organizations:organizations!event_block_batches_organization_id_fkey(id, title),
          events:events!event_block_batches_event_id_fkey(id, title, date)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      if (error) {
        toast.error('Failed to fetch pending batches: ' + getErrorMessage(error))
        return
      }

      // Enrich with leader info from auth users list
      const usersResult = await authStore.getAllUsers()
      const allUsers = usersResult.users || []

      pendingBatches.value = (data || []).map((row: any) => {
        const leaderUser = allUsers.find((u: any) => u.id === row.leader_id)
        const org = (row as any).organizations as { id: string; title?: string } | null
        const evt = (row as any).events as { id: number; title?: string; date?: string | null } | null
        return {
          id: row.id,
          organization_id: row.organization_id,
          event_id: row.event_id,
          leader_id: row.leader_id,
          status: row.status,
          submitted_at: row.submitted_at,
          reviewed_at: row.reviewed_at,
          reviewer_id: row.reviewer_id,
          note: row.note,
          organization: org ? { id: org.id, title: org.title || '' } : undefined,
          event: evt ? { id: evt.id, title: evt.title || 'Untitled Event', date: evt.date } : undefined,
          leader: leaderUser ? { id: leaderUser.id, email: leaderUser.email, full_name: leaderUser.full_name } : undefined
        }
      })
    } catch (e) {
      console.error('Error fetching pending batches:', e)
      toast.error('Unexpected error while fetching batches')
    } finally {
      loading.value = false
    }
  }

  const fetchBatchItems = async (batchId: string) => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('event_block_batch_items')
        .select(`
          id,
          batch_id,
          student_id,
          present,
          students:students!event_block_batch_items_student_id_fkey(
            id,
            full_name,
            email,
            student_number
          )
        `)
        .eq('batch_id', batchId)

      if (error) {
        toast.error('Failed to fetch batch items: ' + getErrorMessage(error))
        return
      }

      batchItems.value = (data || []).map((row: any) => {
        const student = (row as any).students as {
          id: string
          full_name?: string | null
          email?: string | null
          student_number?: string | null
        } | null

        return {
          id: row.id,
          batch_id: row.batch_id,
          student_id: row.student_id,
          present: row.present,
          student: student ? {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            student_number: student.student_number
          } : undefined
        }
      })
    } catch (e) {
      console.error('Error fetching batch items:', e)
      toast.error('Unexpected error while fetching batch items')
    } finally {
      loading.value = false
    }
  }

  const fetchLatestBatchForLeader = async (
    organizationId: string | number,
    eventId: number,
    leaderId: string | null
  ): Promise<EventBlockBatch | null> => {
    if (!organizationId || !eventId || !leaderId) return null
    try {
      const { data, error } = await supabase
        .from('event_block_batches')
        .select('id, organization_id, event_id, leader_id, status, submitted_at, reviewed_at, reviewer_id, note')
        .eq('organization_id', organizationId)
        .eq('event_id', eventId)
        .eq('leader_id', leaderId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Failed to fetch latest batch for leader:', error)
        return null
      }

      return data
        ? {
            id: data.id,
            organization_id: data.organization_id,
            event_id: data.event_id,
            leader_id: data.leader_id,
            status: data.status,
            submitted_at: data.submitted_at,
            reviewed_at: data.reviewed_at,
            reviewer_id: data.reviewer_id,
            note: data.note
          }
        : null
    } catch (e) {
      console.error('Error fetching latest batch for leader:', e)
      return null
    }
  }

  const approveBatch = async (batchId: string, reviewerId: string | null): Promise<boolean> => {
    approving.value = true
    try {
      // Get batch info
      const { data: batch, error: batchErr } = await supabase
        .from('event_block_batches')
        .select('id, event_id')
        .eq('id', batchId)
        .single()

      if (batchErr || !batch) {
        toast.error('Failed to load batch: ' + getErrorMessage(batchErr))
        return false
      }

      // Get items
      const { data: items, error: itemsErr } = await supabase
        .from('event_block_batch_items')
        .select('student_id, present')
        .eq('batch_id', batchId)

      if (itemsErr) {
        toast.error('Failed to load batch items: ' + getErrorMessage(itemsErr))
        return false
      }

      // Apply blocking to student_events
      for (const item of items || []) {
        // Check existing row
        const { data: existing, error: selErr } = await supabase
          .from('student_events')
          .select('id')
          .eq('student_id', item.student_id as any)
          .eq('event_id', batch.event_id)
          .maybeSingle()

        if (selErr) {
          console.warn('Failed to check student_events row:', selErr)
          continue
        }

        // Approving a batch clears the submitted students for this event
        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('student_events')
            .update({ status: 'cleared', present: item.present ?? true })
            .eq('id', existing.id)
          if (updErr) {
            console.warn('Failed to update student_events:', updErr)
          }
        } else {
          const { error: insErr } = await supabase
            .from('student_events')
            .insert([{ student_id: item.student_id as any, event_id: batch.event_id, status: 'cleared', present: item.present ?? true }])
          if (insErr) {
            console.warn('Failed to insert student_events:', insErr)
          }
        }
      }

      // Update batch status
      const { error: updBatchErr } = await supabase
        .from('event_block_batches')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_id: reviewerId || null
        })
        .eq('id', batchId)

      if (updBatchErr) {
        toast.error('Failed to finalize approval: ' + getErrorMessage(updBatchErr))
        return false
      }

      toast.success('Batch approved and students cleared')
      await fetchPendingBatches()
      return true
    } catch (e) {
      console.error('Error approving batch:', e)
      toast.error('Unexpected error while approving batch')
      return false
    } finally {
      approving.value = false
    }
  }

  const declineBatch = async (batchId: string, reviewerId: string | null): Promise<boolean> => {
    approving.value = true
    try {
      const { error } = await supabase
        .from('event_block_batches')
        .update({
          status: 'declined',
          reviewed_at: new Date().toISOString(),
          reviewer_id: reviewerId || null
        })
        .eq('id', batchId)

      if (error) {
        toast.error('Failed to decline batch: ' + getErrorMessage(error))
        return false
      }

      toast.success('Batch declined')
      await fetchPendingBatches()
      return true
    } catch (e) {
      console.error('Error declining batch:', e)
      toast.error('Unexpected error while declining batch')
      return false
    } finally {
      approving.value = false
    }
  }

  return {
    // state
    loading,
    saving,
    approving,
    pendingBatches,
    batchItems,
    // actions
    createBatchSubmission,
    fetchPendingBatches,
    fetchBatchItems,
    fetchLatestBatchForLeader,
    approveBatch,
    declineBatch
  }
})
