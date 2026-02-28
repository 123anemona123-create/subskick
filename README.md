# 🎮 Kick → Discord VIP Bot

Bot que verifica suscriptores de Kick y les asigna automáticamente un rol VIP en Discord.

## Comandos

| Comando | Descripción |
|---|---|
| `!verificar <usuario_kick>` | Verifica si sos sub y te da el rol VIP |
| `!revocar @usuario` | (Solo admins) Remueve el rol VIP |
| `!ayuda` | Muestra los comandos disponibles |

---

## ⚙️ Setup paso a paso

### 1. Crear el bot en Discord

1. Ir a https://discord.com/developers/applications
2. Click en **"New Application"** → ponerle un nombre
3. Ir a la sección **"Bot"** → click en **"Add Bot"**
4. En **"Privileged Gateway Intents"** activar:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Copiar el **Token** (lo vas a necesitar)
6. Ir a **"OAuth2 → URL Generator"**:
   - Scopes: `bot`
   - Bot Permissions: `Manage Roles` + `Send Messages` + `Read Messages/View Channels`
7. Copiar la URL generada y abrirla para invitar el bot a tu servidor

### 2. Configurar el rol VIP en Discord

1. En tu servidor → Configuración → Roles
2. Crear un rol llamado **"VIP Subs"** (o el nombre que prefieras)
3. ⚠️ El rol del bot debe estar **por encima** del rol VIP en la jerarquía

### 3. Subir a Railway (gratis)

1. Crear cuenta en https://railway.app
2. Click en **"New Project" → "Deploy from GitHub repo"**
3. Subir estos archivos a un repositorio de GitHub primero
4. Una vez conectado, ir a **"Variables"** y agregar:

```
DISCORD_TOKEN     = tu_token_aqui
KICK_CHANNEL      = nombre_de_tu_canal
VIP_ROLE_NAME     = VIP Subs
VERIFY_CHANNEL_ID = (opcional, ID del canal de verificación)
```

5. Railway desplegará el bot automáticamente ✅

### 4. Subir a GitHub (si no sabés cómo)

```bash
git init
git add .
git commit -m "primer commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/kick-discord-bot.git
git push -u origin main
```

---

## ⚠️ Importante sobre la API de Kick

La API de Kick para verificar suscriptores puede tener limitaciones:
- El endpoint de subs puede requerir autenticación del streamer en el futuro
- Si la API cambia, puede ser necesario actualizar `index.js`
- Kick aún está desarrollando su API pública

---

## 🛟 Soporte

Si el bot no funciona:
1. Verificar que el token de Discord sea correcto
2. Verificar que el nombre del canal en Kick sea exacto
3. Verificar que el rol VIP exista en el servidor
4. Verificar que el bot tenga el rol por encima del VIP en la jerarquía
