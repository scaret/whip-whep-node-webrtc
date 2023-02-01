import {v4} from "uuid";
import {PeerConnectionAgent} from "./PeerConnectionAgent";
import {DataMlineInfo} from "./types";

let channelCnt = 0

export class Channel{
    id: string
    cnt: number = channelCnt++
    sender: PeerConnectionAgent|null = null
    receivers: PeerConnectionAgent[] = []
    constructor(channelId: string) {
        this.id = channelId
    }
    setSender(pcAgent:PeerConnectionAgent){
        const locationId = v4()
        const oldSender = this.sender

        this.sender = pcAgent

        if (oldSender) {
            console.log(`Replace UP#${this.sender.pcid}\t${this.id}\tOLD:#${oldSender.pcid}`)
            oldSender.pc.close()
        } else {
            console.log(`NEW     UP#${this.sender.pcid}\t${this.id}`)
        }
        this.bindTracks()
        return locationId
    }
    setReceiver(pcAgent:PeerConnectionAgent){
        this.receivers.push(pcAgent)
        if (this.sender) {
            console.log(`NEW DOWN#${pcAgent.pcid}\t${this.id}\tSENDER:#${this.sender.pcid}`)
            this.bindTracks()
        } else {
            console.log(`ALONE DOWN#${pcAgent.pcid}\t${this.id}`)
        }
        return pcAgent.locationId
    }
    bindTracks(){
        if (this.sender){
            console.log(`this.sender.pc ${this.sender.pc.connectionState} receivers ${this.receivers.length}`)
        }
        const senderDataChannels = [...this.sender.dataChannels]
        const senderDataMLineInfos:DataMlineInfo[] = []
        for (let i in this.sender.mLineInfos){
            const mLineInfo = this.sender.mLineInfos[i]
            if (mLineInfo.kind === 'datachannel'){
                // 每次bindTracks时，先把原先的Receivers清空
                mLineInfo.dataChannel = senderDataChannels.shift()||null
                mLineInfo.consumers = []
                senderDataMLineInfos.push(mLineInfo)
            }
        }
        this.receivers.forEach((receiver)=>{
            const tracksForPC = {
                audio: this.sender ? [...this.sender.tracks.audio] : [],
                video: this.sender ? [...this.sender.tracks.video] : [],
            }

            const senderDataMLineInfosPerReceiver = [...senderDataMLineInfos]

            console.log(`bindTracks sender audio ${tracksForPC.audio.length} video ${tracksForPC.video.length} datachannel ${senderDataChannels.length}`)

            receiver.mLineInfos.forEach((mLine, index)=>{
                receiver.printInfo('receiver')
                if (mLine.kind === 'datachannel'){
                    // 无论下行当前的dataChannel到没到，都会被分配上行的dataChannel
                    const senderDataChannel = senderDataMLineInfosPerReceiver.shift()
                    if (senderDataChannel){
                        senderDataChannel.consumers.push(mLine)
                        mLine.subscribedTo = senderDataChannel
                    } else {
                        mLine.subscribedTo = null
                    }
                } else{
                    let track:MediaStreamTrack = null
                    if (tracksForPC[mLine.kind].length){
                        track = tracksForPC[mLine.kind].shift()
                    }
                    const sender = mLine.transceiver.sender
                    if (!sender){
                        console.error(`downstream #${index} has no sender`)
                    } else if (!sender.track){
                        if (track){
                            console.log(`m${index} ${mLine.kind} replaceTrack ${track.kind}`)
                            sender.replaceTrack(track)
                        } else {
                            console.log(`m${index} ${mLine.kind} no track is OK ${index}`)
                        }
                    } else {
                        if (track){
                            if (sender.track.id !== track.id){
                                console.log(`m${index} ${mLine.kind} replaceTrack ${track.kind} ${sender.track.id} ${track.id}`)
                                sender.replaceTrack(track)
                            } else {
                                console.log(`m${index} ${mLine.kind} same track ${track.kind}`)
                            }
                        } else {
                            console.log(`m${index} ${mLine.kind} no track for ${sender.track.kind}`)
                        }
                    }
                }
                // console.log(`bindTrack recv #${receiver.pcCnt} ${sender.track.kind}`)
            })
        })
    }
}
