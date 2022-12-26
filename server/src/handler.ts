import wrtc from 'wrtc'
import {v4} from 'uuid'
import sdpTransform from 'sdp-transform'

console.log(wrtc)

import {endpoint} from "./Endpoint";

/**
 * id, pc, offer, answer
 */
module.exports.handleWhip = async function (req, res, next){
    if (!req.sdp){
        return res.status(400).end()
    }
    const offer = new wrtc.RTCSessionDescription({
        type: 'offer',
        sdp: req.sdp
    })
    const pc = new wrtc.RTCPeerConnection()
    let answerObj = null
    let candidates = {}
    const candidateDone = new Promise((res)=>{
        pc.onicecandidate = (evt)=>{
            // console.log('onicecandidate', evt.candidate)
            if (evt.candidate){
                if (!candidates[evt.candidate.sdpMid]){
                    candidates[evt.candidate.sdpMid] = []
                }
                candidates[evt.candidate.sdpMid].push(evt.candidate)
            } else {
                answerObj.media.forEach((media, index)=>{
                    if (candidates[index]){
                        media.candidates = candidates[index].map((candidate)=>{
                            const item = {
                                foundation: parseInt(candidate.foundation),
                                component: 1,
                                transport: candidate.protocol,
                                priority: candidate.priority,
                                ip: candidate.address,
                                port: candidate.port,
                                type: candidate.type
                            }
                            return item
                        })
                    }
                })
                res(null)
            }
        }
    })
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    answerObj = sdpTransform.parse(answer.sdp)
    await pc.setLocalDescription(answer)
    await candidateDone
    const channelId = req.query.channelId || v4()
    const channel = endpoint.getChannel(channelId)
    const locationId = channel.setSender(pc)
    const location = `https://localhost.wrtc.dev:8765/whip/${locationId}`
    res.header('location', location).end(sdpTransform.write(answerObj))
}

