"use client";

import React, { useState } from "react";
import { MessageSquare, Send, User, HardHat, Check } from "lucide-react";

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "Maître Couvreur Zlobodan",
      role: "staff",
      time: "24/07/2026 09:30",
      content: "Bonjour M. Peeters, nous avons terminé la pose de l'écran de sous-toiture HPV Doerken sur votre toit à Ixelles. Nous attaquons le voligeage aujourd'hui.",
    },
    {
      id: "2",
      sender: "Jean Peeters (Vous)",
      role: "client",
      time: "24/07/2026 10:15",
      content: "Parfait, merci pour le suivi ! Est-ce que les livraisons d'ardoises naturelles Cupa sont bien arrivées sur place ?",
    },
    {
      id: "3",
      sender: "Maître Couvreur Zlobodan",
      role: "staff",
      time: "24/07/2026 11:00",
      content: "Oui, les palettes d'ardoises certifiées NBN sont stockées sous bâche sécurisée au pied de l'échafaudage. Tout est prêt pour le clouage.",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      id: String(Date.now()),
      sender: "Jean Peeters (Vous)",
      role: "client",
      time: "À l'instant",
      content: inputMessage.trim(),
    };

    setMessages([...messages, newMsg]);
    setInputMessage("");
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Messagerie en Direct avec votre Couvreur
        </h1>
        <p className="text-sm text-slate-400">
          Échangez directement avec le chef de chantier sur votre projet de toiture. Notifications email à chaque réponse.
        </p>
      </div>

      {/* Discussion Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[550px]">
        
        {/* Thread Info Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-brand-terracotta" />
            <span className="font-bold text-white">Fil de discussion — Chantier Ixelles (#DEV-2026-0012)</span>
          </div>
          <span className="text-emerald-400 font-semibold">• Équipe en ligne</span>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isMe = m.role === "client";
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-lg space-y-1 ${
                  isMe ? "ml-auto items-end text-right" : "mr-auto items-start text-left"
                }`}
              >
                <span className="text-[10px] text-slate-400 font-medium px-1">
                  {m.sender} • {m.time}
                </span>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-brand-terracotta text-white rounded-tr-none shadow-md"
                      : "bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-terracotta"
          />
          <button
            type="submit"
            className="bg-brand-terracotta hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-accent flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </form>

      </div>

    </div>
  );
}
