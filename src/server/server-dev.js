
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();
const uuidv4 = require('uuid/v4');// ⇨ '3a017fc5-4f50-4db9-b0ce-4547ba0a1bfd'
const restify = require("restify");
const fs = require('fs');
var express = require('express');
var app = express();
const cors = require('cors');
const server = require('https').createServer({
  cert: fs.readFileSync('/home/rob/keys/node/cert.pem'),
  key: fs.readFileSync('/home/rob/keys/node/key.pem')},app);
const io = require('socket.io')(server);
var recognizeStream;
var corsOptions = {
  origin: '*'
}
app.use(cors(corsOptions));
// app.use(express.static('dist'));
// add Firebase props-- NOT for git
const serviceAccount = require('../../dist/service-account.json');
//TODO  the base name for your firebase project. change below
const fbBucketBase = "workbox-demo-xxxxx";
const _bucket = fbBucketBase + '.appspot.com';
const _dburl = 'https://' + fbBucketBase + '.firebaseio.com';
const admin = require("firebase-admin");
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const myBucket = storage.bucket(_bucket);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: _dburl // https://<BUCKET_NAME>.firebaseio.com
});

// var intoStream = require('into-stream');
var bodyParser = require('body-parser');
var rawParser = bodyParser.raw({type: 'audio/ogg', limit: '1250kb' });
var jsnParser = bodyParser.json({type: 'application/json'});
const db = admin.firestore();

// STT from speech api.finalRslt to DB.media collection
// TODO chg this to store the string {speech filename url}
// JSON body parser
const postRecSpeech = (req, res) => {
  db.collection('media').add(req.body).then(rslt => {
    console.log('DB  combine POST ' +rslt);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.body));
  }).catch(e => {
    console.log(`DB insert  failed: ${e.message}`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.body));
  })
};

// must agree w encoding from 'recorder.min.js'
const config = {
  encoding: 'OGG_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'en-US'
};

const request = {
  config,
  interimResults: true, //Get interim results from stream
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
        startRecognitionStream(this, data);
        console.log('STRMbeg ' + typeof recognizeStream);
    });

    client.on('endGoogleCloudStream', function (data) {
        console.log('STRMend');
        stopRecognitionStream();
    });

    client.on('binaryData', function (data) {
         console.log('data ' + data.length + ' ' +typeof data); //log binary data
        if (recognizeStream !== null) {
          console.log('toSTRM')
            recognizeStream.write(data);
        }
    });

    function startRecognitionStream(client, data) {
        recognizeStream = speechClient.streamingRecognize(request)
            .on('error', console.error)
            .on('data', (data) => {
              //  Dev only logging
                process.stdout.write(
                    (data.results[0] && data.results[0].alternatives[0])
                        ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
                        : `\n\nReached transcription time limit, press Ctrl+C\n`);

                client.emit('speechData', data);
                // if end of utterance, let's restart stream
                // this is a small hack. After 65 seconds of silence, the stream will still throw an error for speech length limit
                if (data.results[0] && data.results[0].isFinal) {
                    // postRecSpeech(data.results[0].alternatives[0].transcript);
                    stopRecognitionStream();
                    //startRecognitionStream(client);
                    // console.log('restarted stream serverside');
                }
            });
    }

    function stopRecognitionStream() {
        if (recognizeStream) {
            recognizeStream.end();
        }
        recognizeStream = null;
    }
});

// raw body parser for ogg file or just pipe the req
const gcsAudio = (req, res) => {
  console.log('onGcsAudio call')
  const type = req.get('Content-Type');
  let gcsname = 'audio/' +uuidv4() + '.opus';
  const files = myBucket.file(gcsname);
  const stream = files.createWriteStream({
    metadata: {
      contentType: type
    },
    resumable: false
  });

 req
   .pipe(stream)
   .on("error", (err) => {
     restify.InternalServerError(err);
   })
   .on('finish', () => {
     res.json({
      success: true,
      fileUrl: `https://storage.googleapis.com/${_bucket}/${gcsname}`,
      gcsName: `${gcsname}`
    })
   });
};

app.get('/index.html', (req, res) => {
    res.sendFile(HTML_FILE)
});

app.post("/media/link", [jsnParser, postRecSpeech]);
app.post("/audio/upload", gcsAudio);
// var url = 'http://localhost:8080/audio';
const PORT = process.env.PORT || 5883

server.listen(PORT, function() {
    console.log('api running http://localhost:' + PORT  +' ' +__dirname);
});
