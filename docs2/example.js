import io from 'socket.io-client';
import {MDCRipple} from '@material/ripple/index';
const ripple = new MDCRipple(document.querySelector('.rrbutton'));
ripple.unbounded = true;
// import "../button.css"
// import "@material/icon-button/mdc-icon-button";

// Non-standard options review urls for webpack dev server
const workerOptions = {
  OggOpusEncoderWasmPath: 'https://localhost:9000/OggOpusEncoder.wasm',
  WebMOpusEncoderWasmPath: 'https://localhost:9000/WebMOpusEncoder.wasm'
};

// Polyfill MediaRecorder
window.MediaRecorder = OpusMediaRecorder;

// Recorder object
let recorder;
// Buttons
let buttonCreate = document.querySelector('#buttonCreate');
let buttonStart = document.querySelector('#buttonStart');
//let buttonPause = document.querySelector('#buttonPause');
//let buttonResume = document.querySelector('#buttonResume');
//let buttonStop = document.querySelector('#buttonStop');
//let buttonStopTracks = document.querySelector('#buttonStopTracks'); // For debugging purpose
// User-selectable option
let mimeSelect = document.querySelector('#mimeSelect');
let butText = document.querySelector('#butText');
// let defaultMime = document.querySelector('#defaultMime');
let mimeSelectValue = 'audio/ogg';
// mimeSelect.onchange = (e) => { mimeSelectValue = e.target.value; };
// let timeSlice = document.querySelector('#timeSlice');
// Player
let player = document.querySelector('#player');
let link = document.querySelector('#link');
// Sticky divs
let status = document.querySelector('#status');
// url where npm 'sttdev' is running . this is the express process
const socket = io('https://localhost:5883');
let streamStreaming = false;
let fbname;

// This creates a MediaRecorder object
// context obj for webaudio api in response to a click
buttonCreate.onclick = () => {
  navigator.mediaDevices.getUserMedia({  audio: {
  	sampleRate: 16000,
    sampleSize: 16,
    channelCount: 1
  }, video: false})
    .then((stream) => {
      if (recorder && recorder.state !== 'inactive') {
        console.log('Stop the recorder first');
        throw new Error('Stop the recorder first');
      }
      return stream;
    })
    .then(createMediaRecorder)
    .catch(e => {
      console.log(`MediaRecorder is failed: ${e.message}`);
      Promise.reject(new Error());
    })
    .then(printStreamInfo) // Just for debugging purpose.
    .then(_ => console.log('Creating MediaRecorder is successful.'))
    .then(initButtons)
    .then(updateButtonState);
};
//retrn new mediarecorder and then call stream on interval
//  call stream on it and pipe that to the back end
function createMediaRecorder (stream) {
  // Create recorder object
  let options = { mimeType: mimeSelectValue };
  recorder = new MediaRecorder(stream, options, workerOptions);
  let dataChunks = [];
  // Recorder Event Handlers
  recorder.onstart = _ => {
    dataChunks = [];
    socket.emit('startGoogleCloudStream', ''); // init socket
    streamStreaming = true;
    console.log('Recorder started');
    updateButtonState();
  };
  recorder.ondataavailable = (e) => {
    console.log('Recorder ONdata ' + e.data.size);
    var newcp = e.data.slice(0);
    dataChunks.push(newcp);
    socket.emit('binaryData', (e.data) ); // data.arrayBuffer()
  //  updateButtonState();
  };
  recorder.onstop = (e) => {
    // When stopped add a link to the player and the download link
    let blob = new Blob(dataChunks, {'type': recorder.mimeType});
    dataChunks = [];
    let audioURL = URL.createObjectURL(blob);
    // fireBase upld audio/ogg fm Recorder
    var upldUrl = '//localhost:5883/audio/upload';
    var type = 'audio/ogg';
    audioUpld(upldUrl, blob, type).then(filLink =>{
      console.log('downld audio ' + filLink);
    }).catch(err => {
       alert('file to Firebse : ' +err.message)
     }
    );

    player.src = audioURL;
    link.href = audioURL;
    let extension = recorder.mimeType.match(/ogg/) ? '.ogg'
                  : recorder.mimeType.match(/webm/) ? '.webm'
                  : recorder.mimeType.match(/wav/) ? '.wav'
                  : '';
  //  link.download = 'recording' + extension;
    setTimeout(function () {
      socket.emit('endGoogleCloudStream', '');
      streamStreaming = false;
    }, 2500);
    console.log('Recorder stopped');
    updateButtonState();
  };
  //recorder.onpause = _ => console.log('Recorder paused');
  //recorder.onresume = _ => console.log('Recorder resumed');
  recorder.onerror = e => console.log('Recorder encounters error:' + e.message);
  return stream;
};

