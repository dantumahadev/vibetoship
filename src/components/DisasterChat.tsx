/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from "react";
import { Bluetooth, MapPin, Map, Copy, Shield, Play, Menu, Check } from "lucide-react";
import { motion } from "motion/react";

export default function DisasterChat() {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "", // Empty indicates no header (Citizen Broadcast in Image 5)
      content: "Cell towers are down near Sector 3. Sharing local water supply details over mesh. Please relay!",
      location: { lat: 17.4135, lng: 78.4520, address: "Rescue Coordinates" },
      time: "09:34:23",
      type: "Bluetooth Mesh Packet"
    },
    {
      id: 2,
      sender: "Banjara Hills Node B",
      content: "Road blocked due to fallen tree branch near Sector 4 intersection. Avoid taking that bypass route.",
      location: { lat: 17.4210, lng: 78.4480, address: "Rescue Coordinates" },
      time: "09:54:23",
      type: "Bluetooth Mesh Packet",
      distance: "850m away • 3 hops"
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    const newMessage = {
      id: messages.length + 1,
      sender: "You (Local Node)",
      content: message,
      location: { lat: 17.4150, lng: 78.4550, address: "Rescue Coordinates" },
      time: timeStr,
      type: priority ? "Emergency Distress" : "Bluetooth Mesh Packet",
    };
    setMessages([newMessage, ...messages]);
    setMessage("");
    setPriority(false);
  };

  const copyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Mesh Status Header */}
      <div className="bg-white border border-[#DCE9F9] rounded-3xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#DCE9F9] rounded-full flex items-center justify-center text-civic-blue shrink-0">
            <Bluetooth className="w-6 h-6 stroke-[2.25]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">BLE Off-Grid Mesh Chat</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-slate-500 font-semibold">Mesh Active • 5 Nodes in Reach</span>
            </div>
          </div>
        </div>
        <button type="button" className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0">
          <Menu className="w-6 h-6 text-[#E15B5B]" strokeWidth={2.5} />
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border rounded-3xl p-5 shadow-sm ${msg.sender === 'You (Local Node)' ? 'border-blue-100 bg-blue-50/10' : 'border-slate-100/70'}`}
          >
            {msg.sender && (
              <div className="flex justify-between items-center mb-2.5">
                <span className={`text-sm font-extrabold ${msg.sender === 'You (Local Node)' ? 'text-civic-blue' : 'text-slate-900'}`}>{msg.sender}</span>
                {msg.distance && (
                  <span className="text-[10px] font-extrabold text-slate-400">{msg.distance}</span>
                )}
              </div>
            )}
            <p className="text-slate-800 text-sm font-medium leading-relaxed mb-4">{msg.content}</p>
            
            {/* Rescue Coordinates Sub-Card */}
            <div className="bg-[#F8F9FB] border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-civic-blue border border-slate-100/70 shadow-sm shrink-0">
                  <MapPin className="w-5 h-5 stroke-[2.25]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Rescue Coordinates</div>
                  <div className="text-xs font-mono font-bold text-slate-700">{msg.location.lat.toFixed(5)}, {msg.location.lng.toFixed(5)}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" className="p-2 hover:bg-white rounded-lg transition-all text-civic-blue">
                  <Map className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => copyToClipboard(msg.id, `${msg.location.lat}, ${msg.location.lng}`)}
                  className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600"
                >
                  {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="mt-3.5 flex justify-start">
              <span className="text-[10px] font-extrabold text-slate-350 tracking-wider">
                {msg.time} • {msg.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area Card */}
      <div className="bg-[#FDFCFB] border border-slate-200/80 rounded-[2rem] p-5 shadow-xl shadow-slate-100/50">
        
        {/* Toggle Switch */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-700 stroke-[2.5]" />
            <span className="text-xs font-extrabold text-slate-800 tracking-tight">Emergency distress priority</span>
          </div>
          <button 
            type="button"
            onClick={() => setPriority(!priority)}
            className={`w-12 h-6.5 rounded-full transition-all relative ${priority ? 'bg-red-500' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-all ${priority ? 'left-6.5' : 'left-1'}`} />
          </button>
        </div>

        {/* Buttons Row */}
        <div className="flex gap-3 mb-4">
          <button type="button" className="flex-1 py-3 bg-[#E9F0FA] text-civic-blue rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
            </svg>
            Send Live GPS
          </button>
          <button type="button" className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
            <MapPin className="w-4 h-4 text-slate-500 stroke-[2.25]" />
            Choose Landmark
          </button>
        </div>

        {/* Textarea & Send Button Side-by-Side */}
        <div className="flex gap-3 items-end">
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            placeholder="Type message to broadcast to nearby mesh nodes..."
            className="flex-1 bg-[#F5F6F8] border border-slate-100 rounded-2xl p-4 text-sm text-slate-900 focus:ring-1 focus:ring-civic-blue outline-none transition-all resize-none h-20 placeholder:text-slate-400 font-semibold custom-scrollbar"
          />
          <button 
            type="button"
            onClick={handleSendMessage}
            className="w-12 h-12 bg-civic-blue text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0 hover:bg-blue-700"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
