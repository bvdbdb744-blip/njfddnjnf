process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const Tg = require('node-telegram-bot-api');
const TelegramBot = Tg.default || Tg;

const token = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || '8782976307');
const ADMIN_USERNAME = 'pokizafood_1';

const bot = new TelegramBot(token, { polling: true });

// ─── DATA STORES ─────────────────────────────────────────────────────────────
const userStates   = {};   // chatId -> state string
const userCarts    = {};   // chatId -> { prodId: qty }
const userPhones   = {};   // chatId -> phone string
const pendingOrders = {};  // chatId -> { location }

// userProfiles[chatId] = { name, phone, registeredAt, status: 'active'|'blocked' }
let userProfiles = {};
            saveData();

// orderHistory[] = { orderId, userId, phone, items, total, status, createdAt }
let orderHistory = [];

let orderCounter = 1;

const fsCore = require('fs');
const DB_FILE = 'db.json';
if (fsCore.existsSync(DB_FILE)) {
    try {
        const data = JSON.parse(fsCore.readFileSync(DB_FILE, 'utf8'));
        if (data.userProfiles) userProfiles = data.userProfiles;
        if (data.orderHistory) orderHistory = data.orderHistory;
        if (data.orderCounter) orderCounter = data.orderCounter;
    } catch(e) {}
}

const saveData = () => {
    fsCore.writeFileSync(DB_FILE, JSON.stringify({ userProfiles, orderHistory, orderCounter }, null, 2));
};


// ─── PRODUCT DATA ─────────────────────────────────────────────────────────────
const categories = [
    "Aksiya", "Kombolar", "Lavashlar", "Burgerlar", "Sendvichlar",
    "Hot-doglar", "Sneklar", "Salqin Ichimliklar", "Issiq Ichimliklar",
    "Souslar", "Yarim tayyor mahsulot", "Issiq taomlar"
];

