const express = require('express');
  const app = express();
  const port = process.env.PORT || 8000;
  const bodyParser = require('body-parser');
  const cors = require('cors');
  const path = require('path');

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // New working pairing route (Arslan-style, file-based sessions)
  const pairRouter = require('./pair');
  app.use('/code', pairRouter);

  // Serve the pairing page
  app.get('/pair', (req, res) => {
      res.sendFile(path.join(__dirname, 'pair.html'));
  });
  app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'pair.html'));
  });

  // Load full bot functionality (inconnu.js)
  const botRouter = require('./inconnu');
  app.use('/', botRouter);

  app.listen(port, () => {
      console.log('👑 ALI RAZA BOT running on port ' + port);
  });

  module.exports = app;
  