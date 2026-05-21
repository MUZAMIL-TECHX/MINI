const express = require('express');
  const router = express.Router();
  const fs = require('fs-extra');
  const path = require('path');
  const pino = require('pino');
  const { delay } = require('@whiskeysockets/baileys');

  const {
      default: makeWASocket,
      useMultiFileAuthState,
      makeCacheableSignalKeyStore,
      Browsers,
      jidNormalizedUser
  } = require('@whiskeysockets/baileys');

  const SESSION_BASE_PATH = './session';

  if (!fs.existsSync(SESSION_BASE_PATH)) {
      fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
  }

  const activeSockets = new Map();

  async function AliRazaPair(number, res) {
      const sanitizedNumber = number.replace(/[^0-9]/g, '');
      const sessionPath = path.join(SESSION_BASE_PATH, 'session_' + sanitizedNumber);

      if (activeSockets.has(sanitizedNumber)) {
          if (!res.headersSent) {
              res.json({ status: 'already_connected', message: 'Number already connected' });
          }
          return;
      }

      fs.ensureDirSync(sessionPath);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const logger = pino({ level: 'fatal' });

      try {
          const socket = makeWASocket({
              auth: {
                  creds: state.creds,
                  keys: makeCacheableSignalKeyStore(state.keys, logger),
              },
              printQRInTerminal: false,
              logger,
              browser: Browsers.ubuntu('Chrome'),
              syncFullHistory: false
          });

          if (!socket.authState.creds.registered) {
              let code;
              let retries = 3;
              while (retries > 0) {
                  try {
                      await delay(1500);
                      code = await socket.requestPairingCode(sanitizedNumber);
                      break;
                  } catch (err) {
                      retries--;
                      console.warn('Pairing retry left:', retries, err.message);
                      if (retries === 0) throw err;
                      await delay(2000);
                  }
              }
              if (!res.headersSent) {
                  res.json({ code });
              }
          }

          socket.ev.on('creds.update', saveCreds);

          socket.ev.on('connection.update', async (update) => {
              const { connection } = update;
              if (connection === 'open') {
                  try {
                      activeSockets.set(sanitizedNumber, socket);
                      await delay(3000);
                      const userJid = jidNormalizedUser(socket.user.id);
                      await socket.sendMessage(userJid, {
                          image: { url: 'https://d.uguu.se/wjdcuJni.jpg' },
                          caption: `👑 *ALI RAZA WHATSAPP BOT* 👑\n\n✅ Bot Successfully Connected!\n📞 Number: ${sanitizedNumber}\n\n🌹 Welcome to Ali Raza Bot!\nType *.menu* to see all commands.\n\n> © Powered by Ali Raza`
                      });
                  } catch (e) {
                      console.error('Connect message error:', e.message);
                  }
              }
              if (connection === 'close') {
                  activeSockets.delete(sanitizedNumber);
              }
          });

      } catch (error) {
          console.error('Pairing error:', error.message);
          if (!res.headersSent) {
              res.status(503).json({ error: 'Pairing failed. Try again.' });
          }
      }
  }

  router.get('/', async (req, res) => {
      const { number } = req.query;
      if (!number) return res.status(400).json({ error: 'number parameter required' });
      await AliRazaPair(number, res);
  });

  module.exports = router;
  