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
const KICK_CHANNEL = process.env.KICK_CHANNEL; // tu nombre de canal en Kick
const VIP_ROLE_NAME = process.env.VIP_ROLE_NAME || "VIP Subs"; // nombre del rol en Discord
const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL_ID; // ID del canal donde se verifica (opcional)
// ─────────────────────────────────────────────────────────────

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // Si hay canal de verificación configurado, solo responder ahí
  if (VERIFY_CHANNEL_ID && message.channelId !== VERIFY_CHANNEL_ID) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ── Comando: !verificar <usuario_de_kick> ──────────────────
  if (command === "verificar") {
    const kickUsername = args[0];

    if (!kickUsername) {
      return message.reply(
        "❌ Usá el comando así: `!verificar tu_usuario_de_kick`"
      );
    }

    // Evitar que alguien se verifique dos veces
    const member = message.member;
    const vipRole = message.guild.roles.cache.find(
      (r) => r.name === VIP_ROLE_NAME
    );

    if (!vipRole) {
      return message.reply(
        `❌ No encontré el rol **${VIP_ROLE_NAME}** en el servidor. Avisale al admin.`
      );
    }

    if (member.roles.cache.has(vipRole.id)) {
      return message.reply("✅ Ya tenés el rol VIP asignado!");
    }

    // Verificar en la API de Kick
    const loadingMsg = await message.reply(
      `🔍 Verificando si **${kickUsername}** es sub de **${KICK_CHANNEL}**...`
    );

    try {
      const isSub = await checkKickSubscriber(KICK_CHANNEL, kickUsername);

      if (isSub) {
        await member.roles.add(vipRole);

        const embed = new EmbedBuilder()
          .setColor(0x53fc18) // verde Kick
          .setTitle("✅ ¡Verificación exitosa!")
          .setDescription(
            `Bienvenido/a al VIP, **${message.author.username}**! 🎉`
          )
          .addFields(
            { name: "Usuario de Kick", value: kickUsername, inline: true },
            { name: "Rol asignado", value: VIP_ROLE_NAME, inline: true }
          )
          .setFooter({ text: "Gracias por suscribirte al canal!" })
          .setTimestamp();

        await loadingMsg.edit({ content: "", embeds: [embed] });
      } else {
        await loadingMsg.edit(
          `❌ No encontré una suscripción activa de **${kickUsername}** en el canal **${KICK_CHANNEL}**.\n\n` +
            `Asegurate de que:\n` +
            `• El nombre de usuario sea correcto (sensible a mayúsculas)\n` +
            `• Tu sub esté activa\n` +
            `• Si recién te suscribiste, esperá unos minutos e intentá de nuevo`
        );
      }
    } catch (error) {
      console.error("Error verificando sub:", error);
      await loadingMsg.edit(
        "⚠️ Hubo un error al consultar la API de Kick. Intentá en unos minutos."
      );
    }
  }

  // ── Comando: !revocar (admin only) ────────────────────────
  if (command === "revocar") {
    if (!member.permissions.has("ManageRoles")) {
      return message.reply("❌ No tenés permisos para usar este comando.");
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply("❌ Mencioná al usuario: `!revocar @usuario`");

    const vipRole = message.guild.roles.cache.find(
      (r) => r.name === VIP_ROLE_NAME
    );
    if (target.roles.cache.has(vipRole?.id)) {
      await target.roles.remove(vipRole);
      message.reply(`✅ Rol VIP removido de **${target.user.username}**`);
    } else {
      message.reply(`⚠️ **${target.user.username}** no tiene el rol VIP`);
    }
  }

  // ── Comando: !ayuda ────────────────────────────────────────
  if (command === "ayuda") {
    const embed = new EmbedBuilder()
      .setColor(0x53fc18)
      .setTitle("📋 Comandos del bot")
      .addFields(
        {
          name: "`!verificar <usuario_kick>`",
          value: "Verifica tu sub y obtén el rol VIP",
        },
        {
          name: "`!ayuda`",
          value: "Muestra este mensaje",
        }
      );
    message.reply({ embeds: [embed] });
  }
});

// ─── Función para consultar la API de Kick ─────────────────────
async function checkKickSubscriber(channel, username) {
  // Kick tiene endpoints públicos pero con limitaciones.
  // Esta función intenta verificar de dos formas:

  try {
    // Método 1: Consultar el perfil del usuario y ver si es sub del canal
    const response = await fetch(
      `https://kick.com/api/v2/channels/${channel}/subscribers/${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }
    );

    if (response.status === 200) return true;
    if (response.status === 404) return false;

    // Método 2 (fallback): Verificar el perfil del usuario
    const profileResponse = await fetch(
      `https://kick.com/api/v2/channels/${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }
    );

    if (!profileResponse.ok) return false;

    const data = await profileResponse.json();
    // Verificar si el usuario existe al menos
    return !!data?.id;
  } catch (err) {
    throw new Error(`Error en la API de Kick: ${err.message}`);
  }
}

client.login(process.env.DISCORD_TOKEN);
