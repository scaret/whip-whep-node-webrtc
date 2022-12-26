import {v4} from "uuid";

let channelCnt = 0
let pcCnt = 0

export class Channel{
    id: string
    cnt: number = channelCnt++
    sender: {
        pcCnt: number,
        pc: RTCPeerConnection,
        locationId: string,
    }|null = null
    receivers: {
        pcCnt: number,
        pc: RTCPeerConnection,
        locationId: string,
    }[] = []
    constructor(channelId: string) {
        this.id = channelId
    }
    setSender(pc:RTCPeerConnection){
        const locationId = v4()
        const oldSender = this.sender
        this.sender = {
            pcCnt: pcCnt++,
            pc,
            locationId,
        }
        if (oldSender) {
            console.log(`Replace UP#${this.sender.pcCnt}\t${this.id}\tOLD:#${oldSender.pcCnt}`)
            oldSender.pc.close()
        } else {
            console.log(`NEW     UP#${this.sender.pcCnt}\t${this.id}`)
        }
        this.bindTracks()
        return locationId
    }
    setReceiver(pc:RTCPeerConnection){
        const locationId = v4()
        const sender = this.sender
        const receiver = {
            pcCnt: pcCnt++,
            pc,
            locationId,
        }
        this.receivers.push(receiver)
        if (sender) {
            console.log(`NEW DOWN#${receiver.pcCnt}\t${this.id}\tSENDER:#${sender.pcCnt}`)
            this.bindTracks()
        } else {
            console.log(`ALONE DOWN#${receiver.pcCnt}\t${this.id}`)
        }
        return locationId
    }
    bindTracks(){
        const tracks = {
            audio: [],
            video: []
        };
        if (this.sender){
            console.log(`this.sender.pc`, this.sender.pc.connectionState)
            this.sender.pc.getReceivers().forEach((receiver)=>{
                console.log(`bindTrack ${receiver.track.kind} ${receiver.track.id}`)
                tracks[receiver.track.kind].push(receiver.track)
            })
        }
        this.receivers.forEach((receiver)=>{
            const tracksForPC = {
                audio: [...tracks.audio],
                video: [...tracks.video]
            }
            console.log(`sender num`, receiver.pc.getSenders().length)
            receiver.pc.getSenders().forEach((sender, index)=>{
                console.log('sender', sender, receiver.pc.getTransceivers()[0])
                let track:MediaStreamTrack
                if (tracksForPC.audio.length){
                    track = tracksForPC.audio.shift()
                } else {
                    track = tracksForPC.video.shift()
                }
                if (!sender.track){
                    if (track){
                        console.log(`replaceTrack ${track.kind}`)
                        sender.replaceTrack(track)
                    } else {
                        console.log(`no track is OK ${index}`)
                    }
                } else {
                    if (track){
                        if (sender.track.id !== track.id){
                            console.log(`replaceTrack ${track.kind} ${sender.track.id} ${track.id}`)
                            sender.replaceTrack(track)
                        } else {
                            console.log(`same track ${track.kind}`)
                        }
                    } else {
                        console.log(`no track for ${sender.track.kind}`)
                    }
                }
                // console.log(`bindTrack recv #${receiver.pcCnt} ${sender.track.kind}`)
            })
        })
    }
}
