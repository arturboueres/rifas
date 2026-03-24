import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error' | 'unconfigured'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('unconfigured');
      return;
    }

    async function checkConnection() {
      try {
        // Try to fetch a single row from any table or just check the client
        // A simple way to check connection is to try and get the session or a simple query
        const { error } = await supabase.from('_connection_test').select('*').limit(1);
        
        // Note: '_connection_test' likely doesn't exist, but if we get a 404 or similar, 
        // it means we reached the server. If we get a network error, it's a real connection issue.
        if (error && error.code === 'PGRST301') { // Table not found is actually a sign of life
           setStatus('connected');
        } else if (error) {
           console.error('Supabase connection error:', error);
           // If it's just a "table not found" error, we consider it connected to the API
           if (error.message.includes('relation') && error.message.includes('does not exist')) {
             setStatus('connected');
           } else {
             setStatus('error');
             setErrorMsg(error.message);
           }
        } else {
          setStatus('connected');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    }

    checkConnection();
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs font-medium">
      <Database className="w-3 h-3 text-stone-500" />
      <span className="text-stone-400">Supabase:</span>
      {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
      {status === 'connected' && (
        <div className="flex items-center gap-1 text-emerald-500">
          <CheckCircle2 className="w-3 h-3" />
          <span>Conectado</span>
        </div>
      )}
      {status === 'unconfigured' && (
        <div className="flex items-center gap-1 text-amber-500">
          <AlertCircle className="w-3 h-3" />
          <span>Não Configurado</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1 text-rose-500" title={errorMsg || ''}>
          <XCircle className="w-3 h-3" />
          <span>Erro</span>
        </div>
      )}
    </div>
  );
}
