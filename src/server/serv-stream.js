
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();
// const uuidv4 = require('uuid/v4');// ⇨ '3a017fc5-4f50-4db9-b0ce-4547ba0a1bfd'

var express = require('express');
var app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
var recognizeStream;
// app.use(express.static('dist'));
// var bodyParser = require('body-parser');
// var rawParser = bodyParser.raw({type: 'audio/ogg', limit: '1250kb' });
// var admin = require("firebase-admin");
var serviceAccount = require('../../dist/service-account.json');

var stream = require('stream');
var rs;

// must agree w encoding from 'recorder.min.js'
const config = {
  encoding: 'OGG_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'en-US'
};

const request = {
  config,
  interimResults: true // Get interim results from stream
};
// =========================== SOCKET.IO CLOUD SPEECH PROTO ============== //
io.on('connection', function (client) {
  console.log('Client Connected to server');
  recognizeStream = null;
  client.on('join', function (data) {
    client.emit('messages', 'Socket Connected to Server');
  });

  client.on('messages', function (data) {
    client.emit('broad', data);
  });

  client.on('startGoogleCloudStream', function (data) {
    // startRecognitionStream(this, data);
    console.log('STRMbeg ' + typeof recognizeStream);
    rs = new stream.Readable();
    rs._read = function () {};
    startRecognitionStream(this);
    rs.pipe(recognizeStream);
  });

  client.on('endGoogleCloudStream', function (data) {
    console.log('STRMend');
    // stopRecognitionStream();
    rs.push(null);
    recognizeStream = null;
  });

  client.on('binaryData', function (data) {
    console.log('data ' + data.length + ' ' + typeof data.buffer); // log binary data
    if (recognizeStream !== null) {
      let _bfr = Buffer.from(data.buffer);
      console.log('toSTRM ' + _bfr.length);
      rs.push(_bfr);
    }
  });

  function startRecognitionStream (client, data) {
    recognizeStream = speechClient.streamingRecognize(request)
      .on('error', console.error)
      .on('data', (data) => {
      //  Dev only logging
        process.stdout.write(
          (data.results[0] && data.results[0].alternatives[0])
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : `\n\nReached transcription time limit, press Ctrl+C\n`
        );

        client.emit('speechData', data);
      });
  }
});

// var url = 'http://localhost:8080/audio';
const PORT = process.env.PORT || 5000;

server.listen (PORT, function () {
  console.log('api running http://localhost:' + PORT + ' ' + __dirname);
});
