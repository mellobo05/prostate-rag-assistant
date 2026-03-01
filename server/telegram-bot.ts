import TelegramBot from "node-telegram-bot-api";
import { openai, ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import { storage } from "./storage";
import { db } from "./db";
import { patientProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

let bot: TelegramBot | null = null;

const userSessions = new Map<number, {
  patientId: number | null;
  awaitingLink: boolean;
}>();

function getSession(chatId: number) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, { patientId: null, awaitingLink: false });
  }
  return userSessions.get(chatId)!;
}

export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set, skipping bot startup");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("[telegram] Bot started with polling");

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    await bot!.sendMessage(chatId,
      `Welcome to OncoCare AI - your personal care companion.\n\n` +
      `I can help you:\n` +
      `- Track your symptoms through voice or text\n` +
      `- Provide gentle guidance and support\n` +
      `- Answer questions about your wellbeing\n\n` +
      `First, let's link your patient profile.\n` +
      `You can:\n` +
      `- Send your Profile ID number (shown on the web dashboard)\n` +
      `- Type your name to search\n` +
      `- Use /link <id> command`,
      { parse_mode: "HTML" }
    );
    session.awaitingLink = true;
  });

  bot.onText(/\/link (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    const profileId = parseInt(match![1]);

    if (isNaN(profileId)) {
      await bot!.sendMessage(chatId, "Please provide a valid profile ID number. Example: /link 1");
      return;
    }

    const profile = await storage.getProfile(profileId);
    if (!profile) {
      await bot!.sendMessage(chatId, "Profile not found. Please check the ID and try again.");
      return;
    }

    session.patientId = profileId;
    session.awaitingLink = false;

    await bot!.sendMessage(chatId,
      `Profile linked successfully!\n\n` +
      `Patient: ${profile.name}\n` +
      `Type: ${profile.cancerType || 'Not specified'}\n\n` +
      `You can now:\n` +
      `- Send me a voice message to talk about how you're feeling\n` +
      `- Type a message to describe your symptoms\n` +
      `- Use /status to see your profile info\n` +
      `- Use /help to see all commands`
    );
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (!session.patientId) {
      await bot!.sendMessage(chatId, "No profile linked. Use /link <profile_id> to connect your patient profile.");
      return;
    }

    const profile = await storage.getProfile(session.patientId);
    if (!profile) {
      session.patientId = null;
      await bot!.sendMessage(chatId, "Profile no longer exists. Use /link <profile_id> to connect a new one.");
      return;
    }

    const reports = await storage.getReports(session.patientId);
    const psaReports = reports.filter(r => r.reportType === 'PSA' && r.psaLevel);
    const latestPsa = psaReports.length > 0 ? psaReports[psaReports.length - 1] : null;

    await bot!.sendMessage(chatId,
      `Patient: ${profile.name}\n` +
      `Cancer Type: ${profile.cancerType || 'Not specified'}\n` +
      `Stage: ${profile.stage || 'Not specified'}\n` +
      `Total Reports: ${reports.length}\n` +
      (latestPsa ? `Latest PSA: ${latestPsa.psaLevel} ng/mL` : `No PSA data yet`)
    );
  });

  bot.onText(/\/help/, async (msg) => {
    await bot!.sendMessage(msg.chat.id,
      `Available commands:\n\n` +
      `/start - Welcome message\n` +
      `/link <id> - Link your patient profile\n` +
      `/status - View your profile summary\n` +
      `/help - Show this help message\n\n` +
      `You can also:\n` +
      `- Send a voice message to talk about symptoms\n` +
      `- Type any message to chat with your care companion`
    );
  });

  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (!session.patientId) {
      await bot!.sendMessage(chatId, "Please link your profile first with /link <profile_id>");
      return;
    }

    const profile = await storage.getProfile(session.patientId);
    if (!profile) {
      await bot!.sendMessage(chatId, "Profile not found. Please re-link with /link <profile_id>");
      return;
    }

    await bot!.sendChatAction(chatId, "typing");

    try {
      const fileId = msg.voice!.file_id;
      const file = await bot!.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);
      const userTranscript = await speechToText(audioBuffer, inputFormat);

      await bot!.sendMessage(chatId, `You said: "${userTranscript}"`);
      await bot!.sendChatAction(chatId, "typing");

      const assistantResponse = await getPalliativeResponse(profile, userTranscript);

      await bot!.sendMessage(chatId, assistantResponse, { parse_mode: "HTML" });

    } catch (error) {
      console.error("[telegram] Voice processing error:", error);
      await bot!.sendMessage(chatId, "I had trouble processing your voice message. Could you try again or type your message instead?");
    }
  });

  bot.on("message", async (msg) => {
    if (msg.voice) return;
    if (!msg.text) return;
    if (msg.text.startsWith("/")) {
      const session = getSession(msg.chat.id);
      if (session.awaitingLink && !msg.text.startsWith("/link") && !msg.text.startsWith("/start") && !msg.text.startsWith("/help")) {
        const profileId = parseInt(msg.text);
        if (!isNaN(profileId)) {
          const profile = await storage.getProfile(profileId);
          if (profile) {
            session.patientId = profileId;
            session.awaitingLink = false;
            await bot!.sendMessage(msg.chat.id,
              `Profile linked: ${profile.name}\n\n` +
              `You can now send voice messages or type to chat with your care companion.`
            );
            return;
          }
        }
      }
      return;
    }

    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (session.awaitingLink) {
      const profileId = parseInt(msg.text);
      if (!isNaN(profileId)) {
        const profile = await storage.getProfile(profileId);
        if (profile) {
          session.patientId = profileId;
          session.awaitingLink = false;
          await bot!.sendMessage(chatId,
            `Profile linked: ${profile.name}\n\n` +
            `You can now send voice messages or type to chat with your care companion.`
          );
          return;
        } else {
          await bot!.sendMessage(chatId, "Profile not found. Please check the ID and try again, or type your name to search.");
          return;
        }
      }

      const searchName = msg.text.trim().toLowerCase();
      if (searchName.length >= 2) {
        const allProfiles = await db.select().from(patientProfiles).execute();
        const matches = allProfiles.filter(p => p.name.toLowerCase().includes(searchName));

        if (matches.length === 1) {
          session.patientId = matches[0].id;
          session.awaitingLink = false;
          await bot!.sendMessage(chatId,
            `Profile linked: ${matches[0].name}\n\n` +
            `You can now send voice messages or type to chat with your care companion.`
          );
          return;
        } else if (matches.length > 1) {
          const list = matches.map(p => `  /link ${p.id} - ${p.name}`).join("\n");
          await bot!.sendMessage(chatId, `Multiple profiles found:\n\n${list}\n\nTap the one you want.`);
          return;
        } else {
          await bot!.sendMessage(chatId, "No profiles found with that name. Please try again or use /link <id>.");
          return;
        }
      }
    }

    if (!session.patientId) {
      await bot!.sendMessage(chatId, "Please link your profile first with /link <profile_id>");
      return;
    }

    const profile = await storage.getProfile(session.patientId);
    if (!profile) {
      await bot!.sendMessage(chatId, "Profile not found. Please re-link with /link <profile_id>");
      return;
    }

    await bot!.sendChatAction(chatId, "typing");

    try {
      const assistantResponse = await getPalliativeResponse(profile, msg.text);
      await bot!.sendMessage(chatId, assistantResponse, { parse_mode: "HTML" });
    } catch (error) {
      console.error("[telegram] Text processing error:", error);
      await bot!.sendMessage(chatId, "I'm having some trouble right now. Please try again in a moment.");
    }
  });

  bot.on("polling_error", (error) => {
    console.error("[telegram] Polling error:", error.message);
  });
}

async function getPalliativeResponse(profile: any, userMessage: string): Promise<string> {
  const systemPrompt = `You are a compassionate, empathetic palliative care companion speaking with ${profile.name}, a patient who has ${profile.cancerType || 'cancer'}.
Your goal is to provide comfort, gentle guidance, and listen to their symptoms.

CRITICAL INSTRUCTIONS:
1. Keep your responses short (2-3 paragraphs max), conversational, and easy to understand.
2. DO NOT mention cancer stages, survival rates, prognosis, or scary medical jargon.
3. Focus on symptom management, emotional support, and reassuring them.
4. If they report severe symptoms (like severe pain, inability to urinate, blood in urine, difficulty breathing), advise them gently to have their family contact their main doctor.
5. Use warm, simple language appropriate for an elderly person.
6. You can suggest basic comfort measures like rest, hydration, gentle movement, breathing exercises.
7. Always end on a positive, encouraging note.
8. Do NOT use HTML tags in your response.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    max_completion_tokens: 500,
  });

  return response.choices[0]?.message?.content || "I'm here for you. Please tell me more about how you're feeling.";
}

export function stopTelegramBot() {
  if (bot) {
    bot.stopPolling();
    bot = null;
  }
}
