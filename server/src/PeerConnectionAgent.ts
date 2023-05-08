import sdpTransform from 'sdp-transform'
import {v4} from "uuid";
import {DataMlineInfo, RTPMLineInfo} from "./types";

let cnt = 0
export class PeerConnectionAgent{
    public pcid = cnt++
    public locationId = v4()
    public pc: RTCPeerConnection
    public answer: {
        sessionDescription: RTCSessionDescriptionInit
        obj: any
    } | null = null
    public candidates: {} = {}
    candidateDoneRes: any[] = []

    public mLineInfos: (RTPMLineInfo|DataMlineInfo)[] = []
    public dataChannels: RTCDataChannel[] = []
    public tracks: {
        audio: MediaStreamTrack[],
        video: MediaStreamTrack[]
    } = {audio: [], video: []}

    public direction: 'UPSTREAM'|'DOWNSTREAM'
    constructor(direction: 'UPSTREAM'|'DOWNSTREAM', pc: RTCPeerConnection) {
        this.pc = pc
        this.direction = direction
        this.pc.onicecandidate = (evt)=>{
            // console.log('onicecandidate', evt.candidate)
            if (evt.candidate){
                if (!this.candidates[evt.candidate.sdpMid]){
                    this.candidates[evt.candidate.sdpMid] = []
                }
                this.candidates[evt.candidate.sdpMid].push(evt.candidate)
            } else {
                this.addCandidateToAnswer()
                this.candidateDoneRes.forEach((res)=>{
                    res()
                })
                this.candidateDoneRes = []
            }
        }
        this.pc.ondatachannel = (evt)=>{
            const channel = evt.channel
            console.log(`${this.direction}#${this.pcid} onDataChannel #${this.dataChannels.length} ${evt.channel.label}`)
            this.dataChannels.push(evt.channel)
            const mLineInfo:DataMlineInfo = this.mLineInfos.find((mLineInfo)=>{
                return mLineInfo.kind === 'datachannel' && !mLineInfo.dataChannel
            }) as DataMlineInfo
            if (!mLineInfo){
                console.error(`a datachannel without mline info`)
            } else {
                mLineInfo.dataChannel = channel
            }
            channel.onmessage = (evt)=>{
                console.log(`Received message`, evt.data)
                if (mLineInfo.kind === 'datachannel' && mLineInfo.dataChannel === channel){
                    console.log('Sending message to receiver num', mLineInfo.consumers.length)
                    mLineInfo.consumers.forEach((consumer)=>{
                        if (consumer.dataChannel.readyState === 'open'){
                            consumer.dataChannel.send(evt.data)
                        }
                    })
                }
            }


            evt.channel.onclose = ()=>{
                console.log(`DataChannel Closed ${evt.channel.label}`)
            }
        }
    }

    /**
     * 按照answer sdp所述，按m行顺序整理transceiver顺序
     */
    updateMLineInfos(){
        const matches = this.answer.sessionDescription.sdp.match(/\r\nm=(audio|video|application) /g)
        const transceivers = this.pc.getTransceivers()
        const dataChannels = [...this.dataChannels]

        this.tracks = {audio: [], video: []}
        for (let i in transceivers){
            if (this.direction === 'UPSTREAM'){
                const track = transceivers[i].receiver.track
                this.tracks[track.kind].push(track)
            } else {
                const track = transceivers[i].sender.track
                this.tracks[track.kind].push(track)
            }
        }

        this.mLineInfos = []
        if (matches && matches.length){
            for (let i = 0; i < matches.length; i++){
                if (matches[i] === '\r\nm=application '){
                    const mLineInfo:DataMlineInfo = {
                        kind: 'datachannel',
                        subscribedTo: null,
                        dataChannel: dataChannels.shift() || null,
                        consumers: []
                    }
                    this.mLineInfos.push(mLineInfo)
                }else{
                    const mLineInfo:RTPMLineInfo = {
                        kind: matches[i] === '\r\nm=audio ' ? 'audio' : 'video',
                        transceiver: transceivers.shift()
                    }
                    this.mLineInfos.push(mLineInfo)
                }
            }
        } else{
            console.error(`mLine mismatch`, matches, transceivers)
        }
    }
    async createAnswerObj(){
        const sessionDescription:RTCSessionDescriptionInit = await this.pc.createAnswer()
        const obj = sdpTransform.parse(sessionDescription.sdp)
        this.answer = {sessionDescription, obj}
        this.updateMLineInfos()
    }
    async addCandidateToAnswer(){
        if (!this.answer){
            return
        }
        this.answer.obj.media.forEach((media, index)=>{
            if (this.candidates[index]){
                media.candidates = this.candidates[index].map((candidate)=>{
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
        this.candidates = {}
    }
    waitForCandidateDone(){
        if (this.pc.iceGatheringState === 'complete'){
            return Promise.resolve()
        } else {
            return new Promise((res)=>{
                this.candidateDoneRes.push(res)
            })
        }
    }
    printInfo(prefix = ''){
        let info = `${prefix} pcid#${this.pcid} direction ${this.direction}`
        for (let i = 0; i < this.mLineInfos.length; i++){
            const mLine = this.mLineInfos[i]
            info += ` m${i} ${mLine.kind} ${mLine.kind === 'datachannel' ? mLine.dataChannel : mLine.transceiver}`
        }
        console.log(info)
    }
}
