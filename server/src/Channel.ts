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
        tracks: {
            audio: MediaStreamTrack[],
            video:MediaStreamTrack[]
        }
    }|null = null
    receivers: {
        pcCnt: number,
        pc: RTCPeerConnection,
        locationId: string,
        mlines: {
            transceiver: RTCRtpTransceiver,
            kind: 'audio'|'video'
        }[]
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
            tracks: {audio: [], video: []},
        }
        pc.getReceivers().forEach((receiver)=>{
            this.sender.tracks[receiver.track.kind].push(receiver.track)
        })
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
        console.log(`pc.localDescription`, pc.localDescription)
        const matches = pc.localDescription.sdp.match(/\r\nm=(audio|video) /g)
        const transceivers = pc.getTransceivers()
        const mLines = []
        if (matches && matches.length === transceivers.length){
            for (let i = 0; i < transceivers.length; i++) {
                const kind = matches[i].substring(4, 9)
                console.log(`kind ${i} ${kind}`)
                mLines.push({
                    transceiver: transceivers[i],
                    kind,
                })
            }
        } else{
            console.error(`mLine mismatch`, matches, transceivers)
        }
        const receiver = {
            pcCnt: pcCnt++,
            pc,
            locationId,
            mlines: mLines,
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
        let tracks = {
            audio: [],
            video: []
        };
        if (this.sender){
            console.log(`this.sender.pc ${this.sender.pc.connectionState} receivers ${this.receivers.length}`)
            tracks = this.sender.tracks
        }
        this.receivers.forEach((receiver)=>{
            const tracksForPC = {
                audio: [...tracks.audio],
                video: [...tracks.video]
            }
            console.log(`sender num`, receiver.pc.getSenders().length)

            receiver.mlines.forEach((mLine, index)=>{
                console.log(`mLine ${index} ${mLine.kind}`)
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
                // console.log(`bindTrack recv #${receiver.pcCnt} ${sender.track.kind}`)
            })
        })
    }
}
