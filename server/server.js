const fs = require('fs');
const https = require('https');
const express = require('express')
const os = require('os')
const path = require('path')
const bodyParser = require('body-parser')

const {handleWhip} = require("./handlers");

var privateKey  = fs.readFileSync(path.join(os.homedir(), '.badcert', '127.0.0.1', 'key.pem'), 'utf8');
var certificate = fs.readFileSync(path.join(os.homedir(), '.badcert', '127.0.0.1', 'cert.pem'), 'utf8');
var credentials = {key: privateKey, cert: certificate};


const app = express()

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

app.use('/client', express.static(path.join(__dirname, '../client')))

app.get('/hello', (req, res, next)=>{
    res.send('hello')
})

app.post('/whip', handleWhip)

var httpsServer = https.createServer(credentials, app);
const PORT = 8765
httpsServer.listen(PORT, ()=>{
    console.log(`https://localhost.wrtc.dev:${PORT}/client/send.html`)
});
