import { useAsync } from './useAsync';
import { getLeads } from '../services/leads.service';
import type { Lead } from '../types';

export function useLeads() {
  return useAsync<Lead[]>(getLeads, []);
}