const productsData = {
    "Aksiya": [
        { id: "a1", name: "Yoz aksiyasi", price: 28000 },
        { id: "a2", name: "Oilaviy", price: 100000 }
    ],
    "Kombolar": [
        { id: "k1",  name: "Donar Kombo | A", price: 40000 },
        { id: "k2",  name: "Talaba Kombo",    price: 33000 },
        { id: "k3",  name: "Kombo 4",         price: 37000 },
        { id: "k4",  name: "Fri Kombo",       price: 33000 },
        { id: "k5",  name: "Kombo 8",         price: 100000 },
        { id: "k6",  name: "Kombo 7",         price: 48000 },
        { id: "k7",  name: "Kombo 6",         price: 45000 },
        { id: "k8",  name: "Kombo 5",         price: 40000 },
        { id: "k9",  name: "Kombo 3",         price: 36000 },
        { id: "k10", name: "Kombo 1",         price: 33000 },
        { id: "k11", name: "Kombo 2",         price: 34000 },
        { id: "k12", name: "Juma Kombo",      price: 45000 }
    ],
    "Lavashlar": [
        { id: "l1", name: "Tvister", price: 25000 },
        { id: "l2", name: "Tvister (pishloqli)", price: 28000 },
        { id: "l3", name: "Kotletli lavash (pishloqli)", price: 23000 },
        { id: "l4", name: "Tovuq go'shtli lavash (pishloqli)", price: 28000 },
        { id: "l5", name: "Tovuq go'shtli lavash", price: 25000 },
        { id: "l6", name: "Mol go'shtli lavash (pishloqli)", price: 31000 },
        { id: "l7", name: "Kotletli lavash", price: 20000 },
        { id: "l8", name: "Mol go'shtli lavash", price: 28000 }
    ],
    "Burgerlar": [
        { id: "b1", name: "Chizburger",    price: 18000 },
        { id: "b2", name: "Big Burger",    price: 25000 },
        { id: "b3", name: "Gamburger",     price: 15000 },
        { id: "b4", name: "Big chizburger", price: 30000 }
    ],
    "Sendvichlar": [
        { id: "s1", name: "Tovuq go'shtli sendvich (pishloqli)", price: 28000 },
        { id: "s2", name: "Mol go'shtli sendvich",               price: 28000 },
        { id: "s3", name: "Mol go'shtli donar (pishloqli)",      price: 31000 },
        { id: "s4", name: "Mol go'shtli donar",                  price: 28000 },
        { id: "s5", name: "Tovuq go'shtli sendvich",             price: 25000 },
        { id: "s6", name: "Tovuq go'shtli donar (pishloqli)",    price: 28000 },
        { id: "s7", name: "Tovuq go'shtli donar",                price: 25000 },
        { id: "s8", name: "Mol go'shtli sendvich (pishloqli)",   price: 31000 },
        { id: "s9", name: "Klab sendvich",                       price: 30000 }
    ],
    "Hot-doglar": [
        { id: "h1", name: "Big longer (pishloqli)",    price: 28000 },
        { id: "h2", name: "Longer (pishloqli)",        price: 20000 },
        { id: "h3", name: "Big Xot-Dog (pishloqli)",   price: 24000 },
        { id: "h4", name: "Big longer",                price: 25000 },
        { id: "h5", name: "Longer",                    price: 17000 },
        { id: "h6", name: "Pokiza Xot-Dog (pishloqli)", price: 19000 },
        { id: "h7", name: "Pokiza Xot-Dog",            price: 16000 },
        { id: "h8", name: "Xot-Dog",                   price: 15000 },
        { id: "h9", name: "Xot-Dog (pishloqli)",       price: 18000 }
    ],
    "Sneklar": [
        { id: "sn1", name: "Chipsi",        price: 10000 },
        { id: "sn2", name: "Kartoshka Fri", price: 15000 }
    ],
    "Salqin Ichimliklar": [
        { id: "si1",  name: "Pepsi 0.26 (yelim)",          price: 5000 },
        { id: "si2",  name: "Fuse Tea 0.5",                price: 8000 },
        { id: "si3",  name: "Suv Gazlangan 0.5",           price: 5000 },
        { id: "si4",  name: "Suv Gazsiz 0.5",              price: 5000 },
        { id: "si5",  name: "Fanta 0,5",                   price: 10000 },
        { id: "si6",  name: "Coca cola 1",                 price: 15000 },
        { id: "si7",  name: "Coca cola 0,5",               price: 10000 },
        { id: "si8",  name: "Tabiiy Sharbat Limon 0.5",    price: 8000 },
        { id: "si9",  name: "Fuse Tea 1",                  price: 15000 },
        { id: "si10", name: "Tabiiy Sharbat Moxito 0.5",   price: 8000 },
        { id: "si11", name: "Tabiiy Sharbat Malina 0.5",   price: 8000 },
        { id: "si12", name: "Tabiiy Sharbat Apelsin 0.5",  price: 8000 },
        { id: "si13", name: "Pepsi 0.25",                  price: 5000 },
        { id: "si14", name: "Fanta 1,5",                   price: 18000 },
        { id: "si15", name: "Fanta 1",                     price: 15000 },
        { id: "si16", name: "Coca cola 1,5",               price: 18000 }
    ],
    "Issiq Ichimliklar": [
        { id: "ii1", name: "Limon choy (stakan)", price: 10000 },
        { id: "ii2", name: "Qora Choy (stakan)",  price: 5000 },
        { id: "ii3", name: "Qora Qahva",          price: 10000 },
        { id: "ii4", name: "Ko'k Choy (stakan)",  price: 5000 },
        { id: "ii5", name: "Sutlik Qahva",        price: 10000 }
    ],
    "Souslar": [
        { id: "so1", name: "Sarimsoqli sous", price: 3000 },
        { id: "so2", name: "Chili",           price: 3000 },
        { id: "so3", name: "Mayonez",         price: 3000 },
        { id: "so4", name: "Ketchup",         price: 3000 },
        { id: "so5", name: "Pishloqlik Sous", price: 3000 },
        { id: "so6", name: "Shirin sous",     price: 3000 }
    ],
    "Yarim tayyor mahsulot": [
        { id: "yt1", name: "Chuchvara (1kg)",      price: 25000 },
        { id: "yt2", name: "Teftellar (500gr)",     price: 25000 },
        { id: "yt3", name: "Oilaviy To'plam",       price: 75000 },
        { id: "yt4", name: "Kotletlar (450gr)",     price: 23000 },
        { id: "yt5", name: "Frikadelkalar (500gr)", price: 27000 }
    ],
    "Issiq taomlar": [
        { id: "it1", name: "Pokiza box", price: 30000 }
    ]
};

categories.forEach(cat => { if (!productsData[cat]) productsData[cat] = []; });

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const disc = (price) => Math.round(price * 0.8);

const fmt = (n) => n.toLocaleString('uz-UZ');

const formatDate = (d) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
};

