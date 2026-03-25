// ── AI ASSISTANT ──────────────────────────────────────────────────────────────
import { v } from './utils.js';

function addAI(html) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const div  = document.createElement('div');
  div.className = 'ai-msg';
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function addUser(text) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const div  = document.createElement('div');
  div.className = 'user-msg';
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

async function askGemini(msg, currentStep) {
  try {
    const ctx = `You are an HR and legal assistant helping fill an Indian offer letter form. 
Be brief (2-3 sentences), professional, and specific to Indian employment law and HR norms. 
Current form data: org="${v('orgName')}", employee="${v('empFullName')}", CTC=${v('annualCTC')}, step=${currentStep+1}/6.`;
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, context: ctx }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not get a response.';
  } catch (err) { 
    return `AI unavailable: ${err.message}`; 
  }
}

async function sendChat(currentStep) {
  const inp = document.getElementById('chatIn');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  addUser(msg);
  const chatBody = document.getElementById('chatBody');
  const thinking = document.createElement('div');
  thinking.className = 'ai-msg';
  thinking.innerHTML = '<i>Thinking…</i>';
  if (chatBody) chatBody.appendChild(thinking);
  const reply = await askGemini(msg, currentStep);
  thinking.remove();
  addAI(reply);
}

export { addAI, addUser, askGemini, sendChat };