function initButtons () {
    buttonStart.onclick = _ => handleRec(recorder.state, 1000);
//  buttonStart.onclick = _ => recorder.start(timeSlice.value);
//  buttonPause.onclick = _ => recorder.pause();
//  buttonResume.onclick = _ => recorder.resume();
//  buttonStop.onclick = _ => recorder.stop();
//  buttonStopTracks.onclick = _ => {
    // stop all tracks (this will delete a mic icon from a browser tab
  //  recorder.stream.getTracks().forEach(i => i.stop());
  //  console.log('Tracks (stream) stopped. click \'Create\' button to capture stream.');
//  };
}

function upddblink(name, speechtxt) {
    var url = '//localhost:5883/media/link';
    var mbdy = {speechText: speechtxt, name: name }
    return fetch(url, { // Your POST endpoint
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      //  'Content-Length': blob.size,
      //  'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(mbdy)
    }).then(
      response => response.json()
      .then( message => {
        console.log('uploadLNK ' + JSON.stringify(message))
      })
    )
}

// fireBase upld audio/ogg fm Recorder
// https localhost 5000 'audio/upload' type='audio/ogg'
function audioUpld(url, blob, mime) {
   var type = blob.type === undefined ? mime : blob.type;
  return fetch(url, { // Your POST endpoint
    method: 'POST',
  //   mode: 'no-cors',
    headers: {
      'Accept': 'audio/ogg',
      'Content-Type': type
    //  'Content-Length': blob.size,
    //  'Access-Control-Allow-Origin': '*'
    },
    body: blob // This is the content of your file
  }).then(
    response => response.json()
    .then( message => {
      fbname = message.gcsName;
      console.log('uploadAUD ' + JSON.stringify(message))
    })
  )
}

// Check platform
window.addEventListener('load', function checkPlatform () {
  // Check compatibility
  if (OpusMediaRecorder === undefined) {
    console.error('No OpusMediaRecorder found');
  } else {
    // Check available content types
    let contentTypes = [
      'audio/wave',
      'audio/wav',
      'audio/ogg',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/webm;codecs=opus'
    ];
    contentTypes.forEach(type => {
      console.log(type + ' is ' +
        (MediaRecorder.isTypeSupported(type)
          ? 'supported' : 'NOT supported'));
    });
  }

  // Check default MIME audio format for the client's platform
  // To do this, create captureStream() polyfill.
  function getStream (mediaElement) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const source = context.createMediaElementSource(mediaElement);
    const destination = context.createMediaStreamDestination();

    source.connect(destination);
    source.connect(context.destination);

    return destination.stream;
  }

  // When creating MediaRecorder object without mimeType option, the API will
  //  decide the default MIME Type depending on the browser running.
  let tmpRec = new MediaRecorder(
    getStream(new Audio('https://kbumsik.io/opus-media-recorder/sample.mp3')),
    {}, workerOptions);
  // defaultMime.innerHTML = `audio/ogg`;
}, false);
// inactive or recording
// = _ => recorder.start(timeSlice.value);
function handleRec (state, interval) {
  console.log('HNDL ' + state)
  switch (state) {
    case 'inactive':
      recorder.start(interval);
      document.getElementById("lbl1").innerHTML = "STOP";
  //    butText.innerHTML = 'STOP'
      break;
    case 'recording':
      recorder.stop();
      break;
      default:
      break;
    }
  }