const buildCartSummary = (cart) => {
    let total = 0, lines = [];
    for (const cat in productsData) {
        productsData[cat].forEach(p => {
            const qty = cart[p.id];
            if (qty > 0) {
                const pr = disc(p.price);
                lines.push(`• ${p.name} — ${qty} × ${fmt(pr)} = ${fmt(qty * pr)} so'm`);
                total += qty * pr;
            }
        });
    }
    return { lines, total };
};

const isAdmin = (chatId) => String(chatId) === ADMIN_ID;
const isBlocked = (chatId) => userProfiles[chatId] && userProfiles[chatId].status === 'blocked';

// ─── KEYBOARDS ────────────────────────────────────────────────────────────────
const getMainMenuKeyboard = () => ({
    reply_markup: {
        keyboard: [
            [{ text: "📄 Menyu" }, { text: "🛒 Savat" }],
            [{ text: "🏢 Barcha filiallar" }, { text: "📍 Yaqin filial" }],
            [{ text: "🛍 Mening buyurtmalarim" }]
        ],
        resize_keyboard: true
    }
});

const getAdminMenuKeyboard = () => ({
    reply_markup: {
        keyboard: [
            [{ text: "👥 Ro'yxatdan o'tganlar" }, { text: "✅ Tasdiqlangan buyurtmalar" }],
            [{ text: "❌ Rad etilgan buyurtmalar" }, { text: "🚫 Bloklangan foydalanuvchilar" }],
            [{ text: "🔓 Blokdan ochilganlar" }, { text: "📊 Umumiy statistika" }]
        ],
        resize_keyboard: true
    }
});

const getCategoriesKeyboard = () => ({
    reply_markup: {
        inline_keyboard: categories.map((cat, i) => [{ text: cat, callback_data: `cat_${i}` }])
    }
});

const getProductsKeyboard = (catIndex, cart) => {
    const products = productsData[categories[catIndex]] || [];
    const inline_keyboard = [];
    products.forEach(prod => {
        const qty = cart[prod.id] || 0;
        inline_keyboard.push([{ text: `${prod.name}: ${fmt(disc(prod.price))} so'm — ${qty} dona`, callback_data: 'ignore' }]);
        inline_keyboard.push([
            { text: "➖", callback_data: `dec_${prod.id}_${catIndex}` },
            { text: "➕", callback_data: `inc_${prod.id}_${catIndex}` },
            { text: "❌", callback_data: `rem_${prod.id}_${catIndex}` }
        ]);
    });
    inline_keyboard.push([{ text: "⬅️ Orqaga", callback_data: 'back_cats' }]);
    return { reply_markup: { inline_keyboard } };
};

// ─── CHECKOUT STEPS ───────────────────────────────────────────────────────────
const askCheckoutLocation = (chatId) => {
    userStates[chatId] = 'CHECKOUT_LOCATION';
    bot.sendMessage(chatId,
        "📍 Buyurtmani davom ettirish uchun iltimos lokatsiyangizni quyidagi tugma orqali yuboring",
        {
            reply_markup: {
                keyboard: [[{ text: "📍 Manzilingizni ulashing", request_location: true }]],
                resize_keyboard: true, one_time_keyboard: true
            }
        }
    );
};

const askCheckoutPhone = (chatId) => {
    userStates[chatId] = 'CHECKOUT_PHONE';
    const saved = userPhones[chatId];
    const kb = [];
    if (saved) kb.push([{ text: `📱 ${saved}` }]);
    kb.push([{ text: "📲 Boshqa raqam kiritish" }]);
    kb.push([{ text: "❌ Bekor qilish" }]);
    bot.sendMessage(chatId,
        saved ? "📞 Quyidagi raqamni tanlang yoki boshqa raqam kiriting:" : "📞 Telefon raqamingizni kiriting (+998XXXXXXXXX):",
        { reply_markup: { keyboard: kb, resize_keyboard: true, one_time_keyboard: true } }
    );
};

const showOrderConfirmation = (chatId) => {
    const { lines, total } = buildCartSummary(userCarts[chatId] || {});
    const phone = userPhones[chatId] || "Noma'lum";
    let txt = `🛍 Buyurtmangiz:\n\n${lines.join('\n')}\n\n💰 Jami: ${fmt(total)} so'm\n📞 Telefon: ${phone}\n\nBuyurtmani tasdiqlaysizmi?`;
    bot.sendMessage(chatId, txt, {
        reply_markup: {
            inline_keyboard: [[
                { text: "✅ Tasdiqlash", callback_data: "order_confirm_yes" },
                { text: "❌ Bekor qilish", callback_data: "order_confirm_no" }
            ]]
        }
    });
};

