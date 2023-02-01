import wrtc from 'wrtc'
import {v4} from 'uuid'
import sdpTransform from 'sdp-transform'

console.log(wrtc)

import {endpoint} from "./Endpoint";
import {PeerConnectionAgent} from "./PeerConnectionAgent";

const dummpAudioTracks = []
const dummyVideoTracks = []
for (let i = 0; i < 100; i++){
    dummpAudioTracks.push(new wrtc.nonstandard.RTCAudioSource().createTrack())
    dummyVideoTracks.push(new wrtc.nonstandard.RTCVideoSource().createTrack())
}

/**
 * id, pc, offer, answer
 */
export async function handleWhip(req, res, next){
    if (!req.sdp){
        return res.status(400).end()
    }
    const offer = new wrtc.RTCSessionDescription({
        type: 'offer',
        sdp: req.sdp
    })
    const pcAgent = new PeerConnectionAgent('UPSTREAM', new wrtc.RTCPeerConnection())
    // pcAgent.pc.ondatachannel = (evt: RTCDataChannelEvent)=>{
    //     console.log(`ondatachannel`, evt.channel.label)
    //     pc.dataChannels.push(evt.channel)
    // }
    await pcAgent.pc.setRemoteDescription(offer)
    await pcAgent.createAnswerObj()
    pcAgent.pc.setLocalDescription(pcAgent.answer.sessionDescription)
    await pcAgent.waitForCandidateDone()
    // const videoSink = new wrtc.nonstandard.RTCVideoSink(videoTrack)
    // videoSink.addEventListener('frame', (data)=>{
    //     console.log(`frame ${data.frame.width} ${data.frame.height}`)
    // })
    const channelId = req.query.channelId || v4()
    const channel = endpoint.getChannel(channelId)
    const locationId = channel.setSender(pcAgent)
    const location = `${req.get('origin')}/whip/${locationId}`
    res.status(201).header('Location', location).end(sdpTransform.write(pcAgent.answer.obj))
}

/**
 * id, pc, offer, answer
 */
export async function handleWhep(req, res, next){
    if (!req.sdp){
        return res.status(400).end()
    }
    const offer = new wrtc.RTCSessionDescription({
        type: 'offer',
        sdp: req.sdp
    })
    const pcAgent = new PeerConnectionAgent('DOWNSTREAM', new wrtc.RTCPeerConnection())
    const matches = req.sdp.match(/\r\nm=([a-z]+) /g)
    if (matches){
        for (let i = 0; i < matches.length; i++){
            const kind = matches[i].substring(4, 9)
            console.log(`kind ${i} ${kind}`)
            if (kind === 'audio'){
                pcAgent.pc.addTrack(dummpAudioTracks[i])
            } else if (kind === 'video'){
                pcAgent.pc.addTrack(dummyVideoTracks[i])
            } else {
                console.error(`Unrecognized m line ${matches[i]}`)
            }
        }
    } else{
        console.error(`mLine error`, matches)
    }
    await pcAgent.pc.setRemoteDescription(offer)
    await pcAgent.createAnswerObj()
    pcAgent.pc.setLocalDescription(pcAgent.answer.sessionDescription)
    await pcAgent.waitForCandidateDone()
    const channelId = req.query.channelId || v4()
    const channel = endpoint.getChannel(channelId)
    const locationId = channel.setReceiver(pcAgent)
    const location = `${req.get('origin')}/whep/${locationId}`
    res.status(201).header('Location', location).end(sdpTransform.write(pcAgent.answer.obj))
}