// Update state of buttons when any buttons clicked
function updateButtonState () {
  console.log('ST ' + recorder.state)
  switch (recorder.state) {
    case 'inactive':
      buttonCreate.disabled = false;
      buttonStart.disabled = false;
  //    buttonPause.disabled = true;
  //    buttonResume.disabled = true;
  //    buttonStop.disabled = true;
  //    buttonStopTracks.disabled = false; // For debugging purpose
      status.innerHTML =
        link.href ? 'Recording complete. You can play or download the recording below.'
                  : 'Stream created. Click "start" button to start recording.';
      break;
    case 'recording':
      buttonCreate.disabled = true;
      buttonStart.disabled = false;
//      buttonPause.disabled = false;
//      buttonResume.disabled = false;
//      buttonStop.disabled = false;
//      buttonStopTracks.disabled = false; // For debugging purpose
      status.innerHTML = 'Recording. Click "stop" button to play recording.';
      break;
    default:
      // Maybe recorder is not initialized yet so just ingnore it.
      break;
  }
}


/*******************************************************************************
 * Debug helpers
 *    This section is only for debugging purpose, library users don't need them.
 ******************************************************************************/
// Monkey-patching console.log for debugging.
document.addEventListener('DOMContentLoaded', (e) => {
  let lineCount = 0;

  function overrideConsole (oldFunction, divLog) {
    return function (text) {
      oldFunction(text);
      lineCount += 1;
      if (lineCount > 100) {
        let str = divLog.innerHTML;
        divLog.innerHTML = str.substring(str.indexOf('<br>') + '<br>'.length);
      }
      divLog.innerHTML += text + '<br>';
    };
  };

  console.log = overrideConsole(console.log.bind(console), document.getElementById('errorLog'));
  console.error = overrideConsole(console.error.bind(console), document.getElementById('errorLog'));
  console.debug = overrideConsole(console.debug.bind(console), document.getElementById('errorLog'));
  console.info = overrideConsole(console.info.bind(console), document.getElementById('errorLog'));
}, false);

// Print any error
window.onerror = (msg, url, lineNo, columnNo, error) => {
  let substring = 'script error';
  if (msg.toLowerCase().indexOf(substring) > -1) {
    console.log('Script Error: See Browser Console for Detail');
  } else {
    let message = [
      'Message: ' + msg,
      'URL: ' + url,
      'Line: ' + lineNo,
      'Column: ' + columnNo,
      'Error object: ' + JSON.stringify(error)
    ].join(' - ');

    console.log(message);
  }
  return false;
};

// print stream information (for debugging)
function printStreamInfo (stream) {
  for (const track of stream.getAudioTracks()) {
    console.log('Track Information:');
    for (const key in track) {
      if (typeof track[key] !== 'function') {
        console.log(`\t${key}: ${track[key]}`);
      }
    }
    console.log('Track Settings:');
    let settings = track.getSettings();
    for (const key in settings) {
      if (typeof settings[key] !== 'function') {
        console.log(`\t${key}: ${settings[key]}`);
      }
    }
  }
}
/*******************************************************************************
 * End of debug helpers
 ******************************************************************************/
 // ================= SOCKET IO =================
socket.on('connect', function (data) {
  socket.emit('join', 'Server Connected to Client');
});

socket.on('messages', function (data) {
  console.log(data);
});

socket.on('speechData', function (data) {
  // console.log(data.results[0].alternatives[0].transcript);
  // var resultText = document.getElementById('bubblsp');
  var resultText;
  var dataFinal = undefined || data.results[0].isFinal;
  // set UI , set speech thats post'd to parse
  if (dataFinal === false) {
    resultText = data.results[0].alternatives[0].transcript;
    console.log('txtINT ' + resultText);
    // ffmAudSpeech = data.results[0].alternatives[0].transcript
  } else {
    resultText = data.results[0].alternatives[0].transcript;
    console.log(resultText);
    // ffmAudSpeech = data.results[0].alternatives[0].transcript
    console.log("Google Speech sent 'final' Sentence.");
    socket.close();
    upddblink(fbname, resultText);
  }
});

window.onbeforeunload = function () {
   if (streamStreaming) { socket.emit('endGoogleCloudStream', ''); }
 };