// ─── ADMIN PANEL HELPERS ──────────────────────────────────────────────────────
const sendAdminUserList = (chatId, filter, title) => {
    const list = Object.entries(userProfiles).filter(([, u]) => filter(u));
    if (list.length === 0) {
        bot.sendMessage(chatId, `${title}\n\n📭 Hozircha ma'lumot yo'q.`);
        return;
    }
    // Send up to 30 users per message
    const chunks = [];
    for (let i = 0; i < list.length; i += 10) chunks.push(list.slice(i, i + 10));
    chunks.forEach(chunk => {
        const rows = chunk.map(([uid, u]) =>
            `👤 ${u.name || 'Noma\'lum'}\n` +
            `📞 ${u.phone}\n` +
            `🆔 ID: ${uid}\n` +
            `📅 ${formatDate(u.registeredAt)}\n` +
            `🔘 Status: ${u.status === 'blocked' ? '🚫 Bloklangan' : '✅ Faol'}`
        );
        bot.sendMessage(chatId, `${title}\n\n${rows.join('\n─────────────\n')}`, {
            reply_markup: {
                inline_keyboard: chunk.map(([uid, u]) => {
                    if (u.status === 'blocked') {
                        return [{ text: `🔓 ${u.phone} — Blokdan ochish`, callback_data: `unblock_${uid}` }];
                    }
                    return [{ text: `🚫 ${u.phone} — Bloklash`, callback_data: `block_${uid}` }];
                })
            }
        });
    });
};

const sendAdminOrderList = (chatId, status, title) => {
    const list = orderHistory.filter(o => o.status === status);
    if (list.length === 0) {
        bot.sendMessage(chatId, `${title}\n\n📭 Hozircha yo'q.`);
        return;
    }
    const chunks = [];
    for (let i = 0; i < list.length; i += 8) chunks.push(list.slice(i, i + 8));
    chunks.forEach(chunk => {
        const rows = chunk.map(o =>
            `🧾 Buyurtma #${o.orderId}\n` +
            `📞 Tel: ${o.phone}\n` +
            `🆔 User: ${o.userId}\n` +
            `💰 Jami: ${fmt(o.total)} so'm\n` +
            `📅 ${formatDate(o.createdAt)}`
        );
        bot.sendMessage(chatId, `${title}\n\n${rows.join('\n─────────────\n')}`);
    });
};

