import fs from 'fs'
import https from 'https'
import express from 'express'
import os from 'os'
import path from 'path'
import bodyParser from "body-parser";
import {handleWhip, handleWhep} from './handler'
import cors from 'cors'
import {registerLocalIps} from 'badcert-register'

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

registerLocalIps().then((keyAndCert)=>{
    https.createServer(keyAndCert, app).listen(keyAndCert.port, () => {
        console.log(`Send: https://${keyAndCert.domain}:${keyAndCert.port}/client/send.html`)
        console.log(`Recv: https://${keyAndCert.domain}:${keyAndCert.port}/client/recv.html`)
    })
})
