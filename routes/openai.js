const express = require('express');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const upload = multer({dest: 'uploads/'});
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const {Configuration, OpenAIApi}= require('openai');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const say = require('say');
const util = require('util');
const exec = util.promisify(require('child_process').exec); 

const path = require('path');
const dotenv = require('dotenv');
const child_process = require('child_process');
dotenv.config();
function convertToWav(inputPath, outputPath){
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
}


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

let SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-JacobNeural ">
  <mstts:viseme type="FacialExpression"/>
  __TEXT__
</voice>
</speak>`;

module.exports=(io) =>{
    // console.log("here and the key is ", process.env.OPENAI_API_KEY)
    router.post('/transcribe', upload.single('audio') ,async(req, res)=>{
        const audioFile = req.file;
        
        if (!audioFile) {
            console.error('No audio data provided');
            return res.status(400).json({ error: 'No audio data provided' });
        }
        const wavPath =audioFile.path + '.wav';
        try{
            await convertToWav(audioFile.path, wavPath);
        }catch(err){
            console.error('Error converting file to wav:', error);
        return res.status(500).json({ error: 'Error converting file to wav' });
        }
        const openai = new OpenAIApi(configuration);
        
            const response = await openai.createTranscription(
                fs.createReadStream(wavPath),
                "whisper-1",
            )
            // console.log('Reached here');
            
            const transcription = response.data.text;
            const gpt3Response = await openai.createCompletion({
                model: "text-davinci-003", 
                prompt: transcription,
                temperature: 0,
                max_tokens:256,
            })
            const answer = gpt3Response.data.choices[0].text.trim();
            console.log(answer);
            let ssml = SSML.replace("__TEXT__", answer);
            try {
               const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_KEY, process.env.AZURE_REGION);
               let audioFileName = 'output.wav';
               const writable = fs.createWriteStream(audioFileName);
               const pullStream = sdk.AudioOutputStream.createPullStream();
               pullStream.read = (buffer)=>{
                return writable.write(new Uint8Array(buffer.slice(0)));
               }
               const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFileName);
               speechConfig.speechSynthesisVoiceName = "en-US-JacobNeural ";
               var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
                let visemeData = [];

                synthesizer.visemeReceived= (s, e)=>{
                    // console.log('e', e)
                    visemeData.push({
                        audioOffset: e.audioOffset / 10000000,
                        visemeId: e.visemeId,
                    });
                }

                await new Promise((resolve, reject) => {
                    synthesizer.speakSsmlAsync(ssml,
                        result => {
                            synthesizer.close();
                            if (result) {
                                console.log('TTS operation succeeded:', result);
                                let rhubarbLikeOutput = {
                                    "mouthCues": [],
                                };
                                for (let i = 0; i < visemeData.length; i++) {
                                    let start = visemeData[i].audioOffset;
                                    let end = (i < visemeData.length - 1) ? visemeData[i + 1].audioOffset : undefined;
                                    let value = visemeData[i].visemeId.toString();  // Convert visemeId to string
                            
                                    rhubarbLikeOutput.mouthCues.push({ "start": start, "end": end, "value": value });
                                }
                                fs.writeFileSync('output.json', JSON.stringify(rhubarbLikeOutput));

                                resolve();
                            } else {
                                reject(new Error('TTS operation failed with no result'));
                            }
                        },
                        error => {
                            console.log('TTS operation failed with error:', error);
                            synthesizer.close();
                            reject(error);
                        }
                    );
                });
                writable.end();   // Wait for the file to be written before sending it
                writable.on('finish',async function () {
                  
                        // Read and send audio and lip-sync data
                        fs.readFile(path.join(__dirname, '..', 'output.wav'), (err, data) => {
                            if (err) {
                                console.error('Error reading wav file:', err);
                                res.status(500).send('Error reading wav file');
                            } else {
                                const audioData = Array.from(data);  // convert the data to an array of numbers
                                fs.readFile('output.json', 'utf8', (err, jsonData) => {
                                    if (err) {
                                        console.error('Error reading json file:', err);
                                        res.status(500).send('Error reading json file');
                                    } else {
                                        const responseData = { audioData, lipSyncData: JSON.parse(jsonData) };
                                        io.emit('responseData', responseData);
                                        console.log(responseData);
                                        res.status(200).send('Transcription, speech, and lip-sync completed successfully');
                                    }
                                });
                            }
                        });
                    
                });
            } catch (error) {
                console.error('Error in transcribe route:', error);
                res.status(500).send('Error in transcribe route');
            }
        });
    
        return router;
    };