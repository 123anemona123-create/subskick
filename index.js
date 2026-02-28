const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const PREFIX = "!";
const KICK_CHANNEL       = process.env.KICK_CHANNEL;
const KICK_CLIENT_ID     = process.env.KICK_CLIENT_ID;
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const VIP_ROLE_NAME      = process.env.VIP_ROLE_NAME || "VIP Subs";
const VERIFY_CHANNEL_ID  = process.env.VERIFY_CHANNEL_ID;
// ─────────────────────────────────────────────────────────────

// Cache del access token para no pedir uno nuevo en cada verificación
let cachedToken = null;
let tokenExpiry = 0;

// ─── Obtener token de acceso de Kick (Client Credentials) ─────
async function getKickAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const response = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error obteniendo token de Kick: ${err}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// ─── Verificar si un usuario es sub del canal ─────────────────
async function checkKickSubscriber(channelName, username) {
  const token = await getKickAccessToken();

  // Buscar el ID del canal
  const channelRes = await fetch(
    `https://api.kick.com/v1/channels?broadcaster_username=${channelName}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!channelRes.ok) throw new Error("No se pudo obtener info del canal");
  const channelData = await channelRes.json();
  const channelId = channelData?.data?.[0]?.broadcaster_user_id;
  if (!channelId) throw new Error("Canal no encontrado en Kick");

  // Verificar si el usuario es sub
  const subRes = await fetch(
    `https://api.kick.com/v1/channels/${channelId}/subscribers?username=${username}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (subRes.status === 404) return false;
  if (!subRes.ok) throw new Error("Error consultando suscriptores");

  const subData = await subRes.json();
  return subData?.data?.length > 0;
}

// ─── Bot de Discord ───────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (VERIFY_CHANNEL_ID && message.channelId !== VERIFY_CHANNEL_ID) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ── !verificar <usuario_kick> ──────────────────────────────
  if (command === "verificar") {
    const kickUsername = args[0];

    if (!kickUsername) {
      return message.reply("❌ Usá el comando así: `!verificar tu_usuario_de_kick`");
    }

    const member = message.member;
    const vipRole = message.guild.roles.cache.find((r) => r.name === VIP_ROLE_NAME);

    if (!vipRole) {
      return message.reply(`❌ No encontré el rol **${VIP_ROLE_NAME}** en el servidor.`);
    }

    if (member.roles.cache.has(vipRole.id)) {
      return message.reply("✅ Ya tenés el rol VIP asignado!");
    }

    const loadingMsg = await message.reply(
      `🔍 Verificando si **${kickUsername}** es sub de **${KICK_CHANNEL}**...`
    );

    try {
      const isSub = await checkKickSubscriber(KICK_CHANNEL, kickUsername);

      if (isSub) {
        await member.roles.add(vipRole);

        const embed = new EmbedBuilder()
          .setColor(0x53fc18)
          .setTitle("✅ ¡Verificación exitosa!")
          .setDescription(`Bienvenido/a al VIP, **${message.author.username}**! 🎉`)
          .addFields(
            { name: "Usuario de Kick", value: kickUsername, inline: true },
            { name: "Rol asignado",    value: VIP_ROLE_NAME, inline: true }
          )
          .setFooter({ text: "Gracias por suscribirte al canal!" })
          .setTimestamp();

        await loadingMsg.edit({ content: "", embeds: [embed] });
      } else {
        await loadingMsg.edit(
          `❌ No encontré una suscripción activa de **${kickUsername}** en **${KICK_CHANNEL}**.\n\n` +
          `Asegurate de que:\n` +
          `• El nombre de usuario sea correcto\n` +
          `• Tu sub esté activa\n` +
          `• Si recién te suscribiste, esperá unos minutos e intentá de nuevo`
        );
      }
    } catch (error) {
      console.error("Error verificando sub:", error);
      await loadingMsg.edit(`⚠️ Error al verificar: ${error.message}`);
    }
  }

  // ── !revocar @usuario (solo admins) ───────────────────────
  if (command === "revocar") {
    if (!message.member.permissions.has("ManageRoles")) {
      return message.reply("❌ No tenés permisos para usar este comando.");
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply("❌ Mencioná al usuario: `!revocar @usuario`");

    const vipRole = message.guild.roles.cache.find((r) => r.name === VIP_ROLE_NAME);
    if (target.roles.cache.has(vipRole?.id)) {
      await target.roles.remove(vipRole);
      message.reply(`✅ Rol VIP removido de **${target.user.username}**`);
    } else {
      message.reply(`⚠️ **${target.user.username}** no tiene el rol VIP`);
    }
  }

  // ── !ayuda ─────────────────────────────────────────────────
  if (command === "ayuda") {
    const embed = new EmbedBuilder()
      .setColor(0x53fc18)
      .setTitle("📋 Comandos del bot")
      .addFields(
        { name: "`!verificar <usuario_kick>`", value: "Verifica tu sub y obtén el rol VIP" },
        { name: "`!ayuda`",                    value: "Muestra este mensaje" }
      );
    message.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