// ─── MESSAGE HANDLER ──────────────────────────────────────────────────────────
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    if (!userCarts[chatId]) userCarts[chatId] = {};

    // ── ADMIN PANEL ──────────────────────────────────────────────────────────
    if (isAdmin(chatId)) {
        if (text === '/start' || text === '/admin') {
            bot.sendMessage(chatId, "👨‍💼 Admin panelga xush kelibsiz!\n\nQuyidagi bo'limlardan birini tanlang:", getAdminMenuKeyboard());
            return;
        }

        if (text === "👥 Ro'yxatdan o'tganlar") {
            sendAdminUserList(chatId, () => true, "👥 Barcha ro'yxatdan o'tgan foydalanuvchilar:");
            return;
        }
        if (text === "✅ Tasdiqlangan buyurtmalar") {
            sendAdminOrderList(chatId, 'confirmed', "✅ Tasdiqlangan buyurtmalar:");
            return;
        }
        if (text === "❌ Rad etilgan buyurtmalar") {
            sendAdminOrderList(chatId, 'rejected', "❌ Rad etilgan buyurtmalar:");
            return;
        }
        if (text === "🚫 Bloklangan foydalanuvchilar") {
            sendAdminUserList(chatId, u => u.status === 'blocked', "🚫 Bloklangan foydalanuvchilar:");
            return;
        }
        if (text === "🔓 Blokdan ochilganlar") {
            sendAdminUserList(chatId, u => u.status === 'active' && u.wasBlocked, "🔓 Blokdan ochilgan foydalanuvchilar:");
            return;
        }
        if (text === "📊 Umumiy statistika") {
            const total    = Object.keys(userProfiles).length;
            const blocked  = Object.values(userProfiles).filter(u => u.status === 'blocked').length;
            const active   = total - blocked;
            const confirmed = orderHistory.filter(o => o.status === 'confirmed').length;
            const rejected  = orderHistory.filter(o => o.status === 'rejected').length;
            const revenue   = orderHistory.filter(o => o.status === 'confirmed').reduce((s, o) => s + o.total, 0);
            bot.sendMessage(chatId,
                `📊 Umumiy statistika\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👥 Jami foydalanuvchilar: ${total}\n` +
                `✅ Faol: ${active}\n` +
                `🚫 Bloklangan: ${blocked}\n\n` +
                `🧾 Jami buyurtmalar: ${orderHistory.length}\n` +
                `✅ Tasdiqlangan: ${confirmed}\n` +
                `❌ Rad etilgan: ${rejected}\n\n` +
                `💰 Umumiy savdo: ${fmt(revenue)} so'm`
            );
            return;
        }
        // If admin sends something not a panel command — just show panel
        if (!text.startsWith('/')) {
            // Let admin freely type (e.g. to message users) — don't block
        }
    }

    // ── BLOCKED USER ──────────────────────────────────────────────────────────
    if (!isAdmin(chatId) && isBlocked(chatId)) {
        bot.sendMessage(chatId, "⛔ Siz botdan foydalanish huquqidan mahrum etilgansiz.\n\nSavollar uchun: @" + ADMIN_USERNAME);
        return;
    }

    // ── /start ────────────────────────────────────────────────────────────────
    if (text === '/start') {
        const kb = {
            reply_markup: {
                keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
                resize_keyboard: true, one_time_keyboard: true
            }
        };
        bot.sendMessage(chatId, "Iltimos, telefon raqamingizni yuboring yoki +998... formatida yozing:", kb);
        userStates[chatId] = 'WAITING_FOR_PHONE';
        return;
    }

    // ── Registration ──────────────────────────────────────────────────────────
    if (userStates[chatId] === 'WAITING_FOR_PHONE') {
        let phone = null;
        if (msg.contact && msg.contact.phone_number) {
            phone = msg.contact.phone_number;
            if (!phone.startsWith('+')) phone = '+' + phone;
        } else if (text && /^\+?998\d{9}$/.test(text.replace(/[\s\-]/g, ''))) {
            phone = text;
        }
        if (phone) {
            userPhones[chatId] = phone;
            userStates[chatId] = 'IDLE';
            // Save profile
            const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
            userProfiles[chatId] = {
                name: fullName || msg.from.username || 'Noma\'lum',
                username: msg.from.username || '',
                phone,
                registeredAt: Date.now(),
                status: 'active',
                wasBlocked: false
            };
            bot.sendMessage(chatId, "✅ Xush kelibsiz! FastFood mahsulotlarini ko'rish uchun quyidagi Menyu tugmasini bosing.", getMainMenuKeyboard());
            // Notify admin of new registration
            bot.sendMessage(ADMIN_ID,
                `🆕 Yangi foydalanuvchi ro'yxatdan o'tdi!\n\n` +
                `👤 Ismi: ${userProfiles[chatId].name}\n` +
                `📞 Tel: ${phone}\n` +
                `🆔 ID: ${chatId}\n` +
                `📅 ${formatDate(Date.now())}`
            ).catch(() => {});
        } else {
            bot.sendMessage(chatId, "❌ Noto'g'ri format. Iltimos, raqamni +998 bilan boshlang (Masalan: +998901234567).");
        }
        return;
    }

    // ── Checkout: location ────────────────────────────────────────────────────
    if (userStates[chatId] === 'CHECKOUT_LOCATION') {
        if (msg.location) {
            userStates[chatId] = 'GOT_LOCATION';
            if (!pendingOrders[chatId]) pendingOrders[chatId] = {};
            pendingOrders[chatId].location = msg.location;
            askCheckoutPhone(chatId);
        } else {
            bot.sendMessage(chatId, "Iltimos, quyidagi tugma orqali lokatsiyangizni yuboring.");
        }
        return;
    }

    // ── Checkout: phone ───────────────────────────────────────────────────────
    if (userStates[chatId] === 'CHECKOUT_PHONE') {
        const saved = userPhones[chatId];
        if (text === '❌ Bekor qilish') {
            userStates[chatId] = 'IDLE';
            bot.sendMessage(chatId, "Buyurtma bekor qilindi.", getMainMenuKeyboard());
            return;
        }
        if (text === '📲 Boshqa raqam kiritish') {
            userStates[chatId] = 'CHECKOUT_NEW_PHONE';
            bot.sendMessage(chatId, "Yangi telefon raqamingizni kiriting (+998XXXXXXXXX):", {
                reply_markup: { keyboard: [[{ text: "❌ Bekor qilish" }]], resize_keyboard: true }
            });
            return;
        }
        if (saved && text === `📱 ${saved}`) {
            userStates[chatId] = 'IDLE';
            showOrderConfirmation(chatId);
            return;
        }
        if (/^\+?998\d{9}$/.test(text.replace(/[\s\-]/g, ''))) {
            userPhones[chatId] = text;
            userStates[chatId] = 'IDLE';
            showOrderConfirmation(chatId);
            return;
        }
        bot.sendMessage(chatId, "Iltimos, ro'yxatdagi raqamni tanlang yoki yangi raqam kiriting.");
        return;
    }

    // ── Checkout: new phone ───────────────────────────────────────────────────
    if (userStates[chatId] === 'CHECKOUT_NEW_PHONE') {
        if (text === '❌ Bekor qilish') {
            userStates[chatId] = 'IDLE';
            bot.sendMessage(chatId, "Buyurtma bekor qilindi.", getMainMenuKeyboard());
            return;
        }
        if (/^\+?998\d{9}$/.test(text.replace(/[\s\-]/g, ''))) {
            userPhones[chatId] = text;
            userStates[chatId] = 'IDLE';
            showOrderConfirmation(chatId);
        } else {
            bot.sendMessage(chatId, "❌ Noto'g'ri format. Masalan: +998901234567");
        }
        return;
    }

    // ── Main menu ─────────────────────────────────────────────────────────────
    if (text === '📄 Menyu') {
        bot.sendMessage(chatId, "Quyidagi mahsulotlarni xarid qilishingiz mumkun!", getCategoriesKeyboard())
            .then(() => bot.sendMessage(chatId, "Mahsulotni tanlab bo'lganingizdan so'ng Savat tugmasini bosing"));

    } else if (text === '🛒 Savat') {
        const { lines, total } = buildCartSummary(userCarts[chatId]);
        if (lines.length > 0) {
            bot.sendMessage(chatId,
                `🛒 Savatingiz:\n\n${lines.join('\n')}\n\n💰 Jami: ${fmt(total)} so'm`,
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: "🛍 Xarid qilish" }],
                            [{ text: "📄 Bosh Menyu" }, { text: "🗑 Savatni tozalash" }]
                        ],
                        resize_keyboard: true
                    }
                }
            );
        } else {
            bot.sendMessage(chatId, "Savatingiz bo'sh. Mahsulot qo'shish uchun Menyu bo'limiga o'ting.", getMainMenuKeyboard());
        }

    } else if (text === '🛍 Xarid qilish') {
        const { lines } = buildCartSummary(userCarts[chatId] || {});
        if (!lines.length) { bot.sendMessage(chatId, "Savat bo'sh!", getMainMenuKeyboard()); return; }
        askCheckoutLocation(chatId);

    } else if (text === '📄 Bosh Menyu') {
        bot.sendMessage(chatId, "Bosh menyu:", getMainMenuKeyboard());

    } else if (text === '🗑 Savatni tozalash') {
        userCarts[chatId] = {};
        bot.sendMessage(chatId, "✅ Savat tozalandi.", getMainMenuKeyboard());

    } else if (text === '🏢 Barcha filiallar') {
        const branches = [
            {
                name: "Panorama", hours: "9:00 - 23:00",
                address: "Alisher Navoiy shoh ko'chasi, Labzak (C-13) dahasi, Shayhontohur Tumani, Toshkent",
                orientir: "Webster Universiteti, Panorama", phone: "998881416898",
                lat: 41.319523, lon: 69.273617
            },
            {
                name: "Farxod", hours: "9:00 - 23:00",
                address: "Farhod ko'chasi 18, 100123, Toshkent",
                orientir: "Farxod bozori", phone: "998881416898",
                lat: 41.275525, lon: 69.175402
            }
        ];
        branches.forEach(b => {
            bot.sendMessage(chatId,
                `📍 Filial: ${b.name}\n\n🗺 Manzil: ${b.address}\n\n🏢 Orientir: ${b.orientir}\n\n☎️ Telefon: ${b.phone}\n\n🕙 Ish vaqti: ${b.hours}`
            ).then(() => bot.sendLocation(chatId, b.lat, b.lon));
        });

    } else if (text === '📍 Yaqin filial') {
        bot.sendMessage(chatId, "Manzilingizni quyidagi tugma orqali ulashing", {
            reply_markup: {
                keyboard: [
                    [{ text: "📍 Manzilingizni ulashing", request_location: true }],
                    [{ text: "Bekor qilish" }]
                ],
                resize_keyboard: true, one_time_keyboard: true
            }
        });

    } else if (text === 'Bekor qilish') {
        userStates[chatId] = 'IDLE';
        bot.sendMessage(chatId, "Bekor qilindi.", getMainMenuKeyboard());

    } else if (msg.location && userStates[chatId] !== 'CHECKOUT_LOCATION') {
        bot.sendMessage(chatId, "Manzilingiz qabul qilindi! Eng yaqin filialimiz siz bilan bog'lanadi.", getMainMenuKeyboard());
    }
});

