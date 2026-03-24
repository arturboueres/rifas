/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RaffleInfo } from './types';
import { ShoppingCart, Info, Trophy, Beef, Phone, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { SupabaseStatus } from './components/SupabaseStatus';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const RAFFLE_INFO: RaffleInfo = {
  title: "Rifa Kit de Carnes Premium",
  description: "Concorra a um kit completo para o seu churrasco: Picanha Black Angus, Ancho, Linguiça Artesanal e muito mais!",
  pricePerNumber: 4.50,
  prizeImage: "https://picsum.photos/seed/bbq/800/600"
};

const MAX_COTAS = 500;

export default function App() {
  const [quantity, setQuantity] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', cpf: '', phone: '' });
  const [pixData, setPixData] = useState<{ qrcode: string, copy_paste: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.cpf.length !== 11) {
      alert("O CPF deve ter exatamente 11 dígitos numéricos.");
      return;
    }
    if (formData.phone.length < 10 || formData.phone.length > 11) {
      alert("O telefone deve ter o DDD e o número (10 ou 11 dígitos numéricos).");
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = quantity * RAFFLE_INFO.pricePerNumber;
      const externalId = `rifa_${Date.now()}`;
      console.log("Sending PIX request to server...");
      const response = await axios.post('/api/pix/receive', {
        amount: totalAmount,
        description: `Rifa Kit de Carnes - ${quantity} Cotas`,
        external_id: externalId,
        payer_name: formData.name,
        payer_email: formData.email,
        payer_cpf: formData.cpf,
        payer_phone: formData.phone
      });

      console.log("Server response received:", response.data);

      if (response.data && response.data.pix) {
        console.log("PIX generated successfully:", response.data.pix.code);
        setPixData({
          qrcode: response.data.pix.code, // 'code' is the PIX string
          copy_paste: response.data.pix.code
        });
      } else {
        console.error("Invalid response structure from server:", response.data);
        alert("Resposta inválida do servidor. Verifique os logs.");
      }

        // Save to Supabase if configured
        if (isSupabaseConfigured) {
          const { error: supabaseError } = await supabase
            .from('raffle_orders')
            .insert([
              {
                external_id: externalId,
                payer_name: formData.name,
                payer_email: formData.email,
                payer_cpf: formData.cpf,
                payer_phone: formData.phone,
                quantity: quantity,
                total_amount: totalAmount,
                status: 'pending',
                pix_code: response.data.pix.code
              }
            ]);
          
          if (supabaseError) {
            console.error("Supabase save error:", supabaseError);
          }
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      const errorMsg = error.response?.data?.details || error.response?.data?.error || "Erro ao gerar PIX. Tente novamente.";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = quantity * RAFFLE_INFO.pricePerNumber;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      {/* Hero Section */}
      <header className="relative h-[40vh] overflow-hidden border-b neon-border">
        <img 
          src={RAFFLE_INFO.prizeImage} 
          alt="Kit de Carnes" 
          className="w-full h-full object-cover brightness-50"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-900/40 backdrop-blur-md p-6 rounded-2xl neon-border"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 flex items-center gap-3">
              <Beef className="w-10 h-10 neon-text" />
              {RAFFLE_INFO.title}
            </h1>
            <p className="text-stone-200 max-w-2xl mx-auto text-lg">
              {RAFFLE_INFO.description}
            </p>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Raffle Selection */}
        <div className="lg:col-span-2">
          <div className="bg-stone-900 rounded-3xl p-8 shadow-sm neon-border">
            <div className="mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2 neon-text">
                <Trophy className="text-amber-500" />
                Selecione a quantidade de cotas
              </h2>
              <p className="text-stone-400">Quanto mais cotas você comprar, maiores suas chances de ganhar!</p>
            </div>

            <div className="flex flex-col items-center justify-center py-12 bg-stone-950 rounded-2xl border border-stone-800">
              <div className="flex items-center gap-6 mb-8">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-16 h-16 rounded-full bg-stone-900 border-2 border-stone-800 flex items-center justify-center text-2xl font-bold neon-border-hover transition-all shadow-sm"
                >
                  -
                </button>
                <div className="text-center flex flex-col items-center">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setQuantity(Math.min(MAX_COTAS, Math.max(1, val)));
                    }}
                    className="text-6xl font-black text-white bg-transparent border-none text-center w-40 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none neon-text"
                  />
                  <p className="text-stone-500 font-medium uppercase tracking-widest text-xs mt-2">Cotas Selecionadas</p>
                </div>
                <button 
                  onClick={() => setQuantity(Math.min(MAX_COTAS, quantity + 1))}
                  className="w-16 h-16 rounded-full bg-stone-900 border-2 border-stone-800 flex items-center justify-center text-2xl font-bold neon-border-hover transition-all shadow-sm"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 w-full max-w-2xl">
                {[5, 10, 25, 50, 100, 150, 300, 400].map(amount => (
                  <div key={amount} className="relative">
                    {amount === 10 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-2xl animate-bounce">
                        🔥
                      </div>
                    )}
                    <button
                      onClick={() => setQuantity(q => Math.min(MAX_COTAS, q + amount))}
                      className={`w-full h-14 bg-stone-900 border border-stone-800 rounded-xl font-bold text-stone-300 neon-border-hover transition-all shadow-sm flex items-center justify-center ${amount === 10 ? 'neon-border' : ''}`}
                    >
                      +{amount} Cotas
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Checkout */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="bg-stone-900 rounded-3xl p-8 shadow-sm neon-border">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 neon-text">
                <ShoppingCart className="text-emerald-500" />
                Resumo da Compra
              </h3>
              
              {quantity > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                        {quantity}
                      </div>
                      <div>
                        <p className="font-bold text-stone-100">Cotas de Participação</p>
                        <p className="text-xs text-stone-500">Números serão enviados por e-mail</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-stone-800">
                    <div className="flex justify-between text-stone-500 mb-2">
                      <span>Quantidade</span>
                      <span className="text-stone-100">{quantity}x</span>
                    </div>
                    <div className="flex justify-between text-stone-500 mb-2">
                      <span>Valor Unitário</span>
                      <span className="text-stone-100">R$ {RAFFLE_INFO.pricePerNumber.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-stone-100 mt-4">
                      <span>Total</span>
                      <span className="neon-text">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-neon-green text-black py-4 rounded-2xl font-black text-lg hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)] uppercase tracking-wider"
                  >
                    Finalizar Pedido
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-stone-500">
                  <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Selecione a quantidade de cotas para continuar.</p>
                </div>
              )}
            </div>

            <div className="bg-stone-900 rounded-3xl p-6 border border-stone-800">
              <h4 className="font-bold text-stone-100 mb-2">Como funciona?</h4>
              <ul className="text-sm text-stone-400 space-y-2">
                <li className="flex gap-2">
                  <span className="font-bold neon-text">1.</span> Escolha a quantidade de cotas desejada.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold neon-text">2.</span> Preencha seus dados e pague via PIX.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold neon-text">3.</span> Receba seus números da sorte por e-mail!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden neon-border"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6 neon-text">Finalizar Compra</h3>
                
                {!pixData ? (
                  <form onSubmit={handlePurchase} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-400 flex items-center gap-2">
                        <User className="w-4 h-4" /> Nome Completo
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:neon-border outline-none text-white"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-400 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> E-mail
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:neon-border outline-none text-white"
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-400">CPF</label>
                        <input
                          required
                          type="text"
                          value={formData.cpf}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setFormData({...formData, cpf: val});
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:neon-border outline-none text-white"
                          placeholder="00000000000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-400 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> WhatsApp
                        </label>
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setFormData({...formData, phone: val});
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:neon-border outline-none text-white"
                          placeholder="Ex: 11999999999"
                        />
                      </div>
                    </div>

                    <button
                      disabled={isLoading}
                      type="submit"
                      className="w-full bg-neon-green text-black py-4 rounded-2xl font-black text-lg hover:brightness-110 transition-all mt-6 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                    >
                      {isLoading ? 'Gerando PIX...' : 'Gerar Pagamento PIX'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="bg-white p-6 rounded-2xl inline-block shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                      <QRCodeSVG value={pixData.qrcode} size={200} />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-stone-500">Copia e Cola:</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={pixData.copy_paste}
                          className="flex-1 px-4 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono truncate text-stone-300"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.copy_paste);
                            alert("Copiado!");
                          }}
                          className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 p-4 rounded-xl text-sm text-emerald-400 flex gap-3 border border-emerald-500/20">
                      <Info className="w-5 h-5 shrink-0" />
                      <p>Após o pagamento, seus números da sorte serão enviados para o seu e-mail.</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setPixData(null);
                        setQuantity(1);
                      }}
                      className="w-full border border-stone-800 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors text-stone-400"
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-stone-900 text-stone-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">© 2026 Rifa Kit de Carnes Premium. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-6 text-sm mb-8">
            <a href="#" className="hover:text-white">Termos de Uso</a>
            <a href="#" className="hover:text-white">Privacidade</a>
            <a href="#" className="hover:text-white">Contato</a>
          </div>

          <div className="pt-8 border-t border-stone-800 flex flex-col items-center gap-4">
            <SupabaseStatus />
          </div>
        </div>
      </footer>
    </div>
  );
}
