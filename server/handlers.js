const wrtc = require('wrtc')
const {uuid} = require('uuidv4')
const sdpTransform = require('sdp-transform')

console.log(wrtc)

let cnt = 0
const pcs = []
/**
 * id, pc, offer, answer
 */
module.exports.handleWhip = async function (req, res, next){
    console.log(`handleWhip`, req.sdp)
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
                res()
            }
        }
    })
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    answerObj = sdpTransform.parse(answer.sdp)
    await pc.setLocalDescription(answer)
    await candidateDone
    const locationId = uuid()
    const location = `https://localhost.wrtc.dev:8765/whip/${locationId}`
    res.header('location', location).end(sdpTransform.write(answerObj))
    const item = {
        id: cnt++,
        pc,
        locationId,
        offer: offer,
        answer: answer,
    }
    pcs.push(item)
    console.log(`UP #${item.id} ${locationId}`)
}