// ─── CALLBACK QUERY ───────────────────────────────────────────────────────────
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    if (!userCarts[chatId]) userCarts[chatId] = {};
    const cart = userCarts[chatId];

    // ── Admin: block user ──────────────────────────────────────────────────
    if (data.startsWith('block_') && isAdmin(chatId)) {
        const uid = data.replace('block_', '');
        if (userProfiles[uid]) {
            userProfiles[uid].status = 'blocked';
            userProfiles[uid].blockedAt = Date.now();
            saveData();
        }
        bot.editMessageReplyMarkup({
            inline_keyboard: [[{ text: `🔓 ${userProfiles[uid]?.phone} — Blokdan ochish`, callback_data: `unblock_${uid}` }]]
        }, { chat_id: chatId, message_id: messageId }).catch(() => {});
        bot.answerCallbackQuery(query.id, { text: `✅ ${uid} bloklandi` });
        bot.sendMessage(uid, `⛔ Siz botdan foydalanish huquqidan mahrum etildingiz.\n\nSavollar uchun: @${ADMIN_USERNAME}`).catch(() => {});
        return;
    }

    // ── Admin: unblock user ────────────────────────────────────────────────
    if (data.startsWith('unblock_') && isAdmin(chatId)) {
        const uid = data.replace('unblock_', '');
        if (userProfiles[uid]) {
            userProfiles[uid].status = 'active';
            userProfiles[uid].wasBlocked = true;
            userProfiles[uid].unblockedAt = Date.now();
            saveData();
        }
        bot.editMessageReplyMarkup({
            inline_keyboard: [[{ text: `🚫 ${userProfiles[uid]?.phone} — Bloklash`, callback_data: `block_${uid}` }]]
        }, { chat_id: chatId, message_id: messageId }).catch(() => {});
        bot.answerCallbackQuery(query.id, { text: `✅ ${uid} blokdan chiqarildi` });
        bot.sendMessage(uid, `✅ Botdan foydalanish huquqingiz tiklandi! /start bosing.`).catch(() => {});
        return;
    }

    // ── Product navigation ─────────────────────────────────────────────────
    if (data.startsWith('cat_')) {
        const catIndex = parseInt(data.replace('cat_', ''), 10);
        bot.editMessageReplyMarkup(getProductsKeyboard(catIndex, cart).reply_markup, {
            chat_id: chatId, message_id: messageId
        }).catch(() => {});

    } else if (data === 'back_cats') {
        bot.editMessageReplyMarkup(getCategoriesKeyboard().reply_markup, {
            chat_id: chatId, message_id: messageId
        }).catch(() => {});

    } else if (data.startsWith('inc_')) {
        const [, prodId, ci] = data.split('_');
        cart[prodId] = (cart[prodId] || 0) + 1;
        bot.editMessageReplyMarkup(getProductsKeyboard(parseInt(ci), cart).reply_markup, {
            chat_id: chatId, message_id: messageId
        }).catch(() => {});

    } else if (data.startsWith('dec_')) {
        const [, prodId, ci] = data.split('_');
        if (cart[prodId] > 0) {
            cart[prodId] -= 1;
            bot.editMessageReplyMarkup(getProductsKeyboard(parseInt(ci), cart).reply_markup, {
                chat_id: chatId, message_id: messageId
            }).catch(() => {});
        } else { bot.answerCallbackQuery(query.id); }

    } else if (data.startsWith('rem_')) {
        const [, prodId, ci] = data.split('_');
        if (cart[prodId] > 0) {
            cart[prodId] = 0;
            bot.editMessageReplyMarkup(getProductsKeyboard(parseInt(ci), cart).reply_markup, {
                chat_id: chatId, message_id: messageId
            }).catch(() => {});
        } else { bot.answerCallbackQuery(query.id); }

    } else if (data === 'ignore') {
        bot.answerCallbackQuery(query.id);

    } else if (data === 'order_confirm_yes') {
        // Build & send order to admin
        const { lines, total } = buildCartSummary(cart);
        const phone = userPhones[chatId] || "Noma'lum";
        const loc = pendingOrders[chatId] && pendingOrders[chatId].location;
        const orderId = orderCounter++;
        const profile = userProfiles[chatId] || {};

        // Save to history as 'pending'
        orderHistory.push({ orderId, userId: chatId, phone, items: lines, total, status: 'pending', createdAt: Date.now() });
        saveData();

        let adminTxt =
            `🆕 YANGI BUYURTMA #${orderId}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 ${profile.name || 'Noma\'lum'}\n` +
            `📞 Tel: ${phone}\n` +
            `🆔 ID: ${chatId}\n\n` +
            `🛍 Mahsulotlar:\n${lines.join('\n')}\n\n` +
            `💰 Jami: ${fmt(total)} so'm`;

        bot.editMessageText("⏳ Buyurtmangiz qabul qilindi! Admin tasdiqlashini kuting...", {
            chat_id: chatId, message_id: messageId
        }).catch(() => {});

        bot.sendMessage(ADMIN_ID, adminTxt, {
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Tasdiqlash", callback_data: `admin_accept_${chatId}_${orderId}` },
                    { text: "❌ Rad etish",  callback_data: `admin_reject_${chatId}_${orderId}` }
                ]]
            }
        }).then(() => { if (loc) bot.sendLocation(ADMIN_ID, loc.latitude, loc.longitude); });

        userCarts[chatId] = {};
        if (pendingOrders[chatId]) pendingOrders[chatId] = {};

    } else if (data === 'order_confirm_no') {
        bot.editMessageText("❌ Buyurtma bekor qilindi.", { chat_id: chatId, message_id: messageId }).catch(() => {});
        bot.sendMessage(chatId, "Asosiy menyu:", getMainMenuKeyboard());

    } else if (data.startsWith('admin_accept_')) {
        const parts = data.split('_');
        const userId = parts[2];
        const orderId = parts[3];

        // Update history
        const order = orderHistory.find(o => String(o.orderId) === String(orderId));
        if (order) { order.status = 'confirmed'; saveData(); }

        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }).catch(() => {});

        bot.sendMessage(userId,
            `🎉 Buyurtmangiz #${orderId} tasdiqlandi!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💳 To'lov tartibi:\n\n` +
            `1️⃣ @${ADMIN_USERNAME} ga yozing — admin karta raqamini beradi\n` +
            `2️⃣ Belgilangan summani kartaga o'tkizing\n` +
            `3️⃣ To'lov chekini (screenshot) adminga yuboring\n\n` +
            `✅ Chek tasdiqlangandan so'ng buyurtmangiz tayyorlanishga boshlanadi!\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🚗 Yetkazib berish:\n` +
            `Buyurtmangiz tayyor bo'lgach, Yandex orqali yetkazib beramiz.\n` +
            `🚖 Dostavka pulini kuryer yonizga kelganida to'g'ridan-to'g'ri kuryerga berasiz.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📲 Admin: @${ADMIN_USERNAME}`
        );

        bot.sendMessage(chatId,
            `✅ Buyurtma #${orderId} tasdiqlandi.\n\n` +
            `👤 Mijoz ID: ${userId}\n` +
            `💬 Mijozga karta raqamingizni yuboring va to'lovni kuting.`
        );

    } else if (data.startsWith('admin_reject_')) {
        const parts = data.split('_');
        const userId = parts[2];
        const orderId = parts[3];

        // Update history
        const order = orderHistory.find(o => String(o.orderId) === String(orderId));
        if (order) { order.status = 'rejected'; saveData(); }

        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }).catch(() => {});

        bot.sendMessage(userId,
            `😔 Afsuski, buyurtmangiz #${orderId} qabul qilinmadi.\n\n` +
            `Iltimos, qaytadan urinib ko'ring yoki qo'shimcha ma'lumot uchun @${ADMIN_USERNAME} bilan bog'laning.`
        );
        bot.sendMessage(chatId, `❌ Buyurtma #${orderId} rad etildi.\nMijozga xabar yuborildi.`);
    }

    bot.answerCallbackQuery(query.id).catch(() => {});
});

console.log('✅ Bot is running...');
