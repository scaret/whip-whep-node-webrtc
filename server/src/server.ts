import fs from 'fs'
import https from 'https'
import express from 'express'
import os from 'os'
import path from 'path'
import bodyParser from "body-parser";
import {handleWhip, handleWhep} from './handler'
import cors from 'cors'

var privateKey  = fs.readFileSync(path.join(os.homedir(), '.badcert', '127.0.0.1', 'key.pem'), 'utf8');
var certificate = fs.readFileSync(path.join(os.homedir(), '.badcert', '127.0.0.1', 'cert.pem'), 'utf8');
var credentials = {key: privateKey, cert: certificate};


const app = express()

app.use((req, res, next)=>{
    res.header('Access-Control-Allow-Private-Network', 'true')
    next()
})
app.use(cors({
    exposedHeaders: 'Location, Link'
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use((req, res, next)=>{
    if (req.headers['content-type']?.indexOf('application/sdp') > -1){
        req.sdp = ''
        req.on('data', (data)=>{
            req.sdp += data
        })
        req.on('end', next)
    } else {
        next()
    }
})

app.use('/client', express.static(path.join(__dirname, '../../client')))

app.get('/hello', (req, res, next)=>{
    res.send('hello')
})

app.post('/whip', handleWhip)
app.post('/whep', handleWhep)

var httpsServer = https.createServer(credentials, app);
const PORT = 8765
    console.log(`https://localhost.wrtc.dev:${PORT}/client/send.html`)
httpsServer.listen(PORT, '0.0.0.0', ()=>{
});
